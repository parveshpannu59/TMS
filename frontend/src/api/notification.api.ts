import { apiClient, ApiResponse } from './client';
import {
  Notification,
  NotificationResponse,
  UnreadCountResponse,
  NotificationType,
  NotificationPriority,
} from '../types/notification.types';

export const notificationApi = {
  /**
   * Get paginated notifications
   */
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: NotificationType;
    priority?: NotificationPriority;
  }): Promise<NotificationResponse> => {
    const response = await apiClient.get<ApiResponse<NotificationResponse>>(
      '/notifications',
      { params }
    );
    return response.data.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<ApiResponse<UnreadCountResponse>>(
      '/notifications/unread-count'
    );
    return response.data.data.count;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.patch<ApiResponse<Notification>>(
      `/notifications/${id}/read`
    );
    return response.data.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.patch<ApiResponse<{ count: number }>>(
      '/notifications/read-all'
    );
    return response.data.data;
  },

  /**
   * Delete notification
   */
  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  /**
   * Clear all read notifications
   */
  clearReadNotifications: async (): Promise<{ count: number }> => {
    const response = await apiClient.delete<ApiResponse<{ count: number }>>(
      '/notifications/clear-read'
    );
    return response.data.data;
  },

  /**
   * Create notification (Admin only)
   */
  createNotification: async (data: {
    userId?: string;
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    metadata?: any;
    expiresAt?: string;
  }): Promise<Notification> => {
    const response = await apiClient.post<ApiResponse<Notification>>(
      '/notifications',
      data
    );
    return response.data.data;
  },
};
