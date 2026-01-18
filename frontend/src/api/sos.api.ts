import axios from 'axios';
import type { SOSEmergency, CreateSOSData } from '@/types/trip.types';

const API_URL = `${import.meta.env.VITE_API_URL}/sos`;

export const sosApi = {
  /**
   * Create SOS emergency alert
   */
  createSOS: async (data: CreateSOSData): Promise<SOSEmergency> => {
    const response = await axios.post(API_URL, data);
    return response.data.data;
  },

  /**
   * Get driver's SOS history
   */
  getMySOSHistory: async (): Promise<SOSEmergency[]> => {
    const response = await axios.get(`${API_URL}/my-history`);
    return response.data.data;
  },

  /**
   * Get active SOS alerts (for dispatcher/owner)
   */
  getActiveSOS: async (): Promise<SOSEmergency[]> => {
    const response = await axios.get(`${API_URL}/active`);
    return response.data.data;
  },

  /**
   * Acknowledge SOS alert
   */
  acknowledgeSOS: async (sosId: string): Promise<SOSEmergency> => {
    const response = await axios.patch(`${API_URL}/${sosId}/acknowledge`);
    return response.data.data;
  },

  /**
   * Resolve SOS alert
   */
  resolveSOS: async (sosId: string, resolutionNotes: string): Promise<SOSEmergency> => {
    const response = await axios.patch(`${API_URL}/${sosId}/resolve`, {
      resolutionNotes,
    });
    return response.data.data;
  },
};

export default sosApi;
