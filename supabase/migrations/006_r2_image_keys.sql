-- Rewrite legacy local image paths to R2 storage keys
-- Run once after uploading images to random-sidequest-assets bucket

UPDATE collections
SET cover_image_url = 'collections/' || regexp_replace(cover_image_url, '^/images_to_use/', '')
WHERE cover_image_url LIKE '/images_to_use/%'
  AND cover_image_url NOT LIKE '/images_to_use/place-%';

UPDATE places
SET cover_image_url = 'places/' || regexp_replace(cover_image_url, '^/images_to_use/', '')
WHERE cover_image_url LIKE '/images_to_use/place-%';

-- Bare filenames (no prefix) on collections
UPDATE collections
SET cover_image_url = 'collections/' || cover_image_url
WHERE cover_image_url IS NOT NULL
  AND cover_image_url NOT LIKE '/%'
  AND cover_image_url NOT LIKE 'http%'
  AND cover_image_url NOT LIKE 'collections/%'
  AND cover_image_url NOT LIKE 'places/%';

-- Bare place filenames
UPDATE places
SET cover_image_url = 'places/' || cover_image_url
WHERE cover_image_url IS NOT NULL
  AND cover_image_url NOT LIKE '/%'
  AND cover_image_url NOT LIKE 'http%'
  AND cover_image_url NOT LIKE 'collections/%'
  AND cover_image_url NOT LIKE 'places/%'
  AND cover_image_url LIKE 'place-%';
