// Create: client/src/utils/whatsappUtils.js
export const sendWhatsAppMessage = (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};

export const createWhatsAppMessage = {
  assignToEditor: (editorName, clientName, contentType, requestMessage) => 
    `Hi ${editorName}! 👋\n\nYou have been assigned a new task:\n\n📋 Client: ${clientName}\n🎨 Content Type: ${contentType}\n📝 Request: ${requestMessage}\n\nPlease visit https://upthrive-management.vercel.app/ for full details and complete the work. Thanks!`,

  submitForReview: (managerName, clientName, contentType, editorMessage) =>
    `Hi ${managerName}! 👋\n\nI have completed the work and submitted it for review:\n\n📋 Client: ${clientName}\n🎨 Content Type: ${contentType}\n💬 My Notes: ${editorMessage}\n\nPlease visit https://upthrive-management.vercel.app/ to review and let me know if any changes are needed. Thanks!`,

  approveForClient: (clientName, contentType, managerName) =>
    `Hi ${clientName}! 👋\n\nGreat news! Your content has been completed and approved:\n\n🎨 Content Type: ${contentType}\n✅ Approved by: ${managerName}\n📋 Status: Ready for your final review\n\nPlease visit https://upthrive-management.vercel.app/ to review and approve your final work. Thanks!`,

  rejectToEditor: (editorName, clientName, contentType, feedback) =>
    `Hi ${editorName}! 👋\n\nThe work needs some revisions:\n\n📋 Client: ${clientName}\n🎨 Content Type: ${contentType}\n📝 Feedback: ${feedback}\n\nPlease visit https://upthrive-management.vercel.app/ to make the changes and resubmit. Thanks!`,

  clientApproved: (managerName, editorName, clientName, contentType) =>
    `Hi ${managerName}! 👋\n\nGreat news! The client has approved the final work:\n\n📋 Client: ${clientName}\n🎨 Content Type: ${contentType}\n✅ Status: Completed\n\nProject successfully delivered! 🎉\n\nView details at https://upthrive-management.vercel.app/`,

  clientRejected: (editorName, clientName, contentType, feedback) =>
    `Hi ${editorName}! 👋\n\nThe client requested some final changes:\n\n📋 Client: ${clientName}\n🎨 Content Type: ${contentType}\n📝 Client Feedback: ${feedback}\n\nPlease visit https://upthrive-management.vercel.app/ to make the changes and resubmit. Thanks!`
};