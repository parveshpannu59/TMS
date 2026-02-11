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

  // Send message with file attachment (multipart/form-data)
  sendMessageWithFile: async (data: {
    toUserId: string;
    loadId?: string;
    message?: string;
    messageType?: string;
    file: File;
  }): Promise<Message> => {
    const formData = new FormData();
    formData.append('toUserId', data.toUserId);
    if (data.loadId) formData.append('loadId', data.loadId);
    if (data.message) formData.append('message', data.message);
    if (data.messageType) formData.append('messageType', data.messageType);
    formData.append('file', data.file);

    const response = await apiClient.post<ApiResponse<Message>>('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data as Message;
  },

  markAsRead: async (userId: string): Promise<{ updated: number }> => {
    const response = await apiClient.patch<ApiResponse<{ updated: number }>>('/messages/read', {}, {
      params: { userId },
    });
    return response.data.data as { updated: number };
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/messages/unread-count');
    return response.data.data as { count: number };
  },

  sendTyping: async (toUserId: string, isTyping: boolean): Promise<void> => {
    await apiClient.post('/messages/typing', { toUserId, isTyping });
  },

  getUsers: async (): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/messages/users');
    return response.data.data as any[];
  },

  deleteMessage: async (id: string): Promise<void> => {
    await apiClient.delete(`/messages/${id}`);
  },

  // ─── Group Chat ──────────────────────────────────────────
  createGroup: async (data: { name: string; description?: string; members: string[] }): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>('/messages/groups', data);
    return response.data.data;
  },

  getGroups: async (): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/messages/groups');
    return response.data.data as any[];
  },

  getGroupMessages: async (groupId: string): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/messages/groups/${groupId}/messages`);
    return response.data.data as any[];
  },

  sendGroupMessage: async (groupId: string, data: { message?: string; messageType?: string }): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(`/messages/groups/${groupId}/messages`, data);
    return response.data.data;
  },

  sendGroupMessageWithFile: async (groupId: string, file: File, message?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (message) formData.append('message', message);
    const response = await apiClient.post<ApiResponse<any>>(`/messages/groups/${groupId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  markGroupAsRead: async (groupId: string): Promise<void> => {
    await apiClient.patch(`/messages/groups/${groupId}/read`, {});
  },

  addGroupMembers: async (groupId: string, members: string[]): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(`/messages/groups/${groupId}/members`, { members });
    return response.data.data;
  },

  removeGroupMember: async (groupId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`/messages/groups/${groupId}/members/${memberId}`);
  },

  updateGroup: async (groupId: string, data: { name?: string; description?: string }): Promise<any> => {
    const response = await apiClient.put<ApiResponse<any>>(`/messages/groups/${groupId}`, data);
    return response.data.data;
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    await apiClient.delete(`/messages/groups/${groupId}`);
  },
};
