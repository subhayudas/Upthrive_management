-- Add scheduled_date field to cc_list table for calendar functionality
-- This allows CC list items to have scheduled publication dates

-- Add scheduled_date field for storing when content should be published
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE;

-- Add comment to document the purpose of this field
COMMENT ON COLUMN cc_list.scheduled_date IS 'Scheduled publication date for the content item';

-- Create index for better performance when querying by scheduled date
CREATE INDEX IF NOT EXISTS idx_cc_list_scheduled_date ON cc_list(scheduled_date);

-- Update existing CC list items to have a default scheduled date (created_at + 7 days)
UPDATE cc_list 
SET scheduled_date = created_at + INTERVAL '7 days'
WHERE scheduled_date IS NULL;
