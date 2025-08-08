import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, Edit, Trash2, FileText, Calendar, Clock, Star, Zap, Target } from 'lucide-react';
import toast from 'react-hot-toast';

const CCList = () => {
  const { user, isManager, isEditor } = useAuth();
  const [ccList, setCcList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'post',
    requirements: '',
    priority: 'medium',
    status: 'active'
  });
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
      const response = await axios.get('/api/users/clients');
      console.log('Clients response:', response.data); // Debug log
      
      const clientData = response.data.clients;
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
    } catch (error) {
      console.error('Error fetching clients:', error);
      console.error('Error response:', error.response?.data);
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
      
      const response = await axios.get(`/api/cc-list/${clientId}`);
      console.log('CC List response:', response.data);
      setCcList(response.data.ccList);
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
      
      await axios.post(`/api/cc-list/${clientId}`, formData);
      toast.success('CC item created successfully!');
      fetchCCList();
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
      
      const response = await axios.delete(`/api/cc-list/${clientId}/${itemId}`);
      console.log('Delete response:', response.data); // Debug log
      
      toast.success('CC item deleted successfully!');
      fetchCCList(); // Refresh the list after deletion
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
    console.log('============================');
  }, [user, selectedClient, ccList]);

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
        gradient: 'from-blue-500 to-indigo-600',
        bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        border: 'border-blue-200',
        text: 'text-blue-700'
      },
      reel: { 
        icon: Zap, 
        gradient: 'from-purple-500 to-pink-600',
        bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
        border: 'border-purple-200',
        text: 'text-purple-700'
      },
      story: { 
        icon: Clock, 
        gradient: 'from-orange-500 to-red-600',
        bg: 'bg-gradient-to-br from-orange-50 to-red-50',
        border: 'border-orange-200',
        text: 'text-orange-700'
      }
    };
    return styles[type] || styles.post;
  };

  // Priority styles
  const getPriorityStyle = (priority) => {
    const styles = {
      high: { 
        bg: 'bg-gradient-to-r from-red-500 to-rose-600', 
        text: 'text-white',
        icon: Target,
        glow: 'shadow-red-200'
      },
      medium: { 
        bg: 'bg-gradient-to-r from-amber-500 to-orange-600', 
        text: 'text-white',
        icon: Star,
        glow: 'shadow-amber-200'
      },
      low: { 
        bg: 'bg-gradient-to-r from-emerald-500 to-teal-600', 
        text: 'text-white',
        icon: Calendar,
        glow: 'shadow-emerald-200'
      }
    };
    return styles[priority] || styles.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading your content calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Content Calendar
                </h1>
                <p className="text-slate-600 mt-2 font-medium">
                  Plan, organize, and track your content strategy
                </p>
              </div>
              {(isManager || user.role === 'client') && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                  Create Content
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-200"></div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8">
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
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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

        {/* Client Selection */}
        {(isManager || isEditor) && (
          <div className="mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
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

        {/* Content Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {ccList.map((item) => {
            const contentStyle = getContentTypeStyle(item.content_type);
            const priorityStyle = getPriorityStyle(item.priority);
            const ContentIcon = contentStyle.icon;
            const PriorityIcon = priorityStyle.icon;

            return (
              <div 
                key={item.id} 
                className={`group relative ${contentStyle.bg} ${contentStyle.border} border-2 rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden`}
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                  <ContentIcon className="w-full h-full" />
                </div>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${contentStyle.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                      <ContentIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${contentStyle.text}`}>
                        {item.content_type}
                      </span>
                    </div>
                  </div>
                  
                  {/* Priority Badge */}
                  <div className={`flex items-center gap-1 px-3 py-1 ${priorityStyle.bg} ${priorityStyle.text} rounded-full text-xs font-bold shadow-lg ${priorityStyle.glow} shadow-lg`}>
                    <PriorityIcon className="w-3 h-3" />
                    {item.priority}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-slate-900 transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                  
                  {item.requirements && (
                    <div className="bg-white/60 rounded-lg p-3 border border-white/40">
                      <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                        Requirements
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.requirements}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/30">
                  <div className="text-xs text-slate-500 font-medium">
                    Created {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  
                  {(isManager || user.role === 'client') && ( // Editors should NOT see delete button
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-lg flex items-center justify-center transition-all duration-200 transform hover:scale-110"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {ccList.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 max-w-md mx-auto">
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
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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