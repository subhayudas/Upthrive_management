-- Fix CC List RLS policies to allow clients to create items for themselves

-- Drop existing CC list policies
DROP POLICY IF EXISTS "Only managers can create CC list items" ON cc_list;
DROP POLICY IF EXISTS "Only managers can update CC list items" ON cc_list;
DROP POLICY IF EXISTS "Only managers can delete CC list items" ON cc_list;

-- Create new policies that allow clients to create/update/delete their own CC items
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

-- Also fix requests policies to allow clients to create requests
DROP POLICY IF EXISTS "Clients can create requests" ON requests;

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
