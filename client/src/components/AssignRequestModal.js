import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import WhatsAppButton from './WhatsAppButton';
import { createWhatsAppMessage } from '../utils/whatsappUtils';
import apiService from '../services/apiService';

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
      const result = await apiService.getEditors();
      
      if (result.success) {
        setEditors(result.data.editors || []);
        if (result.source === 'supabase') {
          console.log('✅ Editors loaded using Supabase fallback');
        }
      } else {
        console.error('Error fetching editors:', result.error);
        toast.error('Failed to load editors');
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
      const result = await apiService.assignRequest(request.id, selectedEditor);

      if (result.success) {
        toast.success(`Request assigned successfully! ${result.source === 'supabase' ? '(Using direct connection)' : ''}`);
        onAssign(result.data.request);
        onClose();
        setSelectedEditor('');
        setSelectedEditorData(null);
      } else {
        toast.error(result.error || 'Failed to assign request');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(error.message || 'Failed to assign request');
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
          <div className="bg-white rounded-lg md:rounded-xl w-full max-w-xs sm:max-w-sm md:max-w-md max-h-[95vh] overflow-y-auto mx-2 border border-gray-200">
      <div className="flex justify-between items-center p-3 md:p-6 border-b border-gray-200">
        <h2 className="text-base md:text-lg font-semibold">Assign Request to Editor</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 md:p-6 space-y-3 md:space-y-4">
        {/* Request Details */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="font-medium text-gray-900 mb-2 text-sm">Request Details:</h3>
          <p className="text-xs md:text-sm text-gray-600 mb-2">
            <strong>Request:</strong> {request?.message}
          </p>
          <p className="text-xs md:text-sm text-gray-600 mb-2">
            <strong>Content Type:</strong> {request?.content_type}
          </p>
          <p className="text-xs md:text-sm text-gray-600">
            <strong>Client:</strong> {request?.clients?.name}
          </p>
        </div>

        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Editor
            </label>
            <select
              value={selectedEditor}
              onChange={(e) => handleEditorChange(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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

          {/* WhatsApp notification section - Mobile optimized */}
          {selectedEditorData && selectedEditorData.phone_number && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-800 mb-2">
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
                className="w-full justify-center text-xs"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium min-h-[48px]"
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
              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 text-sm font-medium min-h-[48px]"
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