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

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm", 
    lg: "px-4 py-3 text-base"
  };

  const variantClasses = {
    primary: "bg-green-600 hover:bg-green-700 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    outline: "border border-green-600 text-green-600 hover:bg-green-50"
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className={`bg-green-500 hover:bg-green-600 text-white font-semibold py-2 md:py-3 px-3 md:px-4 rounded-lg md:rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-105 text-xs md:text-sm mobile-btn ${className}`}
      title={`Send WhatsApp message to ${recipientName}`}
    >
      <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
      <span className="hidden sm:inline">WhatsApp {recipientName}</span>
      <span className="sm:hidden">WhatsApp</span>
    </button>
  );
};

export default WhatsAppButton;