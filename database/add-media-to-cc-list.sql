-- Add media fields to cc_list table to match requests table
-- This ensures CC items can handle images, videos, and Google Drive links

-- Add image_url field for storing media files
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add file_url field for storing uploaded files
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add google_drive_link field for optional Google Drive links
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS google_drive_link TEXT;

-- Add media_urls JSONB array to store multiple media URLs
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS media_urls JSONB;

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN cc_list.image_url IS 'URL to uploaded image or video file stored in Supabase storage';
COMMENT ON COLUMN cc_list.file_url IS 'URL to uploaded file stored in Supabase storage';
COMMENT ON COLUMN cc_list.google_drive_link IS 'Optional Google Drive link for additional resources';
COMMENT ON COLUMN cc_list.media_urls IS 'Array of URLs for multiple uploaded media files';

-- Ensure requests table also supports multiple media
ALTER TABLE requests ADD COLUMN IF NOT EXISTS media_urls JSONB;
COMMENT ON COLUMN requests.media_urls IS 'Array of URLs for multiple uploaded media files';
