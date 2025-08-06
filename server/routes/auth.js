const express = require('express');
const { supabase } = require('../config/supabase'); // Only import supabase
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Debugging information
console.log('=== Auth Route Debug ===');
console.log('Supabase imported:', !!supabase);
console.log('Supabase auth:', !!supabase?.auth);
console.log('========================');

// Register new user
router.post('/register', async (req, res) => {
  try {
    console.log('About to call supabase.auth, supabase is:', supabase);
    
    if (!supabase || !supabase.auth) {
      return res.status(500).json({ error: 'Supabase client not initialized' });
    }
    
    const { email, password, role, name, company_name } = req.body;

    // Validate required fields
    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate role
    const validRoles = ['client', 'manager', 'editor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Create user in Supabase Auth - USE SINGLE CLIENT
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    let client_id = null;

    // If user is a client, create a client record
    if (role === 'client') {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          name,
          email,
          company_name: name // You can add a company_name field to the form later
        })
        .select()
        .single();

      if (clientError) {
        // Clean up auth user if client creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return res.status(400).json({ error: clientError.message });
      }

      client_id = clientData.id;
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        client_id: client_id
      });

    if (profileError) {
      // Clean up auth user and client if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      if (role === 'client' && client_id) {
        await supabase.from('clients').delete().eq('id', client_id);
      }
      return res.status(400).json({ error: profileError.message });
    }

    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email,
        name,
        role,
        clientId: client_id
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
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
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Profile not found' });
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        role: profile.role,
        clientId: profile.client_id
      },
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: profile.name,
        role: profile.role,
        clientId: profile.client_id
      }
    });
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