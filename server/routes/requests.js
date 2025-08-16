const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase } = require('../config/supabase');
const { authenticateUser, requireRole } = require('../middleware/auth');
const router = express.Router();

// Configure multer for image and video uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Create request from client to manager
router.post('/', authenticateUser, requireRole(['client']), upload.single('file'), async (req, res) => {
  try {
    const { message, content_type, requirements } = req.body;
    let fileUrl = null;

    console.log('=== FILE UPLOAD DEBUG ===');
    console.log('User:', req.user);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    // Upload file to Supabase Storage if provided
    if (req.file) {
      const fileName = `${req.user.id}/${Date.now()}-${req.file.originalname}`;
      
      console.log('Attempting to upload file:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('request-files')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('Detailed upload error:', uploadError);
        return res.status(500).json({ 
          error: 'Failed to upload file',
          details: uploadError.message 
        });
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('request-files')
        .getPublicUrl(fileName);

      fileUrl = urlData.publicUrl;
      console.log('File uploaded successfully:', fileUrl);
    }

    // Get client_id from user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile?.client_id) {
      console.error('Client profile error:', profileError);
      return res.status(403).json({ error: 'Client profile not found' });
    }

    // Create request with correct column names
    const insertData = {
      client_id: profile.client_id,
      from_user_id: req.user.id,          // ✅ Change from user_id to from_user_id
      message,
      content_type: content_type || 'post',
      requirements: requirements || '',
      image_url: fileUrl,                  // ✅ Use image_url (existing column)
      status: 'pending_manager_review',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting request data:', insertData);

    const { data, error } = await supabase
      .from('requests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Request creation error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Request created successfully:', data.id);
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
    console.log('🔍 Fetching all requests for manager...');
    
    // Get all requests first
    const { data: requests, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    console.log('📊 Found', requests.length, 'requests');

    // Get all unique user IDs we need to fetch
    const userIds = new Set();
    const clientIds = new Set();

    requests.forEach(request => {
      if (request.from_user_id) userIds.add(request.from_user_id);
      if (request.to_user_id) userIds.add(request.to_user_id);
      if (request.assigned_editor_id) userIds.add(request.assigned_editor_id);
      if (request.client_id) clientIds.add(request.client_id);
    });

    console.log('📊 Fetching profiles for user IDs:', Array.from(userIds));

    // Get all user profiles at once - WITH PHONE NUMBERS
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, phone_number, role, client_id')
      .in('id', Array.from(userIds));

    if (profilesError) {
      console.error('❌ Profiles query error:', profilesError);
    }

    console.log('📱 Profiles fetched:', profiles?.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      has_phone: !!p.phone_number,
      phone_preview: p.phone_number ? `${p.phone_number.substring(0, 5)}...` : 'none'
    })));

    // Get all client info at once
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', Array.from(clientIds));

    // Get current manager info
    const { data: currentManager } = await supabase
      .from('profiles')
      .select('name, phone_number')
      .eq('id', req.user.id)
      .single();

    // Create lookup maps
    const profileMap = profiles?.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {}) || {};

    const clientMap = clients?.reduce((acc, client) => {
      acc[client.id] = client;
      return acc;
    }, {}) || {};

    // Enhance each request with the profile data
    const enhancedRequests = requests.map(request => {
      const fromUser = profileMap[request.from_user_id];
      const enhancedRequest = {
        ...request,
        from_user: fromUser,
        to_user: profileMap[request.to_user_id] || null,
        assigned_editor: profileMap[request.assigned_editor_id] || null,
        clients: clientMap[request.client_id] || null,
        manager_name: currentManager?.name || 'Manager',
        manager_phone: currentManager?.phone_number
      };

      // Debug log for the first few requests
      if (requests.indexOf(request) < 3) {
        console.log(`📱 Request ${request.id} from_user debug:`, {
          from_user_id: request.from_user_id,
          from_user_data: fromUser,
          has_phone: !!fromUser?.phone_number
        });
      }

      return enhancedRequest;
    });

    console.log('📱 Enhanced Requests - Sample client phones:', 
      enhancedRequests.slice(0, 3).map(r => ({
        id: r.id,
        client_name: r.from_user?.name,
        client_phone: r.from_user?.phone_number ? 'PRESENT' : 'MISSING'
      }))
    );

    res.json({ requests: enhancedRequests });
  } catch (error) {
    console.error('❌ Get all requests error:', error);
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
      .select('id, role, name, email, phone_number')
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
        manager_id: req.user.id, // ✅ Store who assigned it
        status: 'assigned_to_editor',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select(`
        *,
        from_user:from_user_id (name, email, phone_number),
        assigned_editor:assigned_editor_id (name, email, phone_number),
        clients:client_id (name),
        manager:manager_id (name, phone_number)
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
      .select('id, name, email, phone_number') // ✅ Add phone_number here
      .eq('role', 'editor')
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ editors }); // ✅ This matches what AssignRequestModal expects
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
        from_user:from_user_id (name, email, phone_number),
        clients:client_id (name),
        manager_profile:manager_id (name, phone_number)
      `)
      .eq('assigned_editor_id', req.user.id)
      .in('status', ['assigned_to_editor', 'manager_rejected', 'client_rejected'])
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Transform the data to include manager info in expected format
    const transformedRequests = requests.map(request => ({
      ...request,
      manager_name: request.manager_profile?.name || 'Manager',
      manager_phone: request.manager_profile?.phone_number
    }));

    res.json({ requests: transformedRequests });
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

    console.log('=== EDITOR SUBMIT DEBUG ===');
    console.log('Request ID:', requestId);
    console.log('Editor:', req.user.id);
    console.log('File:', req.file);
    console.log('Message:', message);

    // Check if request exists and is assigned to this editor
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .eq('assigned_editor_id', req.user.id)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Request not found or not assigned to you' });
    }

    let completedWorkUrl = null;
    
    // Upload file to Supabase Storage if provided
    if (req.file) {
      const fileName = `completed-work/${req.user.id}/${Date.now()}-${req.file.originalname}`;
      
      console.log('Uploading completed work to Supabase:', fileName);
      console.log('File size:', req.file.size);
      console.log('File type:', req.file.mimetype);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('request-files')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ 
          error: 'Failed to upload file',
          details: uploadError.message 
        });
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('request-files')
        .getPublicUrl(fileName);

      completedWorkUrl = urlData.publicUrl;
      console.log('Completed work uploaded successfully:', completedWorkUrl);
    }

    // Update the request with editor's submission
    const updateData = {
      status: 'submitted_for_review',
      editor_message: message,
      updated_at: new Date().toISOString(),
      // Clear previous feedback when resubmitting
      manager_feedback: null,
      client_feedback: null
    };

    // Only update completed_work_url if a new file was uploaded
    if (completedWorkUrl) {
      updateData.completed_work_url = completedWorkUrl;
    }

    console.log('Updating request with data:', updateData);

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
      console.error('Submit error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Successfully updated request. Completed work URL:', data.completed_work_url);
    res.json({ request: data });

  } catch (error) {
    console.error('Submit request error:', error);
    res.status(500).json({ error: 'Failed to submit work' });
  }
});

// Manager reviews editor's submitted work
router.put('/:requestId/review', authenticateUser, requireRole(['manager']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, feedback } = req.body;

    console.log('🔍 Manager Review Debug - Start:', { requestId, action, managerId: req.user.id });

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    if (action === 'reject' && !feedback) {
      return res.status(400).json({ error: 'Feedback is required when rejecting' });
    }

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
      updateData.to_user_id = request.from_user_id;
    } else {
      updateData.status = 'manager_rejected';
      updateData.manager_feedback = feedback;
      updateData.to_user_id = request.assigned_editor_id;
    }

    // Update the request first
    const { data: updatedRequest, error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Review error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('📱 Updated request from_user_id:', updatedRequest.from_user_id);

    // Now get all the related data separately with proper error handling
    const fromUserResult = await supabase
      .from('profiles')
      .select('id, name, email, phone_number, role, client_id')
      .eq('id', updatedRequest.from_user_id)
      .single();

    console.log('📱 From User Query Result:', {
      data: fromUserResult.data,
      error: fromUserResult.error,
      from_user_id: updatedRequest.from_user_id
    });

    const assignedEditorResult = updatedRequest.assigned_editor_id ? 
      await supabase
        .from('profiles')
        .select('id, name, email, phone_number')
        .eq('id', updatedRequest.assigned_editor_id)
        .single() : 
      { data: null, error: null };

    const clientResult = await supabase
      .from('clients')
      .select('name')
      .eq('id', updatedRequest.client_id)
      .single();

    const currentManagerResult = await supabase
      .from('profiles')
      .select('name, phone_number')
      .eq('id', req.user.id)
      .single();

    console.log('📱 All Query Results:', {
      fromUser: fromUserResult,
      assignedEditor: assignedEditorResult,
      client: clientResult,
      currentManager: currentManagerResult
    });

    // Check for errors in individual queries
    if (fromUserResult.error) {
      console.error('❌ From User Query Error:', fromUserResult.error);
    }

    // Build the enhanced response
    const enhancedData = {
      ...updatedRequest,
      from_user: fromUserResult.data,
      assigned_editor: assignedEditorResult.data,
      clients: clientResult.data,
      manager_name: currentManagerResult.data?.name || 'Manager',
      manager_phone: currentManagerResult.data?.phone_number
    };

    console.log('📱 Final Enhanced Response:', {
      client_phone: enhancedData.from_user?.phone_number,
      client_name: enhancedData.from_user?.name,
      client_email: enhancedData.from_user?.email,
      has_client_phone: !!enhancedData.from_user?.phone_number,
      manager_name: enhancedData.manager_name,
      editor_phone: enhancedData.assigned_editor?.phone_number,
      from_user_full: enhancedData.from_user
    });

    res.json({ request: enhancedData });
  } catch (error) {
    console.error('❌ Review request error:', error);
    res.status(500).json({ error: 'Failed to review request' });
  }
});

// Client reviews final work from manager
router.put('/:requestId/client-review', authenticateUser, requireRole(['client']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, feedback } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

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
      updateData.to_user_id = null;
    } else {
      updateData.status = 'client_rejected';
      updateData.to_user_id = request.assigned_editor_id;
    }

    const { data, error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', requestId)
      .select(`
        *,
        from_user:from_user_id (name, email, phone_number),
        assigned_editor:assigned_editor_id (name, email, phone_number),
        clients:client_id (name),
        manager:manager_id (name, phone_number)
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

// Debugging endpoint to analyze phone number issues
router.get('/debug-phones/:requestId', authenticateUser, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Get the basic request
    const { data: basicRequest } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    // Get the from_user profile directly
    const { data: fromUserProfile } = await supabase
      .from('profiles')
      .select('id, name, email, phone_number, role, client_id')
      .eq('id', basicRequest.from_user_id)
      .single();

    // Get client profile by client_id
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('id, name, email, phone_number, role')
      .eq('client_id', basicRequest.client_id)
      .eq('role', 'client')
      .single();

    // Get the full request with joins
    const { data: fullRequest } = await supabase
      .from('requests')
      .select(`
        *,
        from_user:from_user_id (id, name, email, phone_number, role, client_id),
        assigned_editor:assigned_editor_id (name, email, phone_number),
        clients:client_id (name)
      `)
      .eq('id', requestId)
      .single();

    res.json({ 
      debug: true,
      basic_request: basicRequest,
      from_user_profile: fromUserProfile,
      client_profile: clientProfile,
      full_request: fullRequest,
      analysis: {
        from_user_has_phone: !!fromUserProfile?.phone_number,
        client_has_phone: !!clientProfile?.phone_number,
        from_user_is_client: fromUserProfile?.role === 'client',
        client_id_match: basicRequest.client_id === clientProfile?.client_id
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;