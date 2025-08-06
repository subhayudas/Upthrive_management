import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, MessageSquare, Upload, Eye, PlusCircle, Clock, CheckCircle, XCircle, AlertCircle, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import AssignRequestModal from './AssignRequestModal';
import ManagerReviewModal from './ManagerReviewModal';
import ClientReviewModal from './ClientReviewModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Requests = () => {
  const { user, isClient, isManager, isEditor } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    content_type: 'post',
    requirements: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
  const [clientReviewModalOpen, setClientReviewModalOpen] = useState(false);
  const [selectedRequestForClientReview, setSelectedRequestForClientReview] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/requests/my-requests`);
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('message', formData.message);
      formDataToSend.append('content_type', formData.content_type);
      formDataToSend.append('requirements', formData.requirements);
      
      if (selectedFile) {
        formDataToSend.append('image', selectedFile);
      }

      await axios.post(`${API_BASE_URL}/api/requests`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      toast.success('Request created successfully!');
      setShowCreateForm(false);
      setFormData({
        message: '',
        content_type: 'post',
        requirements: ''
      });
      setSelectedFile(null);
      fetchRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      toast.error('Please select a valid image file');
    }
  };

  const handleAssignClick = (request) => {
    setSelectedRequest(request);
    setAssignModalOpen(true);
  };

  const handleAssignComplete = (updatedRequest) => {
    setRequests(requests.map(req => 
      req.id === updatedRequest.id ? updatedRequest : req
    ));
  };

  const handleReviewClick = (request) => {
    setSelectedRequestForReview(request);
    setReviewModalOpen(true);
  };

  const handleReviewComplete = (updatedRequest) => {
    setRequests(requests.map(req => 
      req.id === updatedRequest.id ? updatedRequest : req
    ));
  };

  const handleClientReviewClick = (request) => {
    setSelectedRequestForClientReview(request);
    setClientReviewModalOpen(true);
  };

  const handleClientReviewComplete = (updatedRequest) => {
    setRequests(requests.map(req => 
      req.id === updatedRequest.id ? updatedRequest : req
    ));
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending_manager_review': 'status-pending',
      'assigned_to_editor': 'status-in-progress',
      'submitted_for_review': 'status-pending',
      'manager_approved': 'status-approved',
      'manager_rejected': 'status-rejected',
      'client_approved': 'status-approved',
      'client_rejected': 'status-rejected',
      'completed': 'status-approved'
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  const renderRequestActions = (request) => {
    return (
      <div className="flex gap-2">
        {/* Manager actions */}
        {isManager && request.status === 'pending_manager_review' && (
          <button
            onClick={() => handleAssignClick(request)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Assign
          </button>
        )}
        {isManager && request.status === 'submitted_for_review' && (
          <button
            onClick={() => handleReviewClick(request)}
            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            Review
          </button>
        )}
        
        {/* Client actions */}
        {isClient && request.status === 'manager_approved' && (
          <button
            onClick={() => handleClientReviewClick(request)}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            Review Final Work
          </button>
        )}
      </div>
    );
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
        <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
        {isClient && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Request
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Create New Request</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="input-field"
                rows="4"
                placeholder="Describe your social media post request..."
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
                <label className="block text-sm font-medium text-gray-700">Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Requirements</label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                className="input-field"
                rows="2"
                placeholder="Any specific requirements or notes..."
              />
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                Submit Request
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

      {/* Requests List */}
      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 text-primary-600 mr-2" />
                <span className="text-sm font-medium text-gray-500 uppercase">
                  {request.content_type}
                </span>
              </div>
              {getStatusBadge(request.status)}
            </div>
            <p className="text-gray-900 mb-3">{request.message}</p>
            {request.requirements && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Requirements:</p>
                <p className="text-xs text-gray-600">{request.requirements}</p>
              </div>
            )}
            {request.image_url && (
              <div className="mb-3">
                <img 
                  src={request.image_url} 
                  alt="Request attachment" 
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Created: {new Date(request.created_at).toLocaleDateString()}</span>
              {request.from_user && (
                <span>From: {request.from_user.name}</span>
              )}
            </div>

            {/* Add this to your request display table/cards: */}
            {renderRequestActions(request)}
          </div>
        ))}
      </div>

      {requests.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
          <p className="text-gray-500">
            {isClient ? 'Create your first request to get started.' : 'No requests have been submitted yet.'}
          </p>
        </div>
      )}

      {/* Add the assignment modal */}
      <AssignRequestModal
        request={selectedRequest}
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssign={handleAssignComplete}
      />

      {/* Add the review modal */}
      <ManagerReviewModal
        request={selectedRequestForReview}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onReview={handleReviewComplete}
      />

      {/* Add the client review modal */}
      <ClientReviewModal
        request={selectedRequestForClientReview}
        isOpen={clientReviewModalOpen}
        onClose={() => setClientReviewModalOpen(false)}
        onReview={handleClientReviewComplete}
      />
    </div>
  );
};

export default Requests;