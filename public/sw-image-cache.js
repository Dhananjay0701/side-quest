/**
 * Service Worker image cache — LRU via IndexedDB metadata + Cache Storage.
 * Keep limits in sync with src/lib/images/cache/constants.ts
 */
(function () {
  const IMAGE_CACHE_VERSION = 1;
  const IMAGE_CACHE_NAME = "rsq-images-v" + IMAGE_CACHE_VERSION;
  const MAX_CACHE_BYTES = 20 * 1024 * 1024;
  const MAX_CACHE_COUNT = 40;
  const META_DB_NAME = "rsq-image-cache-meta";
  const META_STORE = "entries";
  const STATIC_PREFIXES = ["/icons/", "/splash/"];

  let swHits = 0;
  let networkHits = 0;

  function isImageRequest(request) {
    if (request.destination === "image") return true;
    var url = new URL(request.url);
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) return true;
    if (url.pathname.indexOf("/cdn/") === 0) return true;
    if (url.pathname.indexOf("/images_to_use/") === 0) return true;
    return false;
  }

  function isStaticAsset(url) {
    var path = new URL(url).pathname;
    for (var i = 0; i < STATIC_PREFIXES.length; i++) {
      if (path.indexOf(STATIC_PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function openMetaDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(META_DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "url" });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function idbGetAll() {
    return openMetaDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(META_STORE, "readonly");
        var store = tx.objectStore(META_STORE);
        var req = store.getAll();
        req.onsuccess = function () {
          resolve(req.result || []);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function idbGet(url) {
    return openMetaDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(META_STORE, "readonly");
        var req = tx.objectStore(META_STORE).get(url);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function idbPut(entry) {
    return openMetaDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(META_STORE, "readwrite");
        tx.objectStore(META_STORE).put(entry);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function idbDelete(url) {
    return openMetaDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(META_STORE, "readwrite");
        tx.objectStore(META_STORE).delete(url);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function idbClear() {
    return openMetaDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(META_STORE, "readwrite");
        tx.objectStore(META_STORE).clear();
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function touchEntry(url) {
    return idbGet(url).then(function (entry) {
      if (!entry) return;
      entry.lastAccess = Date.now();
      return idbPut(entry);
    });
  }

  function evictIfNeeded(newSize) {
    return idbGetAll().then(function (entries) {
      var totalBytes = 0;
      for (var i = 0; i < entries.length; i++) {
        totalBytes += entries[i].size || 0;
      }
      var count = entries.length;

      entries.sort(function (a, b) {
        return (a.lastAccess || 0) - (b.lastAccess || 0);
      });

      var chain = Promise.resolve();
      var idx = 0;

      while (
        (totalBytes + newSize > MAX_CACHE_BYTES || count >= MAX_CACHE_COUNT) &&
        idx < entries.length
      ) {
        (function (victim) {
          chain = chain.then(function () {
            return caches.open(IMAGE_CACHE_NAME).then(function (cache) {
              return cache.delete(victim.url);
            });
          }).then(function () {
            return idbDelete(victim.url);
          });
          totalBytes -= victim.size || 0;
          count -= 1;
        })(entries[idx]);
        idx += 1;
      }

      return chain;
    });
  }

  function storeInCache(request, response) {
    var url = request.url;
    return response.clone().blob().then(function (blob) {
      var size = blob.size;
      return evictIfNeeded(size).then(function () {
        return caches.open(IMAGE_CACHE_NAME).then(function (cache) {
          return cache.put(request, response).then(function () {
            return idbGet(url).then(function (existing) {
              return idbPut({
                url: url,
                size: size,
                tier: existing ? existing.tier : "registered",
                lastAccess: Date.now(),
                cachedAt: Date.now(),
                registered: true,
              });
            });
          });
        });
      });
    });
  }

  function registerUrls(urls, tier) {
    var chain = Promise.resolve();
    for (var i = 0; i < urls.length; i++) {
      (function (url) {
        chain = chain.then(function () {
          return idbGet(url).then(function (existing) {
            return idbPut({
              url: url,
              size: existing ? existing.size : 0,
              tier: tier,
              lastAccess: Date.now(),
              cachedAt: existing ? existing.cachedAt : 0,
              registered: true,
            });
          });
        }).then(function () {
          return caches.open(IMAGE_CACHE_NAME).then(function (cache) {
            return cache.match(url).then(function (hit) {
              if (hit) return hit;
              return fetch(url, { mode: "cors", credentials: "omit" }).then(function (res) {
                if (!res.ok) return res;
                networkHits += 1;
                return storeInCache(new Request(url), res).then(function () {
                  return res;
                });
              });
            });
          });
        });
      })(urls[i]);
    }
    return chain;
  }

  function refreshUrls(urls, tier) {
    var chain = Promise.resolve();
    for (var i = 0; i < urls.length; i++) {
      (function (url) {
        chain = chain.then(function () {
          return caches.open(IMAGE_CACHE_NAME).then(function (cache) {
            return cache.delete(url);
          });
        }).then(function () {
          return idbDelete(url);
        });
      })(urls[i]);
    }
    return chain.then(function () {
      return registerUrls(urls, tier);
    });
  }

  function handleImageFetch(event) {
    var request = event.request;
    var url = request.url;

    event.respondWith(
      Promise.all([idbGet(url), caches.open(IMAGE_CACHE_NAME)]).then(function (result) {
        var entry = result[0];
        var cache = result[1];
        var isStatic = isStaticAsset(url);

        if (!entry && !isStatic) {
          networkHits += 1;
          return fetch(request);
        }

        return cache.match(request).then(function (cached) {
          if (cached) {
            swHits += 1;
            if (entry) touchEntry(url);
            return cached;
          }

          return fetch(request).then(function (response) {
            if (!response.ok) return response;
            networkHits += 1;
            return storeInCache(request, response.clone()).then(function () {
              return response;
            });
          });
        });
      })
    );
  }

  function buildStats() {
    return idbGetAll().then(function (entries) {
      var totalBytes = 0;
      var oldest = null;
      var newest = null;
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        totalBytes += e.size || 0;
        if (e.cachedAt) {
          if (oldest === null || e.cachedAt < oldest) oldest = e.cachedAt;
          if (newest === null || e.cachedAt > newest) newest = e.cachedAt;
        }
      }

      return {
        version: IMAGE_CACHE_VERSION,
        cacheName: IMAGE_CACHE_NAME,
        imageCount: entries.filter(function (e) {
          return (e.size || 0) > 0;
        }).length,
        totalBytes: totalBytes,
        oldestCachedAt: oldest,
        newestCachedAt: newest,
        serviceWorkerHits: swHits,
        networkHits: networkHits,
        entries: entries
          .slice()
          .sort(function (a, b) {
            return (b.size || 0) - (a.size || 0);
          })
          .slice(0, 20),
      };
    });
  }

  self.addEventListener("message", function (event) {
    var data = event.data || {};
    var port = event.ports && event.ports[0];

    if (data.type === "REGISTER_URLS" && Array.isArray(data.urls)) {
      registerUrls(data.urls, data.tier || "homepage");
      return;
    }

    if (data.type === "REFRESH_URLS" && Array.isArray(data.urls)) {
      refreshUrls(data.urls, data.tier || "homepage");
      return;
    }

    if (data.type === "CLEAR_CACHE") {
      caches.delete(IMAGE_CACHE_NAME);
      idbClear();
      swHits = 0;
      networkHits = 0;
      return;
    }

    if (data.type === "RECORD_SW_HIT") {
      swHits += 1;
      return;
    }

    if (data.type === "RECORD_NETWORK_HIT") {
      networkHits += 1;
      return;
    }

    if (data.type === "GET_STATS" && port) {
      buildStats().then(function (stats) {
        port.postMessage(stats);
      });
    }
  });

  self.handleImageFetch = handleImageFetch;
  self.isImageRequest = isImageRequest;
})();
