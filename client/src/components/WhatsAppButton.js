// Create: client/src/components/WhatsAppButton.js
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { sendWhatsAppMessage } from '../utils/whatsappUtils';
import toast from 'react-hot-toast';

const WhatsAppButton = ({ 
  phoneNumber, 
  message, 
  recipientName,
  className = "",
  size = "sm",
  variant = "primary"
}) => {
  const handleWhatsAppClick = () => {
    if (!phoneNumber) {
      toast.error(`No phone number available for ${recipientName}`);
      return;
    }
    
    sendWhatsAppMessage(phoneNumber, message);
    toast.success(`Opening WhatsApp to message ${recipientName}...`);
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className={`bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 text-sm min-h-[48px] w-full ${className}`}
      title={`Send WhatsApp message to ${recipientName}`}
      style={{ minHeight: '48px', minWidth: '48px' }}
    >
      <MessageCircle className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">WhatsApp {recipientName}</span>
    </button>
  );
};

export default WhatsAppButton;