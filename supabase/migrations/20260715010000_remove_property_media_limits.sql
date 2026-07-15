/*
  Remove artificial file size limits on property media buckets.
  Expands allowed MIME types for high-resolution photos and 4K videos.
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
    'image/heic',
    'image/heif',
    'image/avif',
    'image/tiff'
  ]
WHERE id = 'property-images';

UPDATE storage.buckets
SET
  file_size_limit = NULL,
  allowed_mime_types = ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-m4v',
    'video/x-matroska',
    'video/ogg',
    'application/octet-stream'
  ]
WHERE id = 'property-videos';
