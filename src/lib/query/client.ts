import { QueryClient } from "@tanstack/react-query";
import {
  QUERY_GC_TIME_MS,
  QUERY_RETRY_COUNT,
  QUERY_STALE_TIME_MS,
} from "@/lib/query/constants";
import { attachQueryCacheObserver } from "@/lib/query/observability";

/**
 * Factory for QueryClient instances.
 * Browser uses a singleton; server renders always get a fresh client.
 * Structured for future @tanstack/query-persist-client hydration.
 */
export function makeQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        retry: QUERY_RETRY_COUNT,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: "always",
      },
    },
  });

  attachQueryCacheObserver(() => client.getQueryCache());
  return client;
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

/** For future IndexedDB persistence — replace singleton with persisted client. */
export function getBrowserQueryClient(): QueryClient {
  return getQueryClient();
}
