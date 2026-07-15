/*
  Expand site-assets bucket for logo, favicon, hero and banner uploads.
  Run in Supabase Dashboard → SQL Editor, or via: npm run setup:db
*/

UPDATE storage.buckets
SET
  file_size_limit = NULL,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/heic',
    'image/heif',
    'image/avif',
    'image/tiff',
    'application/octet-stream'
  ]
WHERE id = 'site-assets';

UPDATE storage.buckets
SET
  file_size_limit = NULL,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/avif'
  ]
WHERE id = 'avatars';
