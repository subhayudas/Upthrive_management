const express = require('express');
const router = express.Router();

// Import Supabase clients with error handling
let supabase, supabaseAdmin;

try {
  const supabaseConfig = require('../config/supabase');
  supabase = supabaseConfig.supabase;
  supabaseAdmin = supabaseConfig.supabaseAdmin;
  
  if (!supabase || !supabaseAdmin) {
    throw new Error('Supabase clients not properly initialized');
  }
  
  console.log('✅ Supabase clients loaded successfully in auth.js');
} catch (error) {
  console.error('❌ Failed to load Supabase clients:', error.message);
  throw error;
}

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get the user's profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    // Set the auth context for Supabase RLS
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '', // You might need to handle refresh tokens
      user: user
    });

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      name: profile.name,
      client_id: profile.client_id
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    console.log('=== REGISTRATION DEBUG ===');
    console.log('supabaseAdmin:', typeof supabaseAdmin);
    console.log('supabaseAdmin.auth:', typeof supabaseAdmin?.auth);
    console.log('Request body:', req.body);
    
    const { email, password, role, name, clientId, phone } = req.body; // ✅ Add phone here

    // Validate required fields
    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate phone number if provided
    if (phone) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone)) {
        console.log('❌ Invalid phone number format:', phone);
        return res.status(400).json({ 
          error: 'Please enter a valid phone number with country code (e.g., +1234567890)' 
        });
      }
    }

    // Validate role
    const validRoles = ['client', 'manager', 'editor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Debug: Check supabaseAdmin before using it
    if (!supabaseAdmin || !supabaseAdmin.auth) {
      console.error('❌ supabaseAdmin or supabaseAdmin.auth is undefined');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('✅ Creating user with supabaseAdmin...');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    console.log('✅ User created successfully:', authData.user.id);

    let client_id = clientId;

    // If user is a client, create a client record
    if (role === 'client') {
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({
          name,
          email,
          company_name: name
        })
        .select()
        .single();

      if (clientError) {
        console.error('❌ Client creation error:', clientError);
        // Clean up auth user if client creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(400).json({ error: clientError.message });
      }

      client_id = clientData.id;
    }

    // Create profile WITH phone number
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        phone_number: phone || null, // ✅ Add phone_number here
        client_id: client_id
      });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      // Clean up auth user and client if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      if (role === 'client' && client_id) {
        await supabaseAdmin.from('clients').delete().eq('id', client_id);
      }
      return res.status(400).json({ error: profileError.message });
    }

    console.log('✅ Registration completed successfully');

    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email,
        name,
        role,
        phone_number: phone || null, // ✅ Include phone in response
        clientId: client_id
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userData = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      phone_number: profile.phone_number, // ✅ Add phone_number here
      client_id: profile.client_id,
      created_at: profile.created_at
    };

    res.json({
      user: userData,
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user's profile with client_id
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const userData = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      phone_number: profile.phone_number, // ✅ Add phone_number here
      client_id: profile.client_id,
      created_at: profile.created_at
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;