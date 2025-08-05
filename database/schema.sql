-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client', 'manager', 'editor')),
    client_id UUID, -- For clients, this is their own ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table (for client-specific data)
CREATE TABLE clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    company_name TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CC list table
CREATE TABLE cc_list (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content_type TEXT DEFAULT 'post' CHECK (content_type IN ('post', 'reel', 'story', 'carousel')),
    requirements TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create requests table
CREATE TABLE requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id),
    to_user_id UUID REFERENCES profiles(id),
    assigned_editor_id UUID REFERENCES profiles(id),
    message TEXT NOT NULL,
    content_type TEXT DEFAULT 'post' CHECK (content_type IN ('post', 'reel', 'story', 'carousel')),
    requirements TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'pending_manager_review' CHECK (status IN (
        'pending_manager_review',
        'assigned_to_editor',
        'in_progress',
        'submitted_for_review',
        'manager_approved',
        'manager_rejected',
        'client_approved',
        'client_rejected',
        'completed'
    )),
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    editor_id UUID NOT NULL REFERENCES profiles(id),
    manager_id UUID NOT NULL REFERENCES profiles(id),
    instructions TEXT,
    status TEXT DEFAULT 'assigned' CHECK (status IN (
        'assigned',
        'in_progress',
        'submitted_for_review',
        'manager_approved',
        'manager_rejected',
        'client_approved',
        'client_rejected',
        'completed'
    )),
    submitted_message TEXT,
    submitted_image_url TEXT,
    changes_made TEXT,
    manager_feedback TEXT,
    client_feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    client_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_reviews table for tracking client approvals
CREATE TABLE client_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending_client_review' CHECK (status IN (
        'pending_client_review',
        'client_approved',
        'client_rejected'
    )),
    feedback TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_client_id ON profiles(client_id);
CREATE INDEX idx_cc_list_client_id ON cc_list(client_id);
CREATE INDEX idx_requests_client_id ON requests(client_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_assigned_editor_id ON requests(assigned_editor_id);
CREATE INDEX idx_tasks_editor_id ON tasks(editor_id);
CREATE INDEX idx_tasks_manager_id ON tasks(manager_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_request_id ON tasks(request_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cc_list_updated_at BEFORE UPDATE ON cc_list
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Managers can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Clients policies
CREATE POLICY "Managers and editors can view all clients" ON clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('manager', 'editor')
        )
    );

CREATE POLICY "Clients can view their own client record" ON clients
    FOR SELECT USING (
        id = (
            SELECT client_id FROM profiles 
            WHERE id = auth.uid() AND role = 'client'
        )
    );

-- CC List policies
CREATE POLICY "Managers and editors can view all CC lists" ON cc_list
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('manager', 'editor')
        )
    );

CREATE POLICY "Clients can view their own CC list" ON cc_list
    FOR SELECT USING (
        client_id = (
            SELECT client_id FROM profiles 
            WHERE id = auth.uid() AND role = 'client'
        )
    );

CREATE POLICY "Only managers can create CC list items" ON cc_list
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Only managers can update CC list items" ON cc_list
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Only managers can delete CC list items" ON cc_list
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Requests policies
CREATE POLICY "Users can view requests they're involved with" ON requests
    FOR SELECT USING (
        from_user_id = auth.uid() OR
        assigned_editor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        ) OR
        client_id = (
            SELECT client_id FROM profiles 
            WHERE id = auth.uid() AND role = 'client'
        )
    );

CREATE POLICY "Clients can create requests" ON requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'client'
        )
    );

CREATE POLICY "Managers can update requests" ON requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Tasks policies
CREATE POLICY "Users can view tasks they're involved with" ON tasks
    FOR SELECT USING (
        editor_id = auth.uid() OR
        manager_id = auth.uid() OR
        request_id IN (
            SELECT id FROM requests 
            WHERE client_id = (
                SELECT client_id FROM profiles 
                WHERE id = auth.uid() AND role = 'client'
            )
        )
    );

CREATE POLICY "Managers can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Editors can update their own tasks" ON tasks
    FOR UPDATE USING (editor_id = auth.uid());

CREATE POLICY "Managers can update all tasks" ON tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Client reviews policies
CREATE POLICY "Users can view client reviews they're involved with" ON client_reviews
    FOR SELECT USING (
        client_id = (
            SELECT client_id FROM profiles 
            WHERE id = auth.uid() AND role = 'client'
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('manager', 'editor')
        )
    );

CREATE POLICY "Clients can update their own reviews" ON client_reviews
    FOR UPDATE USING (
        client_id = (
            SELECT client_id FROM profiles 
            WHERE id = auth.uid() AND role = 'client'
        )
    );

-- Insert sample data for testing
INSERT INTO clients (id, name, email, company_name) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'John Doe', 'john@example.com', 'Tech Startup Inc'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Jane Smith', 'jane@example.com', 'Marketing Agency LLC');

-- Insert sample CC list items
INSERT INTO cc_list (client_id, title, description, content_type, requirements, priority) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Product Launch Post', 'Create engaging content for our new product launch', 'post', 'Include product images and call-to-action', 'high'),
    ('550e8400-e29b-41d4-a716-446655440001', 'Behind the Scenes Reel', 'Show the team working on the product', 'reel', 'Keep it under 30 seconds', 'medium'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Client Testimonial', 'Share positive feedback from our clients', 'post', 'Include client photo and quote', 'high'); 