import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, MessageSquare, Upload, Eye, PlusCircle, Clock, CheckCircle, XCircle, AlertCircle, UserPlus, X, FileText, Zap } from 'lucide-react';
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
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState(null);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);

  const getPageTitle = () => {
    if (isClient) return 'My Requests';
    if (isManager) return 'All Requests';
    if (isEditor) return 'Request Queue';
    return 'Requests';
  };

  const getPageDescription = () => {
    if (isClient) return 'Submit and track your content creation requests';
    if (isManager) return 'Review, assign, and manage all incoming requests';
    if (isEditor) return 'View requests assigned to you for completion';
    return 'Manage content requests';
  };

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
      console.log('Creating request with file:', selectedFile?.name); // Debug log
      
      const formDataToSend = new FormData();
      formDataToSend.append('message', formData.message);
      formDataToSend.append('content_type', formData.content_type);
      formDataToSend.append('requirements', formData.requirements);
      
      if (selectedFile) {
        formDataToSend.append('file', selectedFile); // Must match backend multer field name
        console.log('File type:', selectedFile.type); // Debug log
        console.log('File size:', selectedFile.size); // Debug log
      }

      // Debug: Log all form data entries
      for (let [key, value] of formDataToSend.entries()) {
        console.log('FormData:', key, value);
      }

      const response = await axios.post(`${API_BASE_URL}/api/requests`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Request creation response:', response.data); // Debug log
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
      console.error('Error response:', error.response?.data); // More detailed error
      
      if (error.response?.data?.message) {
        toast.error(`Error: ${error.response.data.message}`);
      } else {
        toast.error('Failed to create request');
      }
    }
  };

  // Update handleFileChange to accept videos too
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Check file size (100MB = 100 * 1024 * 1024 bytes)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 100MB');
      return;
    }
    
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.success(`${file.type.startsWith('video/') ? 'Video' : 'Image'} selected: ${file.name} (${fileSizeMB}MB)`);
    } else {
      toast.error('Please select a valid image or video file');
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

  const handleViewRequestDetails = (request) => {
    setSelectedRequestForDetails(request);
    setShowRequestDetailModal(true);
  };

  const closeRequestDetailModal = () => {
    setSelectedRequestForDetails(null);
    setShowRequestDetailModal(false);
  };

  const getStatusStyles = (status) => {
    const styles = {
      'pending_manager_review': { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-700',
        icon: '⏳',
        badge: 'bg-yellow-500'
      },
      'assigned_to_editor': { 
        bg: 'bg-blue-100', 
        text: 'text-blue-700',
        icon: '👷',
        badge: 'bg-blue-500'
      },
      'submitted_for_review': { 
        bg: 'bg-purple-100', 
        text: 'text-purple-700',
        icon: '📋',
        badge: 'bg-purple-500'
      },
      'manager_approved': { 
        bg: 'bg-green-100', 
        text: 'text-green-700',
        icon: '✅',
        badge: 'bg-green-500'
      },
      'manager_rejected': { 
        bg: 'bg-red-100', 
        text: 'text-red-700',
        icon: '❌',
        badge: 'bg-red-500'
      },
      'client_approved': { 
        bg: 'bg-emerald-100', 
        text: 'text-emerald-700',
        icon: '🎉',
        badge: 'bg-emerald-500'
      },
      'client_rejected': { 
        bg: 'bg-orange-100', 
        text: 'text-orange-700',
        icon: '🔄',
        badge: 'bg-orange-500'
      },
      'completed': { 
        bg: 'bg-gray-100', 
        text: 'text-gray-700',
        icon: '✨',
        badge: 'bg-gray-500'
      }
    };
    return styles[status] || styles['pending_manager_review'];
  };

  const getContentTypeStyles = (contentType) => {
    const styles = {
      'post': { 
        icon: FileText, 
        gradient: 'from-blue-500 to-indigo-600',
        bg: 'bg-blue-50',
        text: 'text-blue-700'
      },
      'reel': { 
        icon: Zap, 
        gradient: 'from-purple-500 to-pink-600',
        bg: 'bg-purple-50',
        text: 'text-purple-700'
      },
      'story': { 
        icon: Clock, 
        gradient: 'from-orange-500 to-red-600',
        bg: 'bg-orange-50',
        text: 'text-orange-700'
      },
      'video': { 
        icon: Upload, 
        gradient: 'from-green-500 to-teal-600',
        bg: 'bg-green-50',
        text: 'text-green-700'
      }
    };
    return styles[contentType] || styles['post'];
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/20 p-4 md:p-8">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {getPageTitle()}
                </h1>
                <p className="text-slate-600 mt-1 md:mt-2 font-medium text-sm md:text-base">
                  {getPageDescription()}
                </p>
              </div>
              {isClient && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="self-start group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 text-sm md:text-base"
                >
                  <Plus className="h-4 w-4 md:h-5 md:w-5 group-hover:rotate-90 transition-transform duration-200" />
                  New Request
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Create Form - wrap in backdrop blur container */}
        {showCreateForm && (
          <div className="mb-8 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8">
              {/* Your existing form content with updated styling */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Create New Request</h3>
              </div>
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
                    <label className="block text-sm font-medium text-gray-700">File (Optional)</label>
                    <input
                      type="file"
                      accept="image/*,video/*" // Accept both images and videos
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
          </div>
        )}

        {/* Requests Grid - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 pb-20 md:pb-0">
          {requests.map(request => (
            <div key={request.id} className="group bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl border border-white/20 p-4 md:p-6 transform hover:scale-105 transition-all duration-300">
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary-600 mr-2" />
                  <span className="text-xs md:text-sm font-medium text-gray-500 uppercase">
                    {request.content_type}
                  </span>
                </div>
                <div className="text-xs md:text-sm">
                  {getStatusBadge(request.status)}
                </div>
              </div>
              
              <p className="text-gray-900 mb-3 line-clamp-2 text-sm md:text-base">{request.message}</p>
              
              {request.requirements && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Requirements:</p>
                  <p className="text-xs text-gray-600 line-clamp-1">{request.requirements}</p>
                </div>
              )}
              
              {request.image_url && (
                <div className="mt-3 md:mt-4">
                  <p className="text-xs md:text-sm font-semibold text-slate-700 mb-2">Attached File:</p>
                  <div className="relative group cursor-pointer" onClick={() => handleViewRequestDetails(request)}>
                    {request.image_url.includes('.mp4') || request.image_url.includes('.mov') || request.image_url.includes('.avi') || request.image_url.includes('.webm') ? (
                      <video 
                        controls 
                        className="max-w-full h-auto rounded-lg shadow-md"
                        style={{ maxHeight: '120px' }}
                      >
                        <source src={request.image_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img 
                        src={request.image_url} 
                        alt="Request attachment" 
                        className="max-w-full h-auto rounded-lg shadow-md"
                        style={{ maxHeight: '120px' }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg transition-opacity duration-200 group-hover:opacity-0"></div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
                <span>Created: {new Date(request.created_at).toLocaleDateString()}</span>
                {request.from_user && (
                  <span className="hidden md:inline">From: {request.from_user.name}</span>
                )}
              </div>

              {/* Mobile-optimized Actions */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
                <div className="flex gap-2 flex-wrap">
                  {renderRequestActions(request)}
                </div>
                <button
                  onClick={() => handleViewRequestDetails(request)}
                  className="text-indigo-600 hover:underline text-xs md:text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Request Detail Modal */}
        {showRequestDetailModal && selectedRequestForDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getContentTypeStyles(selectedRequestForDetails.content_type).gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                    {React.createElement(getContentTypeStyles(selectedRequestForDetails.content_type).icon, { className: "h-6 w-6 text-white" })}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Request Details</h2>
                    <span className={`text-sm font-bold uppercase tracking-wider ${getContentTypeStyles(selectedRequestForDetails.content_type).text}`}>
                      {selectedRequestForDetails.content_type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeRequestDetailModal}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-xl flex items-center justify-center transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Status and Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Status</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 ${getStatusStyles(selectedRequestForDetails.status).bg} ${getStatusStyles(selectedRequestForDetails.status).text} rounded-lg text-sm font-bold`}>
                      <span>{getStatusStyles(selectedRequestForDetails.status).icon}</span>
                      {selectedRequestForDetails.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Content Type</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 ${getContentTypeStyles(selectedRequestForDetails.content_type).bg} ${getContentTypeStyles(selectedRequestForDetails.content_type).text} rounded-lg text-sm font-bold`}>
                      {React.createElement(getContentTypeStyles(selectedRequestForDetails.content_type).icon, { className: "w-4 h-4" })}
                      {selectedRequestForDetails.content_type}
                    </div>
                  </div>
                </div>

                {/* Request Message */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Request Message</h4>
                  <p className="text-gray-800 leading-relaxed">{selectedRequestForDetails.message}</p>
                </div>

                {/* Requirements */}
                {selectedRequestForDetails.requirements && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-3">Requirements</h4>
                    <p className="text-blue-800 leading-relaxed">{selectedRequestForDetails.requirements}</p>
                  </div>
                )}

                {/* Attached File */}
                {selectedRequestForDetails.image_url && (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-purple-700 mb-3">Attached File</h4>
                    {selectedRequestForDetails.image_url.includes('.mp4') || selectedRequestForDetails.image_url.includes('.mov') || selectedRequestForDetails.image_url.includes('.avi') || selectedRequestForDetails.image_url.includes('.webm') ? (
                      <video 
                        controls 
                        className="max-w-full h-auto rounded-lg shadow-md"
                        style={{ maxHeight: '400px' }}
                      >
                        <source src={selectedRequestForDetails.image_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img 
                        src={selectedRequestForDetails.image_url} 
                        alt="Request attachment" 
                        className="max-w-full h-auto rounded-lg shadow-md"
                        style={{ maxHeight: '400px' }}
                      />
                    )}
                  </div>
                )}

                {/* Completed Work */}
                {selectedRequestForDetails.completed_work_url && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-green-700 mb-3">Completed Work</h4>
                    {selectedRequestForDetails.completed_work_url.includes('.mp4') || selectedRequestForDetails.completed_work_url.includes('.mov') || selectedRequestForDetails.completed_work_url.includes('.avi') || selectedRequestForDetails.completed_work_url.includes('.webm') ? (
                      <video 
                        controls 
                        className="max-w-full h-auto rounded-lg shadow-md"
                        style={{ maxHeight: '400px' }}
                      >
                        <source src={selectedRequestForDetails.completed_work_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img 
                        src={selectedRequestForDetails.completed_work_url} 
                        alt="Completed work" 
                        className="max-w-full h-auto rounded-lg shadow-md"
                        style={{ maxHeight: '400px' }}
                      />
                    )}
                  </div>
                )}

                {/* Feedback Sections */}
                {selectedRequestForDetails.editor_message && (
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-indigo-700 mb-3">Editor's Message</h4>
                    <p className="text-indigo-800 leading-relaxed">{selectedRequestForDetails.editor_message}</p>
                  </div>
                )}

                {selectedRequestForDetails.manager_feedback && (
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-orange-700 mb-3">Manager Feedback</h4>
                    <p className="text-orange-800 leading-relaxed">{selectedRequestForDetails.manager_feedback}</p>
                  </div>
                )}

                {selectedRequestForDetails.client_feedback && (
                  <div className="bg-pink-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-pink-700 mb-3">Client Feedback</h4>
                    <p className="text-pink-800 leading-relaxed">{selectedRequestForDetails.client_feedback}</p>
                  </div>
                )}

                {/* People Involved */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedRequestForDetails.from_user && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Requested By</h4>
                      <p className="text-gray-800 font-medium">{selectedRequestForDetails.from_user.name}</p>
                      <p className="text-gray-600 text-sm">{selectedRequestForDetails.from_user.email}</p>
                    </div>
                  )}

                  {selectedRequestForDetails.assigned_editor && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Assigned Editor</h4>
                      <p className="text-gray-800 font-medium">{selectedRequestForDetails.assigned_editor.name}</p>
                      <p className="text-gray-600 text-sm">{selectedRequestForDetails.assigned_editor.email}</p>
                    </div>
                  )}

                  {selectedRequestForDetails.clients && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Client</h4>
                      <p className="text-gray-800 font-medium">{selectedRequestForDetails.clients.name}</p>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Created</h4>
                    <p className="text-gray-600">{new Date(selectedRequestForDetails.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Last Updated</h4>
                    <p className="text-gray-600">{new Date(selectedRequestForDetails.updated_at).toLocaleDateString('en-US', { 
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
                  <div className="flex gap-2 flex-1">
                    {renderRequestActions(selectedRequestForDetails)}
                  </div>
                  <button
                    onClick={closeRequestDetailModal}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;
