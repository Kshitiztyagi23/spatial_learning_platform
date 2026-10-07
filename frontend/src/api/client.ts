import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ADMIN_TOKEN_KEY = 'admin_token';
export const ADMIN_AUTH_EXPIRED_EVENT = 'admin-auth-expired';

const isAdminUrl = (url?: string) => !!url && url.startsWith('/admin') && !url.startsWith('/admin/verify-passcode');

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (token && isAdminUrl(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && isAdminUrl(error.config?.url)) {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      window.dispatchEvent(new Event(ADMIN_AUTH_EXPIRED_EVENT));
    }
    let errorMessage = 'An unexpected error occurred';
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        errorMessage = error.response.data.detail;
      } else {
        errorMessage = JSON.stringify(error.response.data.detail);
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    return Promise.reject(new Error(errorMessage));
  }
);
