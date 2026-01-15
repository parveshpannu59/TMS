import { apiClient } from './client';
import { DashboardData, DashboardWidget } from '@/types/dashboard.types';

export const dashboardApi = {
  getOwnerDashboard: async (dateRange: string = 'today'): Promise<DashboardData> => {
    const response = await apiClient.get('/dashboard', {
      params: { dateRange },
    });
    return response.data.data;
  },

  getUserWidgets: async (): Promise<DashboardWidget[]> => {
    const response = await apiClient.get('/dashboard/widgets');
    return response.data.data;
  },

  saveUserWidgets: async (widgets: DashboardWidget[]): Promise<DashboardWidget[]> => {
    const response = await apiClient.post('/dashboard/widgets', { widgets });
    return response.data.data;
  },

  resetUserWidgets: async (): Promise<DashboardWidget[]> => {
    const response = await apiClient.delete('/dashboard/widgets');
    return response.data.data;
  },
};