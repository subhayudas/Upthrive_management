import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import WhatsAppButton from './WhatsAppButton';
import { createWhatsAppMessage } from '../utils/whatsappUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AssignRequestModal = ({ request, isOpen, onClose, onAssign }) => {
  const [editors, setEditors] = useState([]);
  const [selectedEditor, setSelectedEditor] = useState('');
  const [selectedEditorData, setSelectedEditorData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEditors();
    }
  }, [isOpen]);

  const fetchEditors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/requests/editors`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEditors(data.editors || []);
      }
    } catch (error) {
      console.error('Error fetching editors:', error);
      toast.error('Failed to load editors');
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    
    if (!selectedEditor) {
      toast.error('Please select an editor');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/requests/${request.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ editor_id: selectedEditor })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Request assigned successfully!');
        onAssign(data.request);
        onClose();
        setSelectedEditor('');
        setSelectedEditorData(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign request');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (editorId) => {
    setSelectedEditor(editorId);
    const editor = editors.find(e => e.id === editorId);
    setSelectedEditorData(editor);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Assign Request to Editor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Request:</strong> {request?.message}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Content Type:</strong> {request?.content_type}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Client:</strong> {request?.clients?.name}
          </p>
        </div>

        <form onSubmit={handleAssign}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Editor
            </label>
            <select
              value={selectedEditor}
              onChange={(e) => handleEditorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose an editor...</option>
              {editors.map(editor => (
                <option key={editor.id} value={editor.id}>
                  {editor.name} ({editor.email})
                </option>
              ))}
            </select>
          </div>

          {/* WhatsApp notification section */}
          {selectedEditorData && selectedEditorData.phone_number && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 mb-2">
                📱 Notify {selectedEditorData.name} via WhatsApp:
              </p>
              <WhatsAppButton
                phoneNumber={selectedEditorData.phone_number}
                message={createWhatsAppMessage.assignToEditor(
                  selectedEditorData.name,
                  request?.clients?.name,
                  request?.content_type,
                  request?.message
                )}
                recipientName={selectedEditorData.name}
                className="w-full justify-center"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Assign Request
                </>
              )}
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

export default AssignRequestModal;