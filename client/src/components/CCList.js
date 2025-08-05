import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
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
    priority: 'medium'
  });

  useEffect(() => {
    fetchCCList();
  }, []);

  const fetchCCList = async () => {
    try {
      const response = await axios.get(`/api/cc-list/${user.clientId}`);
      setCcList(response.data.ccList);
    } catch (error) {
      console.error('Error fetching CC list:', error);
      toast.error('Failed to load CC list');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/cc-list/${user.clientId}`, formData);
      toast.success('CC item created successfully!');
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        content_type: 'post',
        requirements: '',
        priority: 'medium'
      });
      fetchCCList();
    } catch (error) {
      console.error('Error creating CC item:', error);
      toast.error('Failed to create CC item');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await axios.delete(`/api/cc-list/${user.clientId}/${itemId}`);
      toast.success('CC item deleted successfully!');
      fetchCCList();
    } catch (error) {
      console.error('Error deleting CC item:', error);
      toast.error('Failed to delete CC item');
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
        {isManager && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Item
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
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
            {isManager && (
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
            {isManager ? 'Create your first content calendar item to get started.' : 'No content calendar items have been created yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CCList; 