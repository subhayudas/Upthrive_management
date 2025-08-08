const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all users (managers only)
router.get('/', authenticateUser, requireRole(['manager', 'editor']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        client_id,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ users: data });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get users by role
router.get('/by-role/:role', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { role } = req.params;
    const validRoles = ['client', 'manager', 'editor'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ users: data });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Failed to get users by role' });
  }
});

// Get all editors (for manager assignment)
router.get('/editors', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'editor')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ editors: data });
  } catch (error) {
    console.error('Get editors error:', error);
    res.status(500).json({ error: 'Failed to get editors' });
  }
});

// Get all clients
router.get('/clients', authenticateUser, requireRole(['manager', 'editor']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ clients: data });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

// Get user profile by ID
router.get('/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own profile unless they're a manager
    if (req.user.role !== 'manager' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email } = req.body;

    // Users can only update their own profile unless they're a manager
    if (req.user.role !== 'manager' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name,
        email,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (managers only)
router.delete('/:userId', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting own account
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;