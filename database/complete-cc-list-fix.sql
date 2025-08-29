-- Complete fix for CC List multiple file upload issue
-- This script adds missing columns and fixes RLS policies

-- Step 1: Add missing media columns to cc_list table
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS google_drive_link TEXT;
ALTER TABLE cc_list ADD COLUMN IF NOT EXISTS media_urls JSONB;

-- Step 2: Add missing media columns to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS media_urls JSONB;

-- Step 3: Drop ALL existing CC list policies
DROP POLICY IF EXISTS "Only managers can create CC list items" ON cc_list;
DROP POLICY IF EXISTS "Only managers can update CC list items" ON cc_list;
DROP POLICY IF EXISTS "Only managers can delete CC list items" ON cc_list;
DROP POLICY IF EXISTS "Managers can create any CC list items" ON cc_list;
DROP POLICY IF EXISTS "Clients can create CC list items for themselves" ON cc_list;
DROP POLICY IF EXISTS "Managers can update any CC list items" ON cc_list;
DROP POLICY IF EXISTS "Clients can update their own CC list items" ON cc_list;
DROP POLICY IF EXISTS "Managers can delete any CC list items" ON cc_list;
DROP POLICY IF EXISTS "Clients can delete their own CC list items" ON cc_list;

-- Step 4: Create new policies that allow clients to manage their own CC items
CREATE POLICY "Managers can create any CC list items" ON cc_list
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Clients can create CC list items for themselves" ON cc_list
    FOR INSERT WITH CHECK (
        client_id = (
            SELECT client_id FROM profiles 
            WHERE id = auth.uid() AND role = 'client'
        )
    );

CREATE POLICY "Managers can update any CC list items" ON cc_list
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Clients can update their own CC list items" ON cc_list
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'client' 
            AND client_id = cc_list.client_id
        )
    );

CREATE POLICY "Managers can delete any CC list items" ON cc_list
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Clients can delete their own CC list items" ON cc_list
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'client' 
            AND client_id = cc_list.client_id
        )
    );

-- Step 5: Fix requests policies to allow clients to create requests
DROP POLICY IF EXISTS "Clients can create requests" ON requests;
DROP POLICY IF EXISTS "Clients can create requests for themselves" ON requests;
DROP POLICY IF EXISTS "Managers can create any requests" ON requests;

CREATE POLICY "Clients can create requests for themselves" ON requests
    FOR INSERT WITH CHECK (
        client_id = (
            SELECT client_id FROM profiles 
            WHERE id = auth.uid() AND role = 'client'
        )
    );

CREATE POLICY "Managers can create any requests" ON requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );
