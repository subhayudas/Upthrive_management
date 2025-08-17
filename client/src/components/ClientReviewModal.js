import React, { useState } from 'react';
import { X, Check, XCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import WhatsAppButton from './WhatsAppButton';
import { createWhatsAppMessage } from '../utils/whatsappUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ClientReviewModal = ({ request, isOpen, onClose, onReview }) => {
  const [action, setAction] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!action) {
      toast.error('Please select approve or reject');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/requests/${request.id}/client-review`, {
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
        toast.success(action === 'approve' ? 'Work approved! Request completed.' : 'Work rejected and sent back for revision');
        onReview(data.request);
        onClose();
        setAction('');
        setFeedback('');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review request');
      }
    } catch (error) {
      console.error('Client review error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg md:rounded-xl w-full max-w-xs sm:max-w-sm md:max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
        {/* Mobile-optimized header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-semibold">Review Final Work</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile-optimized content */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Original Request */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2 text-sm md:text-base">Your Original Request:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded text-sm md:text-base">{request?.message}</p>
            <div className="mt-2 text-xs md:text-sm text-gray-600">
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <span><strong>Content Type:</strong> {request?.content_type}</span>
                <span><strong>Requirements:</strong> {request?.requirements || 'None specified'}</span>
              </div>
            </div>
          </div>

          {/* Editor's Message */}
          {request?.editor_message && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 text-sm md:text-base">Editor's Work Summary:</h3>
              <p className="text-gray-700 bg-blue-50 p-3 rounded text-sm md:text-base">{request.editor_message}</p>
            </div>
          )}

          {/* Completed Work - Mobile Optimized */}
          {request?.completed_work_url && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 text-sm md:text-base">Completed Work:</h3>
              {request.completed_work_url.includes('.mp4') || request.completed_work_url.includes('.mov') || request.completed_work_url.includes('.avi') || request.completed_work_url.includes('.webm') ? (
                <video 
                  controls 
                  className="w-full h-auto rounded border"
                  style={{ maxHeight: window.innerWidth < 768 ? '200px' : '400px' }}
                >
                  <source src={request.completed_work_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img 
                  src={request.completed_work_url} 
                  alt="Completed work" 
                  className="w-full h-auto rounded border"
                  style={{ maxHeight: window.innerWidth < 768 ? '200px' : '400px' }}
                />
              )}
            </div>
          )}

          {/* Editor Info - Mobile Layout */}
          <div className="bg-gray-50 p-3 rounded">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
              <div>
                <strong>Editor:</strong> {request?.assigned_editor?.name}
              </div>
              <div>
                <strong>Completed:</strong> {new Date(request?.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Decision Section - Mobile Optimized */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Your Decision *
              </label>
              <div className="space-y-2 md:space-y-3">
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-green-50 transition-colors">
                  <input
                    type="radio"
                    name="action"
                    value="approve"
                    checked={action === 'approve'}
                    onChange={(e) => setAction(e.target.value)}
                    className="mr-3 mt-1"
                  />
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-green-600 mr-2 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-green-800 text-sm md:text-base">Approve</div>
                    <div className="text-xs md:text-sm text-green-600">I'm satisfied with the work. Mark as completed.</div>
                  </div>
                </label>
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                  <input
                    type="radio"
                    name="action"
                    value="reject"
                    checked={action === 'reject'}
                    onChange={(e) => setAction(e.target.value)}
                    className="mr-3 mt-1"
                  />
                  <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 mr-2 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-red-800 text-sm md:text-base">Reject</div>
                    <div className="text-xs md:text-sm text-red-600">Request changes. Send back for revision.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Feedback Section - Mobile Optimized */}
            {action === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like changed? (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={window.innerWidth < 768 ? "3" : "4"}
                  placeholder="Describe what needs to be changed or improved..."
                />
              </div>
            )}

            {action === 'approve' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={window.innerWidth < 768 ? "2" : "3"}
                  placeholder="Any feedback or thanks for the team..."
                />
              </div>
            )}

            {/* WhatsApp notification sections - Mobile Optimized */}
            {action === 'approve' && request?.manager_phone && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs md:text-sm text-green-800 mb-2">
                  📱 Notify manager via WhatsApp:
                </p>
                <WhatsAppButton
                  phoneNumber={request.manager_phone}
                  message={createWhatsAppMessage.clientApproved(
                    request.manager_name || 'Manager',
                    request.assigned_editor?.name,
                    request.from_user?.name,
                    request.content_type
                  )}
                  recipientName={request.manager_name || 'Manager'}
                  className="w-full justify-center text-sm"
                />
              </div>
            )}

            {action === 'reject' && request?.assigned_editor?.phone_number && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-xs md:text-sm text-orange-800 mb-2">
                  📱 Notify editor via WhatsApp:
                </p>
                <WhatsAppButton
                  phoneNumber={request.assigned_editor.phone_number}
                  message={createWhatsAppMessage.clientRejected(
                    request.assigned_editor.name,
                    request.from_user?.name,
                    request.content_type,
                    feedback || 'Client requested changes'
                  )}
                  recipientName={request.assigned_editor.name}
                  className="w-full justify-center text-sm"
                />
              </div>
            )}

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col md:flex-row gap-3">
              <button
                type="submit"
                disabled={loading || !action}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors text-sm md:text-base mobile-btn ${
                  action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Processing...' : 
                 action === 'approve' ? 'Approve & Complete' : 
                 action === 'reject' ? 'Reject & Request Changes' : 
                 'Select Your Decision'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 transition-colors text-sm md:text-base mobile-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientReviewModal;