import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Clock, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

  useEffect(() => {
    if (isEditor || isManager) {
      fetchTasks();
    }
  }, [isEditor, isManager]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/requests/my-tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.requests);
      } else {
        throw new Error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('message', submitData.message);
      
      if (selectedFile) {
        formDataToSend.append('completed_work', selectedFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/requests/${selectedTask.id}/submit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        toast.success('Work submitted successfully!');
        setShowSubmitForm(false);
        setSelectedTask(null);
        setSubmitData({ message: '', completed_work_url: '' });
        setSelectedFile(null);
        fetchTasks();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit work');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message);
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
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              My Tasks
            </h1>
            <p className="text-slate-600 mt-2 font-medium">
              Complete your assigned content creation tasks
            </p>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks.map(task => (
            <div key={task.id} className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl border border-white/20 p-6 transform hover:scale-105 transition-all duration-300">
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
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{task.message}</p>
                {task.requirements && (
                  <div className="mt-2">
                    <strong className="text-gray-700">Requirements:</strong>
                    <p className="text-gray-600">{task.requirements}</p>
                  </div>
                )}
              </div>

              {/* Show manager feedback if rejected by manager */}
              {task.status === 'manager_rejected' && task.manager_feedback && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-800 mb-1">Manager Feedback:</h4>
                  <p className="text-red-700">{task.manager_feedback}</p>
                </div>
              )}

              {/* Show client feedback if rejected by client */}
              {task.status === 'client_rejected' && task.client_feedback && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                  <h4 className="font-medium text-orange-800 mb-1">Client Feedback:</h4>
                  <p className="text-orange-700">{task.client_feedback}</p>
                  <p className="text-sm text-orange-600 mt-1">
                    Please address the client's concerns and resubmit your work.
                  </p>
                </div>
              )}

              {/* Show previous work if it exists */}
              {task.completed_work_url && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Previous Submission:</h4>
                  <img 
                    src={task.completed_work_url} 
                    alt="Previous work" 
                    className="max-w-xs rounded border"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setShowSubmitForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                  placeholder="Describe the work completed, any changes made, or notes for the manager..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Completed Work (Optional)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept="image/*"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Submit Work
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