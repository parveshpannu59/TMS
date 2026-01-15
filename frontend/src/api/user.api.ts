import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse } from '../types/api.types';
import type { User, CreateUserData, UpdateUserData, UserStats } from '../types/user.types';

export const userApi = {
  createUser: async (userData: CreateUserData): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>(
      API_ENDPOINTS.USERS.CREATE,
      userData
    );
    return response.data.data as User;
  },

  getAllUsers: async (params?: { page?: number; limit?: number; search?: string; status?: string; role?: string }): Promise<{ data: User[]; pagination: any }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.role) queryParams.append('role', params.role);
    
    const url = `${API_ENDPOINTS.USERS.LIST}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get<ApiResponse<{ data: User[]; pagination: any }>>(url);
    return response.data.data as { data: User[]; pagination: any };
  },

  getUsers: async (): Promise<{ users: User[]; pagination: any }> => {
    const response = await apiClient.get(API_ENDPOINTS.USERS.LIST);
    return response.data.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(API_ENDPOINTS.USERS.GET(id));
    return response.data.data as User;
  },

  updateUser: async (id: string, userData: UpdateUserData): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(
      API_ENDPOINTS.USERS.UPDATE(id),
      userData
    );
    return response.data.data as User;
  },

  changePassword: async (id: string, newPassword: string): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.USERS.CHANGE_PASSWORD(id), { newPassword });
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.USERS.DELETE(id));
  },

  getUserStats: async (): Promise<UserStats> => {
    const response = await apiClient.get<ApiResponse<UserStats>>(API_ENDPOINTS.USERS.STATS);
    return response.data.data as UserStats;
  },
};