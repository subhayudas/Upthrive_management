const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireRole, requireClientAccess } = require('../middleware/auth');
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

// Get CC list for a specific client
router.get('/:clientId', authenticateUser, async (req, res) => {
  try {
    const { clientId } = req.params;

    // For client users, verify they're accessing their own CC list
    if (req.user.role === 'client') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', req.user.id)
        .single();

      if (profileError || !profile?.client_id) {
        return res.status(403).json({ error: 'Client profile not found' });
      }

      if (profile.client_id !== clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data, error } = await supabaseAdmin
        .from('cc_list')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('CC List fetch error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('CC List data for client:', data);
      console.log('First item media_urls:', data?.[0]?.media_urls);
      console.log('First item image_url:', data?.[0]?.image_url);

      return res.json({ ccList: data || [] });
    }

    // For managers AND editors, use admin access to bypass RLS
    if (req.user.role === 'manager' || req.user.role === 'editor') {
      const { data, error } = await supabaseAdmin
        .from('cc_list')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('CC List fetch error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('CC List data for manager/editor:', data);
      console.log('First item media_urls:', data?.[0]?.media_urls);
      console.log('First item image_url:', data?.[0]?.image_url);

      return res.json({ ccList: data || [] });
    }

    // If not client, manager, or editor, deny access
    return res.status(403).json({ error: 'Access denied' });

  } catch (error) {
    console.error('Get CC list error:', error);
    res.status(500).json({ error: 'Failed to get CC list' });
  }
});

// Create new CC list item (supports multiple media)
router.post('/:clientId', authenticateUser, upload.array('media', 10), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { title, description, content_type, requirements, priority, google_drive_link, scheduled_date } = req.body;
    let fileUrl = null;
    let mediaUrls = [];

    console.log('=== CC LIST FILE UPLOAD DEBUG ===');
    console.log('User:', req.user);
    console.log('ClientId from params:', clientId);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files?.map(f => f.originalname));

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // For clients, verify they're creating items for their own client_id
    if (req.user.role === 'client') {
      // Get the user's client_id from their profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('client_id')
        .eq('id', req.user.id)
        .single();

      if (profileError || !profile?.client_id) {
        console.error('Client profile error:', profileError);
        return res.status(403).json({ error: 'Client profile not found' });
      }

      // Verify they're creating items for their own client
      if (profile.client_id !== clientId) {
        console.error('Client trying to create for wrong client_id:', profile.client_id, 'vs', clientId);
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'manager') {
      // Managers can create for any client
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Upload files to Supabase Storage if provided
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `${req.user.id}/cc-list/${Date.now()}-${file.originalname}`;
        console.log('Attempting to upload CC list file:', fileName);
        const { error: uploadError } = await supabaseAdmin.storage
          .from('request-files')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });
        if (uploadError) {
          console.error('CC List file upload error:', uploadError);
          return res.status(500).json({ 
            error: 'Failed to upload file',
            details: uploadError.message 
          });
        }
        const { data: urlData } = supabaseAdmin.storage
          .from('request-files')
          .getPublicUrl(fileName);
        mediaUrls.push(urlData.publicUrl);
      }
      fileUrl = mediaUrls[0] || null;
      console.log('CC List files uploaded successfully:', mediaUrls);
    }

    // Create CC list item using admin client to bypass RLS
    const { data: ccItem, error: ccError } = await supabaseAdmin
      .from('cc_list')
      .insert({
        client_id: clientId,
        title,
        description,
        content_type: content_type || 'post',
        requirements: requirements || '',
        priority: priority || 'medium',
        status: 'active',
        image_url: fileUrl,
        file_url: fileUrl,
        media_urls: mediaUrls.length ? mediaUrls : null,
        google_drive_link: google_drive_link || null,
        scheduled_date: scheduled_date || null,
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (ccError) {
      console.error('CC Item create error:', ccError);
      return res.status(500).json({ error: ccError.message });
    }

    // Create corresponding request using admin client
    const { data: request, error: reqError } = await supabaseAdmin
      .from('requests')
      .insert({
        client_id: clientId,
        from_user_id: req.user.id,
        message: description,
        content_type: content_type || 'post',
        status: 'pending_manager_review',
        cc_list_id: ccItem.id,
        image_url: fileUrl,
        file_url: fileUrl,
        media_urls: mediaUrls.length ? mediaUrls : null,
        google_drive_link: google_drive_link || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reqError) {
      console.error('Request create error:', reqError);
      // Optionally: Rollback the CC item if request creation fails
      return res.status(500).json({ error: reqError.message });
    }

    res.status(201).json({ ccItem, request });
  } catch (error) {
    console.error('Create CC item error:', error);
    res.status(500).json({ error: 'Failed to create CC item' });
  }
});

// Update CC list item (supports multiple media)
router.put('/:clientId/:itemId', authenticateUser, requireRole(['manager']), upload.array('media', 10), async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    const { title, description, content_type, requirements, priority, status, google_drive_link, scheduled_date } = req.body;
    let fileUrl = null;
    let mediaUrls = [];

    console.log('=== CC LIST UPDATE FILE UPLOAD DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files?.map(f => f.originalname));

    // Upload files to Supabase Storage if provided
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `${req.user.id}/cc-list/${Date.now()}-${file.originalname}`;
        console.log('Attempting to upload CC list update file:', fileName);
        const { error: uploadError } = await supabase.storage
          .from('request-files')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });
        if (uploadError) {
          console.error('CC List update file upload error:', uploadError);
          return res.status(500).json({ 
            error: 'Failed to upload file',
            details: uploadError.message 
          });
        }
        const { data: urlData } = supabase.storage
          .from('request-files')
          .getPublicUrl(fileName);
        mediaUrls.push(urlData.publicUrl);
      }
      fileUrl = mediaUrls[0] || null;
      console.log('CC List update files uploaded successfully:', mediaUrls);
    }

    const updateData = {
      title,
      description,
      content_type,
      requirements,
      priority,
      status,
      updated_at: new Date().toISOString()
    };

    // Add file URLs if new files were uploaded
    if (fileUrl) {
      updateData.image_url = fileUrl;
      updateData.file_url = fileUrl;
    }
    if (mediaUrls.length) {
      updateData.media_urls = mediaUrls;
    }

    // Add Google Drive link if provided
    if (google_drive_link !== undefined) {
      updateData.google_drive_link = google_drive_link || null;
    }

    // Add scheduled date if provided
    if (scheduled_date !== undefined) {
      updateData.scheduled_date = scheduled_date || null;
    }

    const { data, error } = await supabase
      .from('cc_list')
      .update(updateData)
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
router.delete('/:clientId/:itemId', authenticateUser, async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    console.log('DELETE request - clientId:', clientId, 'itemId:', itemId, 'user role:', req.user.role);

    // For clients, verify they're deleting their own items
    if (req.user.role === 'client') {
      // Get the user's client_id from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', req.user.id)
        .single();

      if (profileError || !profile?.client_id) {
        console.error('Client profile error:', profileError);
        return res.status(403).json({ error: 'Client profile not found' });
      }

      // Verify they're deleting items from their own client
      if (profile.client_id !== clientId) {
        console.error('Client trying to delete from wrong client_id');
        return res.status(403).json({ error: 'Access denied' });
      }

      // Delete with additional verification that the item belongs to this client
      const { error } = await supabase
        .from('cc_list')
        .delete()
        .eq('id', itemId)
        .eq('client_id', clientId);

      if (error) {
        console.error('Delete error for client:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('Successfully deleted item for client');
      return res.json({ message: 'CC item deleted successfully' });
    }

    // For managers, allow deletion of any client's items
    if (req.user.role === 'manager') {
      const { error } = await supabase
        .from('cc_list')
        .delete()
        .eq('id', itemId)
        .eq('client_id', clientId);

      if (error) {
        console.error('Delete error for manager:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('Successfully deleted item for manager');
      return res.json({ message: 'CC item deleted successfully' });
    }

    // Editors cannot delete items
    if (req.user.role === 'editor') {
      return res.status(403).json({ error: 'Editors cannot delete CC items' });
    }

    // Other roles not allowed
    return res.status(403).json({ error: 'Access denied' });

  } catch (error) {
    console.error('Delete CC item error:', error);
    res.status(500).json({ error: 'Failed to delete CC item' });
  }
});

// Get all CC lists (managers and editors only)
router.get('/', authenticateUser, requireRole(['manager', 'editor']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
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