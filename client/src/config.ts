// Read the backend URL from environment or use a default
const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Ensure the URL doesn't have a trailing slash
const cleanBackendUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;

// Log the configuration
console.log('Backend URL:', cleanBackendUrl);
console.log('Environment API URL:', process.env.REACT_APP_API_URL);

export const config = {
  apiBaseUrl: cleanBackendUrl,
  // Add more configuration options if needed
  debug: true // Enable debug mode for more logging
}; 