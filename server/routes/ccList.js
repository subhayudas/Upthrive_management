const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser, requireRole, requireClientAccess } = require('../middleware/auth');
const router = express.Router();

// Get CC list for a specific client
router.get('/:clientId', authenticateUser, async (req, res) => {
  try {
    const { clientId } = req.params;

    // For client users, verify they're accessing their own CC list
    if (req.user.role === 'client') {
      // Get the user's client_id from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', req.user.id)
        .single();

      if (profileError || !profile?.client_id) {
        return res.status(403).json({ error: 'Client profile not found' });
      }

      // Verify they're trying to access their own client's CC list
      if (profile.client_id !== clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Use admin client to bypass RLS for client's own data
      const { data, error } = await supabase
        .from('cc_list')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('CC List fetch error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ ccList: data || [] });
    }

    // For managers/editors, use regular access with RLS
    const { data, error } = await supabase
      .from('cc_list')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('CC List fetch error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ccList: data || [] });
  } catch (error) {
    console.error('Get CC list error:', error);
    res.status(500).json({ error: 'Failed to get CC list' });
  }
});

// Create new CC list item (managers only) - FIXED
router.post('/:clientId', authenticateUser, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { title, description, content_type, requirements, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // For clients, verify they're creating items for their own client_id
    if (req.user.role === 'client') {
      // Get the user's client_id from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', req.user.id)
        .single();

      if (profileError || !profile?.client_id) {
        return res.status(403).json({ error: 'Client profile not found' });
      }

      // Verify they're creating items for their own client
      if (profile.client_id !== clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'manager') {
      // Managers can create for any client
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('cc_list')
      .insert({
        client_id: clientId,
        title,
        description,
        content_type: content_type || 'post',
        requirements: requirements || '',
        priority: priority || 'medium',
        status: 'active',
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('CC Item create error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ ccItem: data });
  } catch (error) {
    console.error('Create CC item error:', error);
    res.status(500).json({ error: 'Failed to create CC item' });
  }
});

// Update CC list item (managers only)
router.put('/:clientId/:itemId', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    const { title, description, content_type, requirements, priority, status } = req.body;

    const { data, error } = await supabase
      .from('cc_list')
      .update({
        title,
        description,
        content_type,
        requirements,
        priority,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'CC item not found' });
    }

    res.json({ ccItem: data });
  } catch (error) {
    console.error('Update CC item error:', error);
    res.status(500).json({ error: 'Failed to update CC item' });
  }
});

// Delete CC list item (managers only)
router.delete('/:clientId/:itemId', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { clientId, itemId } = req.params;

    const { error } = await supabase
      .from('cc_list')
      .delete()
      .eq('id', itemId)
      .eq('client_id', clientId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'CC item deleted successfully' });
  } catch (error) {
    console.error('Delete CC item error:', error);
    res.status(500).json({ error: 'Failed to delete CC item' });
  }
});

// Get all CC lists (managers and editors only)
router.get('/', authenticateUser, requireRole(['manager', 'editor']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cc_list')
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ ccLists: data });
  } catch (error) {
    console.error('Get all CC lists error:', error);
    res.status(500).json({ error: 'Failed to get CC lists' });
  }
});

// Bulk upload CC list (managers only)
router.post('/:clientId/bulk', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const ccItems = items.map(item => ({
      client_id: clientId,
      title: item.title,
      description: item.description,
      content_type: item.content_type || 'post',
      requirements: item.requirements || '',
      priority: item.priority || 'medium',
      status: 'active', // ✅ Changed from default to 'active'
      created_by: req.user.id
    }));

    const { data, error } = await supabase
      .from('cc_list')
      .insert(ccItems)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ ccItems: data });
  } catch (error) {
    console.error('Bulk upload CC list error:', error);
    res.status(500).json({ error: 'Failed to upload CC list' });
  }
});

// In your login route, make sure you're returning the correct client data
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ... your existing auth logic ...

    // Get user profile with client information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }



    // For client users, ensure client_id is set properly
    if (profile.role === 'client' && !profile.client_id) {
      console.error('Client user missing client_id in profile:', profile);
      // You might need to fix this in your database
    }

    res.json({
      user: userData,
      session: session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

module.exports = router;