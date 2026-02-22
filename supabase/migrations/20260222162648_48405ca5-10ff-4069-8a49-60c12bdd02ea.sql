UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg','image/jpg','image/png','image/webp',
    'video/mp4','video/webm','video/quicktime'
  ]
WHERE id = 'field-images';