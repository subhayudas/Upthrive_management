const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

// Get all clients (for managers and editors)
router.get('/', authenticateUser, requireRole(['manager', 'editor']), async (req, res) => {
  try {
    console.log('Fetching clients for user:', req.user); // Debug log
    const { data, error } = await supabase
      .from('clients')
      .select('id, company_name, email, name')
      .order('company_name');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('Clients fetched:', data); // Debug log
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;