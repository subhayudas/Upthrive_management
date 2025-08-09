const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase } = require('../config/supabase');
const { authenticateUser, requireRole } = require('../middleware/auth');
const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get tasks for current user
router.get('/my-tasks', authenticateUser, async (req, res) => {
  try {
    let query = supabase
      .from('requests') // Query from requests table instead of tasks
      .select(`
        *,
        from_user:from_user_id (name, email),
        assigned_editor:assigned_editor_id (name, email),
        clients:client_id (name)
      `)
      .eq('assigned_editor_id', req.user.id)
      .in('status', ['assigned_to_editor', 'manager_rejected', 'client_rejected', 'submitted_for_review'])
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ tasks: data });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Submit task work (editors only)
router.put('/:taskId/submit', authenticateUser, requireRole(['editor']), upload.single('image'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { message, changes_made } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify task belongs to editor
    const { data: task, error: taskError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', taskId)
      .eq('assigned_editor_id', req.user.id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const { data, error } = await supabase
      .from('requests')
      .update({
        status: 'submitted_for_review',
        submitted_message: message,
        submitted_image_url: imageUrl,
        changes_made: changes_made || '',
        submitted_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ task: data });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

// Review task submission (managers only)
router.put('/:taskId/review', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action, feedback } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    // Verify task belongs to manager
    const { data: task, error: taskError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', taskId)
      .eq('manager_id', req.user.id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    let newStatus = '';
    if (action === 'approve') {
      newStatus = 'manager_approved';
    } else {
      newStatus = 'manager_rejected';
    }

    const { data, error } = await supabase
      .from('requests')
      .update({
        status: newStatus,
        manager_feedback: feedback || '',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ task: data });
  } catch (error) {
    console.error('Review task error:', error);
    res.status(500).json({ error: 'Failed to review task' });
  }
});

// Client review task (clients only)
router.put('/:taskId/client-review', authenticateUser, requireRole(['client']), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action, feedback } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    // Verify task belongs to client
    const { data: task, error: taskError } = await supabase
      .from('requests')
      .select(`
        *,
        request:request_id (client_id)
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.request.client_id !== req.user.clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let newStatus = '';
    if (action === 'approve') {
      newStatus = 'completed';
    } else {
      newStatus = 'client_rejected';
    }

    const { data, error } = await supabase
      .from('requests')
      .update({
        status: newStatus,
        client_feedback: feedback || '',
        client_reviewed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ task: data });
  } catch (error) {
    console.error('Client review task error:', error);
    res.status(500).json({ error: 'Failed to review task' });
  }
});

module.exports = router;