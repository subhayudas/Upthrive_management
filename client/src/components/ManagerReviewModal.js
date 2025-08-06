import React, { useState } from 'react';
import { X, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ManagerReviewModal = ({ request, isOpen, onClose, onReview }) => {
  const [action, setAction] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!action) {
      toast.error('Please select approve or reject');
      return;
    }

    if (action === 'reject' && !feedback.trim()) {
      toast.error('Feedback is required when rejecting');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/requests/${request.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          action, 
          feedback: feedback.trim() || undefined 
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(action === 'approve' ? 'Work approved!' : 'Work rejected');
        onReview(data.request);
        onClose();
        setAction('');
        setFeedback('');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review request');
      }
    } catch (error) {
      console.error('Review error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Review Submitted Work</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Original Request:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">{request?.message}</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Editor's Response:</h3>
            <p className="text-gray-700 bg-blue-50 p-3 rounded">{request?.editor_message}</p>
          </div>

          {request?.completed_work_url && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Completed Work:</h3>
              <img 
                src={request.completed_work_url} 
                alt="Completed work" 
                className="max-w-full h-auto rounded border"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <strong>Client:</strong> {request?.clients?.name}
            </div>
            <div>
              <strong>Editor:</strong> {request?.assigned_editor?.name}
            </div>
            <div>
              <strong>Content Type:</strong> {request?.content_type}
            </div>
            <div>
              <strong>Submitted:</strong> {new Date(request?.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={(e) => setAction(e.target.value)}
                  className="mr-2"
                />
                <Check className="w-4 h-4 text-green-600 mr-1" />
                Approve - Send to client for final approval
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={(e) => setAction(e.target.value)}
                  className="mr-2"
                />
                <XCircle className="w-4 h-4 text-red-600 mr-1" />
                Reject - Send back to editor with feedback
              </label>
            </div>
          </div>

          {action === 'reject' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback for Editor *
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder="Explain what needs to be changed or improved..."
                required={action === 'reject'}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                action === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : action === 'reject'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : action === 'approve' ? 'Approve & Send to Client' : action === 'reject' ? 'Reject & Send Back' : 'Select Decision'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManagerReviewModal;