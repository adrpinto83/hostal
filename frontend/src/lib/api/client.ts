import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRedirecting = false; // Prevenir múltiples redirects

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
    // Log 401 errors for debugging
    if (error.response?.status === 401) {
      console.error('401 Unauthorized - URL:', error.config?.url);
      console.error('401 Response data:', error.response.data);
    }

    // Don't redirect for 202 (Accepted) or 403 (Forbidden) in auth endpoints
    // These are intentional responses that should be handled by the caller
    if (error.response?.status === 401 && !isRedirecting) {
      // Only redirect to login if we're not already there
      if (window.location.pathname !== '/login') {
        isRedirecting = true;
        localStorage.removeItem('access_token');
        // Trigger storage event so Zustand can pick it up
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'access_token',
          newValue: null,
          oldValue: localStorage.getItem('access_token'),
          storageArea: localStorage
        }));
        // Redirigir al login
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
