import { apiClient } from './client';
import type { ApiResponse } from '../types/api.types';
import type { Message, Conversation, SendMessageData } from '../types/message.types';

export const messageApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get<ApiResponse<Conversation[]>>('/messages/conversations');
    return response.data.data as Conversation[];
  },

  getConversation: async (userId: string, loadId?: string): Promise<Message[]> => {
    const response = await apiClient.get<ApiResponse<Message[]>>('/messages/conversation', {
      params: { userId, loadId },
    });
    return response.data.data as Message[];
  },

  sendMessage: async (data: SendMessageData): Promise<Message> => {
    const response = await apiClient.post<ApiResponse<Message>>('/messages', data);
    return response.data.data as Message;
  },

  markAsRead: async (userId: string): Promise<{ updated: number }> => {
    const response = await apiClient.patch<ApiResponse<{ updated: number }>>('/messages/read', null, {
      params: { userId },
    });
    return response.data.data as { updated: number };
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/messages/unread-count');
    return response.data.data as { count: number };
  },

  deleteMessage: async (id: string): Promise<void> => {
    await apiClient.delete(`/messages/${id}`);
  },
};
