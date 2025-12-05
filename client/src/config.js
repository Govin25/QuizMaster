// API configuration
// Use relative URLs - Vite proxy will forward /api requests to localhost:3001
const API_URL = import.meta.env.VITE_API_URL || '';
export default API_URL;
