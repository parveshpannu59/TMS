import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types/api.types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

/** Base URL for API server (used for static assets like profile pictures) */
export const getApiOrigin = (): string => {
  const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
  return base.replace(/\/api\/?$/, '') || 'http://localhost:5000';
};

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage - Use sessionStorage (persists on page refresh but clears on browser close)
const TOKEN_KEY = 'auth_token';

export const setAuthToken = (token: string | null): void => {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
};

export const getAuthToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const clearAuthToken = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
};

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    console.error('API Error Response:', error.response?.data);
    
    const apiError: ApiError = {
      success: false,
      message: error.response?.data?.message || error.message || 'An error occurred',
      error: error.response?.data?.error,
      statusCode: error.response?.status || 500,
    };

    console.log('ApiError object created:', apiError);

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401) {
      clearAuthToken();
      // Redirect to login will be handled by AuthContext
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }

    return Promise.reject(apiError);
  }
);