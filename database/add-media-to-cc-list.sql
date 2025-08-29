-- Add media fields to cc_list table to match requests table
-- This ensures CC items can handle images, videos, and Google Drive links

-- Add image_url field for storing media files
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add file_url field for storing uploaded files
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add google_drive_link field for optional Google Drive links
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS google_drive_link TEXT;

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN cc_list.image_url IS 'URL to uploaded image or video file stored in Supabase storage';
COMMENT ON COLUMN cc_list.file_url IS 'URL to uploaded file stored in Supabase storage';
COMMENT ON COLUMN cc_list.google_drive_link IS 'Optional Google Drive link for additional resources';
