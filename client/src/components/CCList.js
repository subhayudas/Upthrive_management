import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, FileText, Calendar, Clock, Star, Zap, Target, X, Eye, Upload } from 'lucide-react'; // Add X, Eye, and Upload icons
import toast from 'react-hot-toast';
import apiService from '../services/apiService';

const CCList = () => {
  const { user, isManager, isEditor } = useAuth();
  const [ccList, setCcList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Add state for selected item
  const [showDetailModal, setShowDetailModal] = useState(false); // Add state for detail modal
  const [editingItem, setEditingItem] = useState(null); // Add state for editing item
  const [showEditForm, setShowEditForm] = useState(false); // Add state for edit form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'post',
    requirements: '',
    priority: 'medium',
    status: 'active',
    google_drive_link: '',
    scheduled_date: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'editor') {
      console.log('User is manager/editor, fetching clients first...');
      fetchClients();
    } else if (user?.role === 'client') {
      console.log('User is client, fetching CC list directly...');
      fetchCCList();
    }
  }, [user?.role]); // Make sure user.role is available

  // Update the fetchClients function (around line 25)
  const fetchClients = async () => {
    try {
      console.log('Fetching clients...'); // Debug log
      
      // Use the dedicated clients endpoint instead of general users endpoint
      const result = await apiService.getClients();
      console.log('Clients response:', result); // Debug log
      
      if (result.success) {
        const clientData = result.data.clients;
        console.log('Client data:', clientData); // Debug log
      
        // Map the client data properly
        const mappedClients = clientData.map(client => ({
          client_id: client.client_id || client.id, // Use client_id if available, otherwise use id
          name: client.name,
          email: client.email,
          id: client.id
        }));
        
        console.log('Mapped clients:', mappedClients); // Debug log
        setClients(mappedClients);
        
        if (mappedClients.length > 0) {
          setSelectedClient(mappedClients[0].client_id);
          console.log('Selected first client:', mappedClients[0].client_id); // Debug log
        } else {
          console.log('No clients found'); // Debug log
          toast.info('No clients available in the system');
        }
        
        if (result.source === 'supabase') {
          console.log('✅ Clients loaded using Supabase fallback');
        }
      } else {
        console.error('Error fetching clients:', result.error);
        toast.error('Failed to load clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const fetchCCList = async () => {
    try {
      let clientId;
      console.log('Fetching CC list...'); // Debug log
      
      setLoading(true);
      
      if (user.role === 'client') {
        clientId = user.client_id;
      } else if (user.role === 'manager' || user.role === 'editor') {
        clientId = selectedClient;
      }
      
      if (!clientId) {
        console.error('Client ID not found');
        toast.error('Client ID not found');
        return;
      }
      
      const result = await apiService.getCCList(clientId);
      
      if (result.success) {
        console.log('CC List response:', result.data);
        console.log('First item media_urls:', result.data.ccList[0]?.media_urls);
        console.log('First item image_url:', result.data.ccList[0]?.image_url);
        setCcList(result.data.ccList);
        
        if (result.source === 'supabase') {
          console.log('✅ CC List loaded using Supabase fallback');
        }
      } else {
        console.error('Error fetching CC list:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error fetching CC list:', error);
      console.error('Error response:', error.response?.data);
      
      // More specific error messages
      if (error.response?.status === 403) {
        toast.error('Access denied. Please contact your manager.');
      } else if (error.response?.status === 404) {
        toast.error('Client not found.');
      } else {
        toast.error('Failed to load CC list');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const maxSize = 100 * 1024 * 1024;
    const valid = [];
    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`${file.name}: must be < 100MB`);
        continue;
      }
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        valid.push(file);
      } else {
        toast.error(`${file.name}: invalid type`);
      }
    }
    if (valid.length) {
      // Append to existing files instead of replacing
      setSelectedFiles(prev => [...prev, ...valid]);
      toast.success(`Selected ${valid.length} file(s)`);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setShowCreateForm(false);
    
    try {
      let clientId;
      console.log('Creating CC item...'); // Debug log
      
      if (user.role === 'client') {
        clientId = user.client_id || user.id;
      } else if (user.role === 'manager') {
        clientId = selectedClient;
      }
      
      if (!clientId) {
        console.error('Client ID not found');
        toast.error('Client ID not found');
        return;
      }
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('content_type', formData.content_type);
      formDataToSend.append('requirements', formData.requirements);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('google_drive_link', formData.google_drive_link);
      formDataToSend.append('scheduled_date', formData.scheduled_date);
      
      if (selectedFiles.length) {
        selectedFiles.forEach(file => formDataToSend.append('media', file));
      }

      const result = await apiService.createCCItem(clientId, formDataToSend);
      
      if (result.success) {
        toast.success(`CC item created successfully! ${result.source === 'supabase' ? '(Using direct connection)' : ''}`);
        setSelectedFiles([]);
        fetchCCList();
      } else {
        toast.error(result.error || 'Failed to create CC item');
      }
    } catch (error) {
      console.error('Error creating CC item:', error);
      toast.error('Failed to create CC item');
    }
  };

  // Update the handleDelete function (around line 135)
  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      let clientId;
      console.log('Deleting CC item...'); // Debug log
      console.log('User role:', user.role); // Debug log
      console.log('Selected client:', selectedClient); // Debug log
      console.log('User client_id:', user.client_id); // Debug log
      
      // Determine clientId based on user role - SAME LOGIC AS fetchCCList
      if (user.role === 'client') {
        clientId = user.client_id || user.id;
      } else if (user.role === 'manager' || user.role === 'editor') {
        clientId = selectedClient; // Use selectedClient for managers/editors
      }
      
      console.log('Using clientId for delete:', clientId); // Debug log
      
      if (!clientId) {
        toast.error('Client ID not found');
        return;
      }
      
      console.log('DELETE URL:', `/api/cc-list/${clientId}/${itemId}`); // Debug log
      
      const result = await apiService.deleteCCItem(clientId, itemId);
      console.log('Delete response:', result); // Debug log
      
      if (result.success) {
        toast.success(`CC item deleted successfully! ${result.source === 'supabase' ? '(Using direct connection)' : ''}`);
        fetchCCList(); // Refresh the list after deletion
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting CC item:', error);
      console.error('Error response:', error.response?.data); // More detailed error logging
      
      if (error.response?.status === 403) {
        toast.error('Access denied. You cannot delete this item.');
      } else if (error.response?.status === 404) {
        toast.error('Item not found or already deleted.');
      } else {
        toast.error('Failed to delete CC item');
      }
    }
  };

  // Add function to handle item click
  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // Add function to close detail modal
  const closeDetailModal = () => {
    setSelectedItem(null);
    setShowDetailModal(false);
  };

  // Add function to handle edit
  const handleEdit = (item) => {
    console.log('🔧 Edit button clicked for item:', item.id, item.title);
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      content_type: item.content_type,
      requirements: item.requirements || '',
      priority: item.priority,
      status: item.status,
      google_drive_link: item.google_drive_link || '',
      scheduled_date: item.scheduled_date ? new Date(item.scheduled_date).toISOString().slice(0, 16) : ''
    });
    setSelectedFiles([]); // Clear selected files for edit
    setShowEditForm(true);
    setShowDetailModal(false); // Close detail modal if open
    console.log('✅ Edit form should now be visible');
  };

  // Add function to handle update
  const handleUpdate = async (e) => {
    e.preventDefault();
    console.log('🔄 Update form submitted for item:', editingItem?.id);
    console.log('📝 Form data:', formData);
    setShowEditForm(false);
    
    try {
      let clientId;
      console.log('Updating CC item...'); // Debug log
      
      if (user.role === 'client') {
        clientId = user.client_id || user.id;
      } else if (user.role === 'manager' || user.role === 'editor') {
        clientId = selectedClient;
      }
      
      if (!clientId) {
        console.error('Client ID not found');
        toast.error('Client ID not found');
        return;
      }
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('content_type', formData.content_type);
      formDataToSend.append('requirements', formData.requirements);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('google_drive_link', formData.google_drive_link);
      formDataToSend.append('scheduled_date', formData.scheduled_date);
      
      if (selectedFiles.length) {
        selectedFiles.forEach(file => formDataToSend.append('media', file));
      }

      const result = await apiService.updateCCItem(clientId, editingItem.id, formDataToSend);
      
      if (result.success) {
        console.log('✅ CC item updated successfully:', result);
        toast.success(`CC item updated successfully! ${result.source === 'supabase' ? '(Using direct connection)' : ''}`);
        setSelectedFiles([]);
        setEditingItem(null);
        fetchCCList();
      } else {
        console.error('❌ Failed to update CC item:', result.error);
        toast.error(result.error || 'Failed to update CC item');
      }
    } catch (error) {
      console.error('Error updating CC item:', error);
      toast.error('Failed to update CC item');
    }
  };

  // Add function to cancel edit
  const cancelEdit = () => {
    setShowEditForm(false);
    setEditingItem(null);
    setSelectedFiles([]);
    setFormData({
      title: '',
      description: '',
      content_type: 'post',
      requirements: '',
      priority: 'medium',
      status: 'active',
      google_drive_link: '',
      scheduled_date: ''
    });
  };

  // Add this useEffect for debugging client users
  useEffect(() => {
  console.log('=== CC LIST CLIENT DEBUG ===');
  console.log('Current user:', user);
  console.log('User role:', user?.role);
  console.log('User client_id:', user?.client_id);
  console.log('User id:', user?.id);
  if (user.role === 'client') {
    console.log('Selected Client:', selectedClient);
  }
  console.log('CC List length:', ccList.length);
  console.log('showEditForm:', showEditForm);
  console.log('editingItem:', editingItem);
  console.log('============================');
  }, [user, selectedClient, ccList, showEditForm, editingItem]);

  // Add another useEffect to fetch CC list when selectedClient changes
  useEffect(() => {
    if (selectedClient && (user?.role === 'manager' || user?.role === 'editor')) {
      console.log('Selected client changed, fetching CC list for:', selectedClient);
      fetchCCList();
    }
  }, [selectedClient]);

  // Content type icons and colors
  const getContentTypeStyle = (type) => {
    const styles = {
      post: { 
        icon: FileText, 
        gradient: 'from-gray-700 to-gray-900',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700'
      },
      reel: { 
        icon: Zap, 
        gradient: 'from-gray-600 to-gray-800',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700'
      },
      story: { 
        icon: Clock, 
        gradient: 'from-gray-500 to-gray-700',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700'
      }
    };
    return styles[type] || styles.post;
  };

  // Priority styles
  const getPriorityStyle = (priority) => {
    const styles = {
      high: { 
        bg: 'bg-black', 
        text: 'text-white',
        icon: Target,
        glow: 'shadow-gray-200'
      },
      medium: { 
        bg: 'bg-gray-600', 
        text: 'text-white',
        icon: Star,
        glow: 'shadow-gray-200'
      },
      low: { 
        bg: 'bg-gray-400', 
        text: 'text-white',
        icon: Calendar,
        glow: 'shadow-gray-200'
      }
    };
    return styles[priority] || styles.medium;
  };

  // Get status style function
  const getStatusStyle = (status) => {
    const styles = {
      active: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-700',
        icon: '🔵',
        badge: 'bg-gray-600'
      },
      scheduled: { 
        bg: 'bg-gray-200', 
        text: 'text-gray-800',
        icon: '⏰',
        badge: 'bg-gray-500'
      },
      completed: { 
        bg: 'bg-gray-300', 
        text: 'text-gray-900',
        icon: '🎉',
        badge: 'bg-black'
      }
    };
    return styles[status] || styles.active;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-gray-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading your content calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section - No Shadows */}
        <div className="mb-6 md:mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl border border-gray-200/60 p-4 md:p-8">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Content Calendar
                </h1>
                <p className="text-slate-600 mt-1 md:mt-2 font-medium text-sm md:text-base">
                  Plan and organize your social media content strategy
                </p>
              </div>
              {(isManager || user.role === 'client') && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="self-start group relative bg-black hover:bg-gray-800 text-white font-semibold py-2 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 text-sm md:text-base"
                >
                  <Plus className="h-4 w-4 md:h-5 md:w-5 group-hover:rotate-90 transition-transform duration-200" />
                  Add Content
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Create Form - No Shadows */}
        {showCreateForm && (
          <div className="mb-8 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Create New Content</h3>
              </div>
              
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Content Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your content title..."
                      required
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      rows="3"
                      placeholder="Describe your content idea..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Content Type</label>
                    <select
                      value={formData.content_type}
                      onChange={(e) => setFormData({...formData, content_type: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="post">📝 Social Post</option>
                      <option value="reel">⚡ Reel/Video</option>
                      <option value="story">⏰ Story</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Priority Level</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="low">🟢 Low Priority</option>
                      <option value="medium">🟡 Medium Priority</option>
                      <option value="high">🔴 High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="active">✅ Active</option>
                      <option value="inactive">⏸️ Inactive</option>
                      <option value="completed">🎉 Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Scheduled Date</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Requirements & Notes</label>
                    <textarea
                      value={formData.requirements}
                      onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      rows="2"
                      placeholder="Any specific requirements or additional notes..."
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Google Drive Link (Optional)</label>
                    <input
                      type="url"
                      value={formData.google_drive_link}
                      onChange={(e) => setFormData({...formData, google_drive_link: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Media (Optional)</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-400 transition-colors">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        id="media-upload"
                      />
                      <label htmlFor="media-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-slate-600 font-medium">
                            {selectedFiles.length ? `${selectedFiles.length} file(s) selected` : 'Click to upload images or videos'}
                          </p>
                          <p className="text-slate-500 text-sm mt-1">
                            Supports: JPG, PNG, GIF, MP4, MOV, AVI, WEBM (Max 100MB)
                          </p>
                        </div>
                      </label>
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-left">
                        <p className="text-green-700 text-sm font-semibold">Selected files:</p>
                        <ul className="text-green-700 text-sm list-disc pl-5">
                          {selectedFiles.map((f, i) => (
                            <li key={i}>✓ {f.name} ({(f.size / (1024 * 1024)).toFixed(2)}MB)</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-xl transform hover:scale-105 transition-all duration-200"
                  >
                    Create Content Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Form - No Shadows */}
        {showEditForm && editingItem && (
          <div className="mb-8 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Edit className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Edit Content - {editingItem.title}</h3>
              </div>
              
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Content Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your content title..."
                      required
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      rows="3"
                      placeholder="Describe your content idea..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Content Type</label>
                    <select
                      value={formData.content_type}
                      onChange={(e) => setFormData({...formData, content_type: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="post">📝 Social Post</option>
                      <option value="reel">⚡ Reel/Video</option>
                      <option value="story">⏰ Story</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Priority Level</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="low">🟢 Low Priority</option>
                      <option value="medium">🟡 Medium Priority</option>
                      <option value="high">🔴 High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="active">✅ Active</option>
                      <option value="inactive">⏸️ Inactive</option>
                      <option value="completed">🎉 Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Scheduled Date</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Requirements & Notes</label>
                    <textarea
                      value={formData.requirements}
                      onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      rows="2"
                      placeholder="Any specific requirements or additional notes..."
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Google Drive Link (Optional)</label>
                    <input
                      type="url"
                      value={formData.google_drive_link}
                      onChange={(e) => setFormData({...formData, google_drive_link: e.target.value})}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Upload New Media (Optional)</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-400 transition-colors">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        id="edit-media-upload"
                      />
                      <label htmlFor="edit-media-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-slate-600 font-medium">
                            {selectedFiles.length ? `${selectedFiles.length} file(s) selected` : 'Click to upload new images or videos'}
                          </p>
                          <p className="text-slate-500 text-sm mt-1">
                            Supports: JPG, PNG, GIF, MP4, MOV, AVI, WEBM (Max 100MB)
                          </p>
                          <p className="text-slate-400 text-xs mt-2">
                            Note: New files will replace existing media
                          </p>
                        </div>
                      </label>
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-left">
                        <p className="text-green-700 text-sm font-semibold">Selected files:</p>
                        <ul className="text-green-700 text-sm list-disc pl-5">
                          {selectedFiles.map((f, i) => (
                            <li key={i}>✓ {f.name} ({(f.size / (1024 * 1024)).toFixed(2)}MB)</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transform hover:scale-105 transition-all duration-200"
                  >
                    Update Content Item
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Client Selection - No Shadows */}
        {(isManager || isEditor) && (
          <div className="mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Select Client
              </label>
              <select
                value={selectedClient || ''}
                onChange={(e) => {
                  console.log('Client selection changed to:', e.target.value);
                  setSelectedClient(e.target.value);
                }}
                className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                disabled={clients.length === 0}
              >
                <option value="">
                  {clients.length === 0 ? '⏳ Loading clients...' : '👤 Select a client...'}
                </option>
                {clients.map(client => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="text-sm text-slate-500 mt-2 italic">
                  No clients available. Make sure client users exist in the system.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content Calendar Grid - Mobile Safe */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 pb-24 md:pb-0">
          {ccList.map(item => {
            const contentStyle = getContentTypeStyle(item.content_type);
            const priorityStyle = getPriorityStyle(item.priority);
            const statusStyle = getStatusStyle(item.status);
            const ContentIcon = contentStyle.icon;
            const PriorityIcon = priorityStyle.icon;

            return (
              <div 
                key={item.id} 
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/60 p-4 sm:p-6 transform transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                onClick={() => handleViewDetails(item)} // ✅ Changed from openDetailModal to handleViewDetails
              >
                {/* Header with Content Type */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${contentStyle.gradient} rounded-xl flex items-center justify-center`}>
                      <ContentIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{item.title}</h3>
                      <span className={`text-sm font-bold uppercase tracking-wider ${contentStyle.text}`}>
                        {item.content_type}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`w-3 h-3 ${statusStyle.badge} rounded-full`}></div>
                </div>

                {/* Description */}
                <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Priority and Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${priorityStyle.bg} ${priorityStyle.text} rounded-lg text-xs font-bold`}>
                    <PriorityIcon className="w-3 h-3" />
                    {item.priority}
                  </div>
                  
                  <div className={`inline-flex items-center gap-1 px-2 py-1 ${statusStyle.bg} ${statusStyle.text} rounded-md text-xs font-medium`}>
                    <span>{statusStyle.icon}</span>
                    {item.status}
                  </div>
                </div>

                {/* Requirements preview */}
                {item.requirements && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 line-clamp-1">
                      <span className="font-medium">Requirements:</span> {item.requirements}
                    </p>
                  </div>
                )}

                {/* Media preview */}
                {(item.media_urls && item.media_urls.length > 0) ? (
                  <div className="mb-4">
                    <div className="relative">
                      {/* Show first media file as preview */}
                      {item.media_urls[0].match(/\.(mp4|mov|avi|webm)$/i) ? (
                        <div className="relative">
                          <video 
                            className="w-full h-24 object-cover rounded-lg"
                            muted
                            onMouseOver={(e) => e.target.play()}
                            onMouseOut={(e) => e.target.pause()}
                          >
                            <source src={item.media_urls[0]} type="video/mp4" />
                          </video>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-50 rounded-full p-1">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={item.media_urls[0]} 
                          alt="Media preview" 
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      )}
                      <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {item.media_urls.length > 1 ? `📎 ${item.media_urls.length}` : '📎'}
                      </div>
                    </div>
                  </div>
                ) : (item.image_url || item.file_url) && (
                  <div className="mb-4">
                    <div className="relative">
                      {(item.image_url || item.file_url).includes('.mp4') || 
                       (item.image_url || item.file_url).includes('.mov') || 
                       (item.image_url || item.file_url).includes('.avi') || 
                       (item.image_url || item.file_url).includes('.webm') ? (
                        <div className="relative">
                          <video 
                            className="w-full h-24 object-cover rounded-lg"
                            muted
                            onMouseOver={(e) => e.target.play()}
                            onMouseOut={(e) => e.target.pause()}
                          >
                            <source src={item.image_url || item.file_url} type="video/mp4" />
                          </video>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-50 rounded-full p-1">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={item.image_url || item.file_url} 
                          alt="Media preview" 
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      )}
                      <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        📎
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Drive link indicator */}
                {item.google_drive_link && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Google Drive:</span>
                      <span className="truncate">{item.google_drive_link}</span>
                    </div>
                  </div>
                )}

                {/* Scheduled Date */}
                {item.scheduled_date && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 rounded-lg p-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Scheduled:</span>
                      <span>{new Date(item.scheduled_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                )}

                {/* Footer with Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        handleViewDetails(item);
                      }}
                      className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {(isManager || isEditor || user.role === 'client') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          console.log('🖱️ Edit button clicked from card for item:', item.id);
                          handleEdit(item);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Edit Item"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    
                    {(isManager || user.role === 'client') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleDelete(item.id);
                        }}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Delete Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Modal - No Shadows */}
        {showDetailModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-300">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getContentTypeStyle(selectedItem.content_type).gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                    {React.createElement(getContentTypeStyle(selectedItem.content_type).icon, { className: "h-6 w-6 text-white" })}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedItem.title}</h2>
                    <span className={`text-sm font-bold uppercase tracking-wider ${getContentTypeStyle(selectedItem.content_type).text}`}>
                      {selectedItem.content_type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-xl flex items-center justify-center transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Status</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 ${getStatusStyle(selectedItem.status).bg} ${getStatusStyle(selectedItem.status).text} rounded-lg text-sm font-bold`}>
                      <span>{getStatusStyle(selectedItem.status).icon}</span>
                      {selectedItem.status}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Priority</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 ${getPriorityStyle(selectedItem.priority).bg} ${getPriorityStyle(selectedItem.priority).text} rounded-lg text-sm font-bold`}>
                      {React.createElement(getPriorityStyle(selectedItem.priority).icon, { className: "w-4 h-4" })}
                      {selectedItem.priority}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Description</h4>
                  <p className="text-gray-800 leading-relaxed">{selectedItem.description}</p>
                </div>

                {/* Requirements */}
                {selectedItem.requirements && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-3">Requirements & Notes</h4>
                    <p className="text-blue-800 leading-relaxed">{selectedItem.requirements}</p>
                  </div>
                )}

                {/* Google Drive Link */}
                {selectedItem.google_drive_link && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-green-700 mb-3">Google Drive Link</h4>
                    <a 
                      href={selectedItem.google_drive_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-800 underline hover:text-green-600 transition-colors"
                    >
                      {selectedItem.google_drive_link}
                    </a>
                  </div>
                )}

                {/* Scheduled Date */}
                {selectedItem.scheduled_date && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-3">📅 Scheduled Date</h4>
                    <p className="text-blue-800 font-medium">
                      {new Date(selectedItem.scheduled_date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}

                {/* Media Display */}
                {(selectedItem.media_urls && selectedItem.media_urls.length > 0) ? (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-purple-700 mb-3">📎 Attached Media</h4>
                    <div className="flex flex-wrap gap-4">
                      {selectedItem.media_urls.map((url, idx) => (
                        url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                          <video 
                            key={idx}
                            controls 
                            className="max-w-xs h-auto rounded-lg shadow-md border-2 border-purple-200"
                            style={{ maxHeight: '300px' }}
                          >
                            <source src={url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <img 
                            key={idx}
                            src={url}
                            alt={`CC item media ${idx + 1}`}
                            className="max-w-xs h-auto rounded-lg shadow-md border-2 border-purple-200"
                            style={{ maxHeight: '300px' }}
                          />
                        )
                      ))}
                    </div>
                  </div>
                ) : (
                  (selectedItem.image_url || selectedItem.file_url) && (
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-purple-700 mb-3">📎 Attached Media</h4>
                      <div className="relative">
                        {(selectedItem.image_url || selectedItem.file_url).includes('.mp4') || 
                         (selectedItem.image_url || selectedItem.file_url).includes('.mov') || 
                         (selectedItem.image_url || selectedItem.file_url).includes('.avi') || 
                         (selectedItem.image_url || selectedItem.file_url).includes('.webm') ? (
                          <video 
                            controls 
                            className="max-w-full h-auto rounded-lg shadow-md border-2 border-purple-200"
                            style={{ maxHeight: '300px' }}
                          >
                            <source src={selectedItem.image_url || selectedItem.file_url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <img 
                            src={selectedItem.image_url || selectedItem.file_url} 
                            alt="CC item media" 
                            className="max-w-full h-auto rounded-lg shadow-md border-2 border-purple-200"
                            style={{ maxHeight: '300px' }}
                          />
                        )}
                        <p className="text-xs text-purple-600 mt-1">Media file attached to this content item</p>
                      </div>
                    </div>
                  )
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Created</h4>
                    <p className="text-gray-600">{new Date(selectedItem.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Last Updated</h4>
                    <p className="text-gray-600">{new Date(selectedItem.updated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {(isManager || isEditor || user.role === 'client') && (
                    <button
                      onClick={() => {
                        console.log('🖱️ Edit button clicked from modal for item:', selectedItem?.id);
                        handleEdit(selectedItem);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
                    >
                      Edit Item
                    </button>
                  )}
                  {(isManager || user.role === 'client') && (
                    <button
                      onClick={() => {
                        handleDelete(selectedItem.id);
                        closeDetailModal();
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
                    >
                      Delete Item
                    </button>
                  )}
                  <button
                    onClick={closeDetailModal}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - No Shadows */}
        {ccList.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-slate-300 to-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                No content yet
              </h3>
              <p className="text-slate-600 mb-6">
                {isManager ? 'Create your first content calendar item to get started with planning.' : 'No content calendar items have been created yet.'}
              </p>
              {(isManager || user.role === 'client') && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                >
                  Create First Item
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CCList;