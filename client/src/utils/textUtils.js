// Utility function to convert URLs in text to clickable hyperlinks
export const convertUrlsToLinks = (text) => {
  if (!text) return text;
  
  // Regular expression to match URLs (including Google Drive links)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split the text by URLs and create React elements
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Alternative function that returns JSX directly
export const renderTextWithLinks = (text) => {
  if (!text) return text;
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};
