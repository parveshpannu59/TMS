import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { LoginCredentials, LoginResponse, User } from '@types/auth.types';
import { ApiResponse } from '@types/api.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  verifyAuth: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(API_ENDPOINTS.AUTH.VERIFY);
    return response.data.data as User;
  },
};