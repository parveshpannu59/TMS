import axios from 'axios';
import { Load, CreateLoadDto } from '../types/load';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loadApi = {
  // Get all loads
  getAll: async (params?: {
    status?: string;
    driverId?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<{
      success: boolean;
      data: Load[];
      pagination: any;
    }>('/loads', { params });
    return response.data;
  },

  // Get load by ID
  getById: async (id: string) => {
    const response = await api.get<{
      success: boolean;
      data: Load;
    }>(`/loads/${id}`);
    return response.data;
  },

  // Create load
  create: async (data: CreateLoadDto) => {
    const response = await api.post<{
      success: boolean;
      data: Load;
    }>('/loads', data);
    return response.data;
  },

  // Update load
  update: async (id: string, data: Partial<CreateLoadDto>) => {
    const response = await api.put<{
      success: boolean;
      data: Load;
    }>(`/loads/${id}`, data);
    return response.data;
  },

  // Assign load
  assign: async (id: string, assignment: {
    driverId: string;
    truckId: string;
    trailerId: string;
  }) => {
    const response = await api.post<{
      success: boolean;
      data: Load;
      message: string;
    }>(`/loads/${id}/assign`, assignment);
    return response.data;
  },

  // Update status
  updateStatus: async (id: string, status: string) => {
    const response = await api.patch<{
      success: boolean;
      data: Load;
    }>(`/loads/${id}/status`, { status });
    return response.data;
  },

  // Delete load
  delete: async (id: string) => {
    const response = await api.delete<{
      success: boolean;
      message: string;
    }>(`/loads/${id}`);
    return response.data;
  },
};