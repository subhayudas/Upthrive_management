import axios from 'axios';
import supabase from '../config/supabase';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.backendAvailable = true;
    this.setupAxiosInterceptors();
  }

  setupAxiosInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle backend failures
    axios.interceptors.response.use(
      (response) => {
        this.backendAvailable = true;
        return response;
      },
      (error) => {
        // Check if it's a network error or server is down
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || 
            !error.response || error.response.status >= 500) {
          console.warn('🔄 Backend unavailable, will use Supabase fallback for future requests');
          this.backendAvailable = false;
        }
        return Promise.reject(error);
      }
    );
  }

  // Helper function to get user for fallback scenarios
  async getCurrentUserForFallback() {
    if (!supabase) throw new Error('Supabase not configured');
    
    // First try to get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (user) {
      return user;
    }
    
    // If no authenticated user, we need to get user info another way
    // In fallback scenarios, we might need to get user info from localStorage
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    // Try to decode the JWT to get user ID (basic approach)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub;
      
      if (userId) {
        // Return a user-like object for compatibility
        return { id: userId };
      }
    } catch (e) {
      // If JWT decode fails, fall back to error
    }
    
    throw new Error('Not authenticated');
  }

  async makeRequest(backendCall, supabaseCall, options = {}) {
    const { skipBackend = false, showError = true } = options;
    
    // Try backend first if available and not skipped
    if (this.backendAvailable && !skipBackend) {
      try {
        const result = await backendCall();
        return { success: true, data: result.data || result, source: 'backend' };
      } catch (error) {
        console.warn('Backend request failed:', error.message);
        
        // Mark backend as unavailable for certain errors
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || 
            !error.response || error.response.status >= 500) {
          this.backendAvailable = false;
          console.warn('🔄 Switching to Supabase fallback');
        } else {
          // For other errors (like 401, 400), don't try fallback
          if (showError) {
            toast.error(error.response?.data?.error || error.message || 'Request failed');
          }
          return { success: false, error: error.message, source: 'backend' };
        }
      }
    }

    // Try Supabase fallback
    if (supabase && supabaseCall) {
      try {
        console.log('🔄 Using Supabase fallback');
        const result = await supabaseCall();
        return { success: true, data: result, source: 'supabase' };
      } catch (error) {
        console.error('Supabase fallback failed:', error);
        if (showError) {
          toast.error(error.message || 'Operation failed');
        }
        return { success: false, error: error.message, source: 'supabase' };
      }
    }

    // No fallback available
    const errorMsg = 'Service unavailable and no fallback configured';
    if (showError) {
      toast.error(errorMsg);
    }
    return { success: false, error: errorMsg, source: 'none' };
  }

  // Auth Services
  async login(email, password) {
    const backendCall = () => axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw new Error(authError.message);

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (profileError) throw new Error('Profile not found');

      const userData = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        phone_number: profile.phone_number,
        client_id: profile.client_id,
        created_at: profile.created_at
      };

      // Store session data and set the session in Supabase
      localStorage.setItem('token', authData.session.access_token);
      
      // Set the session in Supabase for future calls
      await supabase.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token
      });
      
      return {
        user: userData,
        session: authData.session
      };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async register(userData) {
    const backendCall = () => axios.post(`${API_BASE_URL}/api/auth/register`, userData);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { email, password, role, name, clientId, phone } = userData;

      // Validate required fields
      if (!email || !password || !role || !name) {
        throw new Error('Missing required fields');
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role }
        }
      });

      if (authError) throw new Error(authError.message);

      let client_id = clientId;

      // If user is a client, create a client record
      if (role === 'client') {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .insert({
            name,
            email,
            company_name: name
          })
          .select()
          .single();

        if (clientError) throw new Error(clientError.message);
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
          phone_number: phone || null,
          client_id: client_id
        });

      if (profileError) throw new Error(profileError.message);

      return { 
        message: 'User created successfully',
        user: {
          id: authData.user.id,
          email,
          name,
          role,
          phone_number: phone || null,
          clientId: client_id
        }
      };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async getProfile() {
    const backendCall = () => axios.get(`${API_BASE_URL}/api/auth/profile`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Profile not found');

      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          phone_number: profile.phone_number,
          client_id: profile.client_id,
          created_at: profile.created_at
        }
      };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async logout() {
    const backendCall = () => axios.post(`${API_BASE_URL}/api/auth/logout`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      
      return { message: 'Logged out successfully' };
    };

    // Always clear local storage regardless of result
    const result = await this.makeRequest(backendCall, supabaseCall, { showError: false });
    localStorage.removeItem('token');
    return result;
  }

  // Request Services
  async getRequests() {
    const backendCall = () => axios.get(`${API_BASE_URL}/api/requests/my-requests`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Get user profile to determine role and access
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Profile not found');

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
      if (profile.role === 'client') {
        query = query.eq('client_id', profile.client_id);
      } else if (profile.role === 'editor') {
        query = query.eq('assigned_editor_id', profile.id);
      }
      // Managers can see all requests (no filter)

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return { requests: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async createRequest(formData) {
    const backendCall = () => axios.post(`${API_BASE_URL}/api/requests`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Get user's client_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.client_id) {
        throw new Error('Client profile not found');
      }

      let mediaUrls = [];
      const files = formData.getAll('files');
      
      // Upload files to Supabase Storage if provided
      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = `${user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('request-files')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });
          
          if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);
          
          const { data: urlData } = supabase.storage
            .from('request-files')
            .getPublicUrl(fileName);
          mediaUrls.push(urlData.publicUrl);
        }
      }

      // Create request
      const insertData = {
        client_id: profile.client_id,
        from_user_id: user.id,
        message: formData.get('message'),
        content_type: formData.get('content_type') || 'post',
        requirements: formData.get('requirements') || '',
        image_url: mediaUrls[0] || null,
        media_urls: mediaUrls.length ? mediaUrls : null,
        status: 'pending_manager_review',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('requests')
        .insert(insertData)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return { request: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async assignRequest(requestId, editorId) {
    const backendCall = () => axios.put(`${API_BASE_URL}/api/requests/${requestId}/assign`, { editor_id: editorId });
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Verify the editor exists and is actually an editor
      const { data: editor, error: editorError } = await supabase
        .from('profiles')
        .select('id, role, name, email, phone_number')
        .eq('id', editorId)
        .eq('role', 'editor')
        .single();

      if (editorError || !editor) {
        throw new Error('Invalid editor selected');
      }

      // Update the request
      const { data, error } = await supabase
        .from('requests')
        .update({
          assigned_editor_id: editorId,
          to_user_id: editorId,
          manager_id: user.id,
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

      if (error) throw new Error(error.message);

      return { request: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async getEditors() {
    const backendCall = () => axios.get(`${API_BASE_URL}/api/requests/editors`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data: editors, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone_number')
        .eq('role', 'editor')
        .order('name');

      if (error) throw new Error(error.message);

      return { editors };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async getTasks() {
    const backendCall = () => axios.get(`${API_BASE_URL}/api/requests/my-tasks`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      const { data: requests, error } = await supabase
        .from('requests')
        .select(`
          *,
          from_user:from_user_id (name, email, phone_number),
          clients:client_id (name),
          manager_profile:manager_id (name, phone_number)
        `)
        .eq('assigned_editor_id', user.id)
        .in('status', ['assigned_to_editor', 'manager_rejected', 'client_rejected'])
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      // Transform the data to include manager info in expected format
      const transformedRequests = requests.map(request => ({
        ...request,
        manager_name: request.manager_profile?.name || 'Manager',
        manager_phone: request.manager_profile?.phone_number
      }));

      return { requests: transformedRequests };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async submitTask(taskId, formData) {
    const backendCall = () => axios.put(`${API_BASE_URL}/api/requests/${taskId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Check if request exists and is assigned to this editor
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', taskId)
        .eq('assigned_editor_id', user.id)
        .single();

      if (requestError || !request) {
        throw new Error('Request not found or not assigned to you');
      }

      let completedWorkUrl = null;
      const file = formData.get('completed_work');
      
      // Upload file to Supabase Storage if provided
      if (file && file.size > 0) {
        const fileName = `completed-work/${user.id}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('request-files')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('request-files')
          .getPublicUrl(fileName);

        completedWorkUrl = urlData.publicUrl;
      }

      // Update the request with editor's submission
      const updateData = {
        status: 'submitted_for_review',
        editor_message: formData.get('message'),
        updated_at: new Date().toISOString(),
        manager_feedback: null,
        client_feedback: null
      };

      if (completedWorkUrl) {
        updateData.completed_work_url = completedWorkUrl;
      }

      const { data, error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', taskId)
        .select(`
          *,
          from_user:from_user_id (name, email),
          assigned_editor:assigned_editor_id (name, email),
          clients:client_id (name)
        `)
        .single();

      if (error) throw new Error(error.message);

      return { request: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async reviewRequest(requestId, action, feedback) {
    const backendCall = () => axios.put(`${API_BASE_URL}/api/requests/${requestId}/review`, { action, feedback });
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      if (!action || !['approve', 'reject'].includes(action)) {
        throw new Error('Invalid action. Must be approve or reject');
      }

      if (action === 'reject' && !feedback) {
        throw new Error('Feedback is required when rejecting');
      }

      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .eq('status', 'submitted_for_review')
        .single();

      if (requestError || !request) {
        throw new Error('Request not found or not ready for review');
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

      if (error) throw new Error(error.message);

      // Get related data
      const [fromUserResult, assignedEditorResult, clientResult, currentManagerResult] = await Promise.all([
        supabase.from('profiles').select('id, name, email, phone_number, role, client_id').eq('id', updatedRequest.from_user_id).single(),
        updatedRequest.assigned_editor_id ? supabase.from('profiles').select('id, name, email, phone_number').eq('id', updatedRequest.assigned_editor_id).single() : { data: null },
        supabase.from('clients').select('name').eq('id', updatedRequest.client_id).single(),
        supabase.from('profiles').select('name, phone_number').eq('id', user.id).single()
      ]);

      // Build the enhanced response
      const enhancedData = {
        ...updatedRequest,
        from_user: fromUserResult.data,
        assigned_editor: assignedEditorResult.data,
        clients: clientResult.data,
        manager_name: currentManagerResult.data?.name || 'Manager',
        manager_phone: currentManagerResult.data?.phone_number
      };

      return { request: enhancedData };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async clientReviewRequest(requestId, action, feedback) {
    const backendCall = () => axios.put(`${API_BASE_URL}/api/requests/${requestId}/client-review`, { action, feedback });
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Get user profile to check client_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Profile not found');

      if (!action || !['approve', 'reject'].includes(action)) {
        throw new Error('Invalid action. Must be approve or reject');
      }

      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .eq('status', 'manager_approved')
        .eq('client_id', profile.client_id)
        .single();

      if (requestError || !request) {
        throw new Error('Request not found or not ready for client review');
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

      if (error) throw new Error(error.message);

      return { request: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  // CC List Services
  async getCCList(clientId) {
    const backendCall = () => axios.get(`${API_BASE_URL}/api/cc-list/${clientId}`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Get user profile to check access rights
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Profile not found');

      // Access control: clients can only access their own CC list
      if (profile.role === 'client' && profile.client_id !== clientId) {
        throw new Error('Access denied');
      }

      const { data, error } = await supabase
        .from('cc_list')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return { ccList: data || [] };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async createCCItem(clientId, formData) {
    const backendCall = () => axios.post(`${API_BASE_URL}/api/cc-list/${clientId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Get user profile for access control
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Profile not found');

      // Access control for clients
      if (profile.role === 'client' && profile.client_id !== clientId) {
        throw new Error('Access denied');
      }

      let mediaUrls = [];
      const files = formData.getAll('media');
      
      // Upload files to Supabase Storage if provided
      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = `${user.id}/cc-list/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('request-files')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });
          
          if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);
          
          const { data: urlData } = supabase.storage
            .from('request-files')
            .getPublicUrl(fileName);
          mediaUrls.push(urlData.publicUrl);
        }
      }

      const fileUrl = mediaUrls[0] || null;

      // Create CC list item
      const { data: ccItem, error: ccError } = await supabase
        .from('cc_list')
        .insert({
          client_id: clientId,
          title: formData.get('title'),
          description: formData.get('description'),
          content_type: formData.get('content_type') || 'post',
          requirements: formData.get('requirements') || '',
          priority: formData.get('priority') || 'medium',
          status: 'active',
          image_url: fileUrl,
          file_url: fileUrl,
          media_urls: mediaUrls.length ? mediaUrls : null,
          google_drive_link: formData.get('google_drive_link') || null,
          scheduled_date: formData.get('scheduled_date') || null,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (ccError) throw new Error(ccError.message);

      // Create corresponding request
      const { data: request, error: reqError } = await supabase
        .from('requests')
        .insert({
          client_id: clientId,
          from_user_id: user.id,
          message: formData.get('description'),
          content_type: formData.get('content_type') || 'post',
          status: 'pending_manager_review',
          cc_list_id: ccItem.id,
          image_url: fileUrl,
          file_url: fileUrl,
          media_urls: mediaUrls.length ? mediaUrls : null,
          google_drive_link: formData.get('google_drive_link') || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reqError) throw new Error(reqError.message);

      return { ccItem, request };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async updateCCItem(clientId, itemId, formData) {
    const backendCall = () => axios.put(`${API_BASE_URL}/api/cc-list/${clientId}/${itemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Get user profile for access control
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Profile not found');

      // Access control for clients
      if (profile.role === 'client' && profile.client_id !== clientId) {
        throw new Error('Access denied');
      }

      let mediaUrls = [];
      const files = formData.getAll('media');
      
      // Upload files to Supabase Storage if provided
      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = `${user.id}/cc-list/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('request-files')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });
          
          if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);
          
          const { data: urlData } = supabase.storage
            .from('request-files')
            .getPublicUrl(fileName);
          mediaUrls.push(urlData.publicUrl);
        }
      }

      const updateData = {
        title: formData.get('title'),
        description: formData.get('description'),
        content_type: formData.get('content_type'),
        requirements: formData.get('requirements'),
        priority: formData.get('priority'),
        status: formData.get('status'),
        updated_at: new Date().toISOString()
      };

      // Add file URLs if new files were uploaded
      if (mediaUrls.length > 0) {
        updateData.image_url = mediaUrls[0];
        updateData.file_url = mediaUrls[0];
        updateData.media_urls = mediaUrls;
      }

      // Add Google Drive link if provided
      const googleDriveLink = formData.get('google_drive_link');
      if (googleDriveLink !== undefined) {
        updateData.google_drive_link = googleDriveLink || null;
      }

      // Add scheduled date if provided
      const scheduledDate = formData.get('scheduled_date');
      if (scheduledDate !== undefined) {
        updateData.scheduled_date = scheduledDate || null;
      }

      const { data, error } = await supabase
        .from('cc_list')
        .update(updateData)
        .eq('id', itemId)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('CC item not found');

      return { ccItem: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async deleteCCItem(clientId, itemId) {
    const backendCall = () => axios.delete(`${API_BASE_URL}/api/cc-list/${clientId}/${itemId}`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Get user profile for access control
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Profile not found');

      // Access control for clients and editors
      if (profile.role === 'client' && profile.client_id !== clientId) {
        throw new Error('Access denied');
      }
      if (profile.role === 'editor') {
        throw new Error('Editors cannot delete CC items');
      }

      const { error } = await supabase
        .from('cc_list')
        .delete()
        .eq('id', itemId)
        .eq('client_id', clientId);

      if (error) throw new Error(error.message);

      return { message: 'CC item deleted successfully' };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  // User Services
  async getClients() {
    const backendCall = () => axios.get(`${API_BASE_URL}/api/users/clients`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);

      return { clients: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async getUsers() {
    const backendCall = () => axios.get(`${API_BASE_URL}/api/users`);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
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

      if (error) throw new Error(error.message);

      return { users: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }

  async updateUser(userId, userData) {
    const backendCall = () => axios.put(`${API_BASE_URL}/api/users/${userId}`, userData);
    
    const supabaseCall = async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const user = await this.getCurrentUserForFallback();

      // Get user profile to check permissions
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Profile not found');

      // Users can only update their own profile unless they're a manager
      if (profile.role !== 'manager' && user.id !== userId) {
        throw new Error('Access denied');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          email: userData.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('User not found');

      return { user: data };
    };

    return this.makeRequest(backendCall, supabaseCall);
  }
}

export default new ApiService();
