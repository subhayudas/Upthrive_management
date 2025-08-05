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

// Create request from client to manager
router.post('/', authenticateUser, requireRole(['client']), upload.single('image'), async (req, res) => {
  try {
    const { message, content_type, requirements } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let imageUrl = null;
    if (req.file) {
      // In production, you'd upload to Supabase Storage or another cloud service
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const { data, error } = await supabase
      .from('requests')
      .insert({
        client_id: req.user.clientId,
        from_user_id: req.user.id,
        message,
        content_type: content_type || 'post',
        requirements: requirements || '',
        image_url: imageUrl,
        status: 'pending_manager_review'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ request: data });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Get requests for current user
router.get('/my-requests', authenticateUser, async (req, res) => {
  try {
    let query = supabase
      .from('requests')
      .select(`
        *,
        from_user:from_user_id (name, email),
        to_user:to_user_id (name, email),
        clients:client_id (name)
      `)
      .order('created_at', { ascending: false });

    // Filter based on user role
    if (req.user.role === 'client') {
      query = query.eq('client_id', req.user.clientId);
    } else if (req.user.role === 'manager') {
      // Managers can see all requests
    } else if (req.user.role === 'editor') {
      // Editors can see requests assigned to them
      query = query.eq('assigned_editor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ requests: data });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

// Get all requests (managers only)
router.get('/', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        from_user:from_user_id (name, email),
        to_user:to_user_id (name, email),
        clients:client_id (name),
        assigned_editor:assigned_editor_id (name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ requests: data });
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

// Assign request to editor (managers only)
router.put('/:requestId/assign', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { editor_id } = req.body;

    if (!editor_id) {
      return res.status(400).json({ error: 'Editor ID is required' });
    }

    // Verify the editor exists and is actually an editor
    const { data: editor, error: editorError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', editor_id)
      .eq('role', 'editor')
      .single();

    if (editorError || !editor) {
      return res.status(400).json({ error: 'Invalid editor selected' });
    }

    // Update the request
    const { data, error } = await supabase
      .from('requests')
      .update({
        assigned_editor_id: editor_id,
        to_user_id: editor_id,
        status: 'assigned_to_editor',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select(`
        *,
        from_user:from_user_id (name, email),
        assigned_editor:assigned_editor_id (name, email),
        clients:client_id (name)
      `)
      .single();

    if (error) {
      console.error('Assignment error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ request: data });
  } catch (error) {
    console.error('Assign request error:', error);
    res.status(500).json({ error: 'Failed to assign request' });
  }
});

// Get all editors (for assignment dropdown)
router.get('/editors', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { data: editors, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'editor')
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ editors });
  } catch (error) {
    console.error('Get editors error:', error);
    res.status(500).json({ error: 'Failed to get editors' });
  }
});

// Get requests assigned to current editor
router.get('/my-tasks', authenticateUser, requireRole(['editor']), async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('requests')
      .select(`
        *,
        from_user:from_user_id (name, email),
        clients:client_id (name)
      `)
      .eq('assigned_editor_id', req.user.id)
      .in('status', ['assigned_to_editor', 'manager_rejected', 'client_rejected']) // Added client_rejected
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ requests });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get request by ID
router.get('/:requestId', authenticateUser, async (req, res) => {
  try {
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        from_user:from_user_id (name, email),
        to_user:to_user_id (name, email),
        clients:client_id (name),
        assigned_editor:assigned_editor_id (name, email)
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check access permissions
    if (req.user.role === 'client' && data.client_id !== req.user.clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ request: data });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Failed to get request' });
  }
});

// Editor submits completed work
router.put('/:requestId/submit', authenticateUser, requireRole(['editor']), upload.single('completed_work'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify the request is assigned to this editor and is in a status that allows submission
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .eq('assigned_editor_id', req.user.id)
      .in('status', ['assigned_to_editor', 'manager_rejected', 'client_rejected']) // Allow resubmission
      .single();

    if (requestError || !request) {
      return res.status(403).json({ error: 'Request not found or not available for submission' });
    }

    let completedWorkUrl = null;
    if (req.file) {
      completedWorkUrl = `/uploads/${req.file.filename}`;
    }

    // Determine the next status based on current status
    let nextStatus = 'submitted_for_review';
    if (request.status === 'client_rejected') {
      // If client rejected, send back to manager for review
      nextStatus = 'submitted_for_review';
    }

    // Update the request status and add editor's message
    const { data, error } = await supabase
      .from('requests')
      .update({
        status: nextStatus,
        editor_message: message,
        completed_work_url: completedWorkUrl || request.completed_work_url, // Keep existing if no new file
        updated_at: new Date().toISOString(),
        // Clear previous feedback when resubmitting
        manager_feedback: null,
        client_feedback: null
      })
      .eq('id', requestId)
      .select(`
        *,
        from_user:from_user_id (name, email),
        assigned_editor:assigned_editor_id (name, email),
        clients:client_id (name)
      `)
      .single();

    if (error) {
      console.error('Submit error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ request: data });
  } catch (error) {
    console.error('Submit request error:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Manager reviews editor's submitted work
router.put('/:requestId/review', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, feedback } = req.body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    if (action === 'reject' && !feedback) {
      return res.status(400).json({ error: 'Feedback is required when rejecting' });
    }

    // Get the current request
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'submitted_for_review')
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Request not found or not ready for review' });
    }

    let updateData = {
      updated_at: new Date().toISOString()
    };

    if (action === 'approve') {
      updateData.status = 'manager_approved';
      updateData.to_user_id = request.from_user_id; // Send to client for final approval
    } else {
      updateData.status = 'manager_rejected';
      updateData.manager_feedback = feedback;
      updateData.to_user_id = request.assigned_editor_id; // Send back to editor
    }

    const { data, error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', requestId)
      .select(`
        *,
        from_user:from_user_id (name, email),
        assigned_editor:assigned_editor_id (name, email),
        clients:client_id (name)
      `)
      .single();

    if (error) {
      console.error('Review error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ request: data });
  } catch (error) {
    console.error('Review request error:', error);
    res.status(500).json({ error: 'Failed to review request' });
  }
});

// Client reviews final work from manager
router.put('/:requestId/client-review', authenticateUser, requireRole(['client']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, feedback } = req.body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    // Get the current request
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'manager_approved')
      .eq('client_id', req.user.clientId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Request not found or not ready for client review' });
    }

    let updateData = {
      updated_at: new Date().toISOString(),
      client_feedback: feedback || null
    };

    if (action === 'approve') {
      updateData.status = 'client_approved';
      updateData.to_user_id = null; // Request is complete
    } else {
      updateData.status = 'client_rejected';
      updateData.to_user_id = request.assigned_editor_id; // Send back to editor for revision
    }

    const { data, error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', requestId)
      .select(`
        *,
        from_user:from_user_id (name, email),
        assigned_editor:assigned_editor_id (name, email),
        clients:client_id (name)
      `)
      .single();

    if (error) {
      console.error('Client review error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ request: data });
  } catch (error) {
    console.error('Client review request error:', error);
    res.status(500).json({ error: 'Failed to review request' });
  }
});

module.exports = router;