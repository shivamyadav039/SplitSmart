import axios from 'axios';

// Vite environment API URL fallback to port 5001 in dev and relative /api in prod
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5001/api');

const api = axios.create({
  baseURL: API_URL,
});

// Request Interceptor: Attach Bearer JWT token if exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized errors and force logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or invalid token. Redirecting to login...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Dispatch custom event to notify React App components
      window.dispatchEvent(new Event('auth-session-expired'));
      
      // Redirect to login if not already there
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
