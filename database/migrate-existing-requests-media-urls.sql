-- Migration to populate media_urls for existing requests
-- This ensures backward compatibility and fixes display issues

-- First, ensure the column exists
ALTER TABLE requests ADD COLUMN IF NOT EXISTS media_urls JSONB;

-- Update existing records that have image_url but no media_urls
UPDATE requests 
SET media_urls = CASE 
    WHEN image_url IS NOT NULL AND image_url != '' THEN 
        jsonb_build_array(image_url)
    ELSE NULL
END
WHERE media_urls IS NULL 
AND image_url IS NOT NULL;

-- Verify the update
SELECT id, message, image_url, media_urls 
FROM requests 
WHERE image_url IS NOT NULL OR media_urls IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
