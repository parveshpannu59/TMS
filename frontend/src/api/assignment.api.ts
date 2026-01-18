import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/assignments`;

export const assignmentApi = {
  /**
   * Get pending assignments for current driver
   */
  getPendingAssignments: async () => {
    const response = await axios.get(`${API_URL}/me/pending`);
    return response.data.data;
  },

  /**
   * Get all assignments for current driver (including history)
   */
  getMyAssignments: async () => {
    const response = await axios.get(`${API_URL}/me`);
    return response.data.data;
  },

  /**
   * Get single assignment by ID
   */
  getAssignment: async (id: string) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data.data;
  },

  /**
   * Accept an assignment
   */
  acceptAssignment: async (id: string) => {
    const response = await axios.post(`${API_URL}/${id}/accept`);
    return response.data.data;
  },

  /**
   * Reject an assignment
   */
  rejectAssignment: async (id: string, reason?: string) => {
    const response = await axios.post(`${API_URL}/${id}/reject`, { reason });
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
    const response = await axios.get(API_URL, { params: filters });
    return response.data.data;
  },
};

export default assignmentApi;
