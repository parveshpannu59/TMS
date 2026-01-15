import { apiClient, ApiResponse } from './client';
import { ActivityLog, ActivityLogResponse, ActivityStats, ActivityAction, ActivityEntity } from '../types/activityLog.types';

export const activityLogApi = {
  /**
   * Get paginated activity logs with filters
   */
  getActivityLogs: async (params?: {
    page?: number;
    limit?: number;
    entity?: ActivityEntity | 'all';
    action?: ActivityAction | 'all';
    entityId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<ActivityLogResponse> => {
    const response = await apiClient.get<ApiResponse<ActivityLogResponse>>(
      '/activity-logs',
      { params }
    );
    return response.data.data;
  },

  /**
   * Get activity log by ID
   */
  getActivityLogById: async (id: string): Promise<ActivityLog> => {
    const response = await apiClient.get<ApiResponse<ActivityLog>>(
      `/activity-logs/${id}`
    );
    return response.data.data;
  },

  /**
   * Get activity logs for a specific entity
   */
  getEntityActivityLogs: async (
    entity: ActivityEntity,
    entityId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ActivityLogResponse> => {
    const response = await apiClient.get<ApiResponse<ActivityLogResponse>>(
      `/activity-logs/entity/${entity}/${entityId}`,
      { params }
    );
    return response.data.data;
  },

  /**
   * Create activity log
   */
  createActivityLog: async (data: {
    action: ActivityAction;
    entity: ActivityEntity;
    entityId: string;
    entityName: string;
    description: string;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    metadata?: any;
  }): Promise<ActivityLog> => {
    const response = await apiClient.post<ApiResponse<ActivityLog>>(
      '/activity-logs',
      data
    );
    return response.data.data;
  },

  /**
   * Get activity statistics
   */
  getActivityStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ActivityStats> => {
    const response = await apiClient.get<ApiResponse<ActivityStats>>(
      '/activity-logs/stats',
      { params }
    );
    return response.data.data;
  },
};
