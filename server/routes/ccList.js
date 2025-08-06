const express = require('express');;
const { supabase } = require('../config/supabase');
const { authenticateUser, requireRole, requireClientAccess } = require('../middleware/auth');
const router = express.Router();

// Get CC list for a specific client
router.get('/:clientId', authenticateUser, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { user } = req;

    // ADD MORE DEBUG LOGS
    console.log('=== CC List GET Debug ===');
    console.log('Requested clientId:', clientId);
    console.log('User object:', user);
    console.log('User role:', user?.role);
    console.log('User clientId:', user?.clientId);
    console.log('User id:', user?.id);
    console.log('Is user role client?', user.role === 'client');
    console.log('Is user role editor?', user.role === 'editor');
    console.log('Is user role manager?', user.role === 'manager');
    console.log('========================');

    // FIXED: Only check clientId for actual clients, not editors/managers
    if (user.role === 'client' && user.clientId !== clientId) {
      console.log('Access denied - client trying to access wrong clientId');
      return res.status(403).json({ 
        error: 'Access denied',
        debug: {
          userClientId: user.clientId,
          requestedClientId: clientId,
          userRole: user.role
        }
      });
    }

    // Editors and managers can access any client's data
    console.log('Permission check passed, fetching CC list...');

    const { data, error } = await supabase
      .from('cc_list')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('CC list fetched successfully, items:', data?.length || 0);
    res.json(data || []);
  } catch (error) {
    console.error('Get CC list error:', error);
    res.status(500).json({ error: 'Failed to get CC list' });
  }
});

// Create new CC list item
router.post('/:clientId', authenticateUser, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { title, description, content_type, requirements, priority } = req.body;
    const { user } = req;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // UPDATED: Check permissions - managers and editors can create for any client, clients can only create for themselves
    if (user.role === 'client' && user.clientId !== clientId) {
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
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create CC item error:', error);
    res.status(500).json({ error: 'Failed to create CC item' });
  }
});

// Update CC list item
router.put('/:clientId/:itemId', authenticateUser, async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    const { title, description, content_type, requirements, priority, status } = req.body;
    const { user } = req;

    // UPDATED: Check permissions - managers and editors can update any item, clients can only update their own
    if (user.role === 'client' && user.clientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

// Delete CC list item
router.delete('/:clientId/:itemId', authenticateUser, async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    const { user } = req;

    console.log('=== DELETE ROUTE DEBUG ===');
    console.log('User role:', user?.role);
    console.log('Client ID:', clientId);
    console.log('Item ID:', itemId);
    console.log('==========================');

    // UPDATED: Block editors from deleting
    if (user.role === 'editor') {
      return res.status(403).json({ error: 'Editors are not allowed to delete CC items' });
    }

    // Check permissions for clients
    if (user.role === 'client' && user.clientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

// Delete route for individual items - route: /item/:itemId
router.delete('/item/:itemId', authenticateUser, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { user } = req;

    console.log('=== DELETE ITEM DEBUG ===');
    console.log('User deleting item:', user);
    console.log('User role:', user?.role);
    console.log('Item ID:', itemId);
    console.log('========================');

    // UPDATED: Block editors from deleting
    if (user.role === 'editor') {
      return res.status(403).json({ error: 'Editors are not allowed to delete CC items' });
    }

    // Get the CC item to check permissions
    const { data: ccItem, error: fetchError } = await supabase
      .from('cc_list')
      .select('client_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !ccItem) {
      return res.status(404).json({ error: 'CC item not found' });
    }

    console.log('CC Item client_id:', ccItem.client_id);
    console.log('User clientId:', user.clientId);

    // Check permissions for clients
    if (user.role === 'client') {
      if (user.clientId !== ccItem.client_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    // Only managers can delete any item now

    const { error } = await supabase
      .from('cc_list')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({ error: 'Failed to delete CC item' });
    }

    console.log('CC item deleted successfully');
    res.json({ message: 'CC item deleted successfully' });
  } catch (error) {
    console.error('Error deleting CC item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;