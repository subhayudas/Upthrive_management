import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Clock, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import WhatsAppButton from './WhatsAppButton';
import { createWhatsAppMessage } from '../utils/whatsappUtils';
import { renderTextWithLinks } from '../utils/textUtils';
import apiService from '../services/apiService';

const Tasks = () => {
  const { user, isEditor, isManager } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitData, setSubmitData] = useState({
    message: '',
    completed_work_url: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      console.log('Fetching tasks for editor:', user.id);
      
      const result = await apiService.getTasks();
      
      if (result.success) {
        console.log('Tasks data received:', result.data);
        console.log('First task completed_work_url:', result.data.requests?.[0]?.completed_work_url);
        
        setTasks(result.data.requests || []);
        if (result.source === 'supabase') {
          console.log('✅ Tasks loaded using Supabase fallback');
        }
      } else {
        console.error('Error fetching tasks:', result.error);
        toast.error('Failed to load tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (isEditor || isManager) {
      fetchTasks();
    }
  }, [isEditor, isManager, fetchTasks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!submitData.message.trim()) {
      toast.error('Please provide a message describing your work');
      return;
    }
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('message', submitData.message);
      
      if (selectedFile) {
        formDataToSend.append('completed_work', selectedFile);
      }

      const result = await apiService.submitTask(selectedTask.id, formDataToSend);

      if (result.success) {
        toast.success(`Work submitted successfully! ${result.source === 'supabase' ? '(Using direct connection)' : ''}`);
        setShowSubmitForm(false);
        setSelectedTask(null);
        setSubmitData({ message: '', completed_work_url: '' });
        setSelectedFile(null);
        fetchTasks();
      } else {
        toast.error(result.error || 'Failed to submit work');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to submit work');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'assigned_to_editor': { color: 'bg-blue-100 text-blue-800', text: 'Assigned' },
      'manager_rejected': { color: 'bg-red-100 text-red-800', text: 'Manager Rejected - Needs Revision' },
      'client_rejected': { color: 'bg-orange-100 text-orange-800', text: 'Client Rejected - Needs Revision' },
      'submitted_for_review': { color: 'bg-yellow-100 text-yellow-800', text: 'Under Review' }
    };
    
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (!isEditor && !isManager) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">Access denied. This page is only available to editors and managers.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - No Shadows */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              My Tasks
            </h1>
            <p className="text-slate-600 mt-2 font-medium">
              Complete your assigned content creation tasks
            </p>
          </div>
        </div>

        {/* Tasks Grid - Remove Shadows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks.map(task => (
            <div key={task.id} className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/60 p-6 transform transition-all duration-200 hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {task.content_type.charAt(0).toUpperCase() + task.content_type.slice(1)} Request
                    </h3>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-gray-600 mb-2">
                    <strong>Client:</strong> {task.clients?.name}
                  </p>
                  <p className="text-gray-600 mb-2">
                    <strong>Requested by:</strong> {task.from_user?.name} ({task.from_user?.email})
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(task.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Request Details:</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{renderTextWithLinks(task.message)}</p>
                {task.requirements && (
                  <div className="mt-2">
                    <strong className="text-gray-700">Requirements:</strong>
                    <p className="text-gray-600">{renderTextWithLinks(task.requirements)}</p>
                  </div>
                )}
                
                {/* Original Request Media */}
                {task.image_url && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">📎 Reference Media:</h4>
                    {task.image_url.includes('.mp4') || task.image_url.includes('.mov') || task.image_url.includes('.avi') || task.image_url.includes('.webm') ? (
                      <video 
                        controls 
                        className="max-w-full h-auto rounded-lg shadow-md border-2 border-blue-200"
                        style={{ maxHeight: '300px' }}
                      >
                        <source src={task.image_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img 
                        src={task.image_url} 
                        alt="Request reference" 
                        className="max-w-full h-auto rounded-lg shadow-md border-2 border-blue-200"
                        style={{ maxHeight: '300px' }}
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">Reference material from the original request</p>
                  </div>
                )}
              </div>

              {/* Show manager feedback if rejected by manager */}
              {task.status === 'manager_rejected' && task.manager_feedback && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-800 mb-1">Manager Feedback:</h4>
                  <p className="text-red-700">{renderTextWithLinks(task.manager_feedback)}</p>
                </div>
              )}

              {/* Show client feedback if rejected by client */}
              {task.status === 'client_rejected' && task.client_feedback && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                  <h4 className="font-medium text-orange-800 mb-1">Client Feedback:</h4>
                  <p className="text-orange-700">{renderTextWithLinks(task.client_feedback)}</p>
                  <p className="text-sm text-orange-600 mt-1">
                    Please address the client's concerns and resubmit your work.
                  </p>
                </div>
              )}

              {/* Show previous work if it exists */}
              {task.completed_work_url && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">📋 Previous Submission:</h4>
                  {task.completed_work_url.includes('.mp4') || task.completed_work_url.includes('.mov') || task.completed_work_url.includes('.avi') || task.completed_work_url.includes('.webm') ? (
                    <video 
                      controls 
                      className="max-w-xs rounded border border-green-200"
                      style={{ maxHeight: '200px' }}
                    >
                      <source src={task.completed_work_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img 
                      src={task.completed_work_url} 
                      alt="Previous work" 
                      className="max-w-xs rounded border border-green-200"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">Your previously submitted work</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setShowSubmitForm(true);
                  }}
                  className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Work
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Work Modal */}
      {showSubmitForm && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Submit Completed Work</h2>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Task:</strong> {selectedTask.content_type} for {selectedTask.clients?.name}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to Manager *
                </label>
                <textarea
                  value={submitData.message}
                  onChange={(e) => setSubmitData({ ...submitData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="Describe what you've completed and any important notes..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Completed Work
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept="image/*,video/*"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-500 mt-1">Selected: {selectedFile.name}</p>
                )}
              </div>

              {/* WhatsApp notification section */}
              {selectedTask.manager_phone && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800 mb-2">
                    📱 Notify manager via WhatsApp:
                  </p>
                  {/* Add debug info */}
                  {console.log('🔍 WhatsApp Debug:', {
                    manager_phone: selectedTask.manager_phone,
                    manager_name: selectedTask.manager_name,
                    client_name: selectedTask.clients?.name,
                    content_type: selectedTask.content_type,
                    message: submitData.message
                  })}
                  <WhatsAppButton
                    phoneNumber={selectedTask.manager_phone}
                    message={createWhatsAppMessage.submitForReview(
                      selectedTask.manager_name || 'Manager',
                      selectedTask.clients?.name,
                      selectedTask.content_type,
                      submitData.message || 'Work completed'
                    )}
                    recipientName={selectedTask.manager_name || 'Manager'}
                    className="w-full justify-center"
                  />
                </div>
              )}

              {/* Also add debug for when manager_phone is missing */}
              {!selectedTask.manager_phone && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Manager phone number not available for WhatsApp notification
                  </p>
                  {console.log('❌ Missing manager phone:', selectedTask)}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Work'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitForm(false);
                    setSelectedTask(null);
                    setSubmitData({ message: '', completed_work_url: '' });
                    setSelectedFile(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;