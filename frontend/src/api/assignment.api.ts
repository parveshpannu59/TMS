import { apiClient } from './client';

const API_PREFIX = '/assignments';

export const assignmentApi = {
  /**
   * Get pending assignments for current driver
   */
  getPendingAssignments: async () => {
    const response = await apiClient.get(`${API_PREFIX}/me/pending`);
    return response.data.data;
  },

  /**
   * Get all assignments for current driver (including history)
   */
  getMyAssignments: async () => {
    const response = await apiClient.get(`${API_PREFIX}/me`);
    return response.data.data;
  },

  /**
   * Get single assignment by ID
   */
  getAssignment: async (id: string) => {
    const response = await apiClient.get(`${API_PREFIX}/${id}`);
    return response.data.data;
  },

  /**
   * Accept an assignment
   */
  acceptAssignment: async (id: string) => {
    const response = await apiClient.post(`${API_PREFIX}/${id}/accept`);
    return response.data.data;
  },

  /**
   * Reject an assignment
   */
  rejectAssignment: async (id: string, reason?: string) => {
    const response = await apiClient.post(`${API_PREFIX}/${id}/reject`, { reason });
    return response.data.data;
  },

  /**
   * Get all assignments (dispatcher/owner view)
   */
  getAllAssignments: async (filters?: {
    status?: string;
    driverId?: string;
    loadId?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get(API_PREFIX, { params: filters });
    return response.data.data;
  },
};

export default assignmentApi;
