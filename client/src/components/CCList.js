import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const CCList = () => {
  const { user } = useAuth();

  // Make sure isEditor is properly defined
  const isManager = user?.role === 'manager';
  const isEditor = user?.role === 'editor';
  const isClient = user?.role === 'client';

  console.log('Auth Context Debug:');
  console.log('User:', user);
  console.log('isManager:', isManager);
  console.log('isEditor:', isEditor);
  console.log('isClient:', isClient);

  const [ccList, setCcList] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'post',
    requirements: '',
    priority: 'medium'
  });

  // Check if user can manage CC items (managers, editors, or clients for their own account)
  const canManageCC = isManager || isEditor || user?.role === 'client';

  // Set up axios defaults
  useEffect(() => {
    if (process.env.REACT_APP_API_URL) {
      axios.defaults.baseURL = process.env.REACT_APP_API_URL;
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Initialize data fetching
  useEffect(() => {
    if (isManager || isEditor) { // ADD isEditor here
      fetchClients();
    } else if (user?.role === 'client') {
      // For clients, use their user ID as the clientId
      const clientId = user?.clientId || user?.id;
      console.log('Setting client ID for client user:', clientId);
      
      if (clientId) {
        setSelectedClientId(clientId);
        fetchCCList(clientId);
      } else {
        console.error('No client ID found for client user:', user);
        toast.error('Client ID not found. Please contact support.');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user, isManager, isEditor]); // ADD isEditor to dependency array

  // Fetch CC list when client is selected
  useEffect(() => {
    if (selectedClientId && (isManager || isEditor)) { // ADD isEditor here
      fetchCCList(selectedClientId);
    }
  }, [selectedClientId, isManager, isEditor]); // ADD isEditor to dependency array

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data);
      if (response.data.length > 0) {
        setSelectedClientId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  // Update the fetchCCList function with more debugging
  const fetchCCList = async (clientId) => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('=== FETCH CC LIST DEBUG ===');
      console.log('Current user:', user);
      console.log('User role:', user?.role);
      console.log('Is Editor:', isEditor);
      console.log('Is Manager:', isManager);
      console.log('Fetching CC list for client:', clientId);
      console.log('Request URL:', `/api/cclist/${clientId}`);
      console.log('============================');
      
      const response = await axios.get(`/api/cclist/${clientId}`);
      console.log('CC list response:', response.data);
      setCcList(response.data);
    } catch (error) {
      console.error('Error fetching CC list:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      toast.error(error.response?.data?.error || 'Failed to load CC list');
      setCcList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const targetClientId = (isManager || isEditor) ? selectedClientId : (user?.clientId || user?.id); // ADD isEditor
    
    if (!targetClientId) {
      toast.error('Please select a client');
      return;
    }

    try {
      await axios.post(`/api/cclist/${targetClientId}`, formData);
      toast.success('CC item created successfully!');
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        content_type: 'post',
        requirements: '',
        priority: 'medium'
      });
      fetchCCList(targetClientId);
    } catch (error) {
      console.error('Error creating CC item:', error);
      toast.error(error.response?.data?.error || 'Failed to create CC item');
    }
  };

  // Update handleDelete to prevent editors from calling delete
  const handleDelete = async (itemId) => {
    // ADDED: Prevent editors from deleting
    if (isEditor) {
      toast.error('Editors are not allowed to delete CC items');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    const targetClientId = isManager ? selectedClientId : (user?.clientId || user?.id);
    
    console.log('=== DELETE DEBUG ===');
    console.log('User role:', user?.role);
    console.log('Target client ID:', targetClientId);
    console.log('Item ID:', itemId);
    console.log('Is Manager:', isManager);
    console.log('Is Editor:', isEditor);
    console.log('Selected Client ID:', selectedClientId);
    console.log('===================');
    
    if (!targetClientId) {
      toast.error('Client ID not found');
      return;
    }
    
    try {
      await axios.delete(`/api/cclist/${targetClientId}/${itemId}`);
      toast.success('CC item deleted successfully!');
      fetchCCList(targetClientId);
    } catch (error) {
      console.error('Error deleting CC item:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(error.response?.data?.error || 'Failed to delete CC item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
        {canManageCC && selectedClientId && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Item
          </button>
        )}
      </div>

      {/* Client Selector for Managers and Editors */}
      {(isManager || isEditor) && ( // ADD isEditor here
        <div className="card">
          <div className="flex items-center space-x-4">
            <label className="block text-sm font-medium text-gray-700">Select Client:</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="input-field flex-1 max-w-md"
            >
              <option value="">Choose a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.company_name || client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Show content only if client is selected */}
      {!selectedClientId && (isManager || isEditor) && ( // ADD isEditor here
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client</h3>
          <p className="text-gray-500">
            Please select a client to view and manage their content calendar.
          </p>
        </div>
      )}

      {selectedClientId && (
        <>
          {/* Create Form */}
          {showCreateForm && canManageCC && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Create New CC Item</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="input-field"
                    rows="3"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content Type</label>
                    <select
                      value={formData.content_type}
                      onChange={(e) => setFormData({...formData, content_type: e.target.value})}
                      className="input-field"
                    >
                      <option value="post">Post</option>
                      <option value="reel">Reel</option>
                      <option value="story">Story</option>
                      <option value="carousel">Carousel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="input-field"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Requirements</label>
                  <textarea
                    value={formData.requirements}
                    onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                    className="input-field"
                    rows="2"
                  />
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary">
                    Create Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CC List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ccList.map((item) => (
              <div key={item.id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="text-sm font-medium text-gray-500 uppercase">
                      {item.content_type}
                    </span>
                  </div>
                  <span className={`status-badge ${
                    item.priority === 'high' ? 'bg-red-100 text-red-800' :
                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {item.priority}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                {item.requirements && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Requirements:</p>
                    <p className="text-xs text-gray-600">{item.requirements}</p>
                  </div>
                )}
                {/* UPDATED: Only managers and clients can delete, NOT editors */}
                {(isManager || (isClient && user?.clientId === selectedClientId)) && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {ccList.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No CC items yet</h3>
              <p className="text-gray-500">
                {canManageCC ? 'Create your first content calendar item to get started.' : 'No content calendar items have been created yet.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CCList;