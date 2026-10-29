// Axios client — single shared instance that auto-attaches JWT, Idempotency-Key, and Correlation-ID to every request
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Base URL reads from Vite env variable; falls back to the Vite proxy path /api
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST INTERCEPTOR — runs before every outgoing API call
axiosClient.interceptors.request.use(
  (config) => {
    // Attach JWT token from localStorage so the backend auth middleware accepts the request
    const token = localStorage.getItem('cbms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach unique correlation ID for end-to-end request tracing in backend AuditLog
    config.headers['X-Correlation-ID'] = uuidv4();

    // Attach Idempotency-Key on all mutating requests to prevent duplicate writes (e.g. double trip start)
    const mutatingMethods = ['post', 'put', 'patch', 'delete'];
    if (mutatingMethods.includes(config.method?.toLowerCase())) {
      config.headers['Idempotency-Key'] = uuidv4();
    }

    return config;
  },
  (error) => {
    // Log request setup errors (e.g. network offline) to console for debugging
    console.error('[axiosClient] Request setup error:', error);
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR — runs after every incoming API response
axiosClient.interceptors.response.use(
  (response) => {
    // Return response body directly
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    // Token expired or invalid — clear stored token from storage smoothly without forcing hard reload
    if (status === 401 || code === 'TOKEN_INVALID') {
      localStorage.removeItem('cbms_token');
    }

    // Rate limited — log friendly message with retry window
    if (status === 429) {
      console.warn('[axiosClient] Rate limited — retry after cooldown window');
    }

    // Return the full error response so components can handle with appropriate UI toasts/messages
    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;
