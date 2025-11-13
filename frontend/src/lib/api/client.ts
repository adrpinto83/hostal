import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Handle 202 Accepted as successful response (for pending approval)
    if (response.status === 202) {
      return response;
    }
    return response;
  },
  (error: AxiosError) => {
    // Don't redirect for 202 (Accepted) or 403 (Forbidden) in auth endpoints
    // These are intentional responses that should be handled by the caller
    if (error.response?.status === 401) {
      // Only redirect to login if we're not already there
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('access_token');
        // Use a slight delay to ensure any pending requests are cancelled
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      return typeof error.response.data.detail === 'string'
        ? error.response.data.detail
        : JSON.stringify(error.response.data.detail);
    }
    return error.message;
  }
  return 'Error desconocido';
};
