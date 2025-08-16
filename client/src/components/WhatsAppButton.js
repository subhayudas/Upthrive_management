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
      className={`inline-flex items-center gap-1 rounded-md font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title={`Send WhatsApp message to ${recipientName}`}
    >
      <MessageCircle className="w-4 h-4" />
      WhatsApp
    </button>
  );
};

export default WhatsAppButton;