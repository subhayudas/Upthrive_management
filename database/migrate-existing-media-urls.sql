-- Migration to populate media_urls for existing CC list items
-- This ensures backward compatibility and fixes display issues

-- First, ensure the column exists
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS media_urls JSONB;

-- Update existing records that have image_url or file_url but no media_urls
UPDATE cc_list 
SET media_urls = CASE 
    WHEN image_url IS NOT NULL AND image_url != '' THEN 
        jsonb_build_array(image_url)
    WHEN file_url IS NOT NULL AND file_url != '' THEN 
        jsonb_build_array(file_url)
    ELSE NULL
END
WHERE media_urls IS NULL 
AND (image_url IS NOT NULL OR file_url IS NOT NULL);

-- Verify the update
SELECT id, title, image_url, file_url, media_urls 
FROM cc_list 
WHERE image_url IS NOT NULL OR file_url IS NOT NULL OR media_urls IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
