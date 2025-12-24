// API configuration
// Use relative URLs - Vite proxy will forward /api requests to localhost:3001
const API_URL = import.meta.env.VITE_API_URL || '';

// Google OAuth Client ID
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default API_URL;

