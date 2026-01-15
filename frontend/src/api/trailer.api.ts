import { apiClient } from './client';

export interface TrailerFormData {
  unitNumber: string;
  type: 'dry_van' | 'reefer' | 'flatbed' | 'step_deck' | 'lowboy' | 'tanker';
  make?: string;
  year?: number;
  vin: string;
  licensePlate: string;
  status?: 'available' | 'on_road' | 'in_maintenance' | 'out_of_service';
}

export interface Trailer extends TrailerFormData {
  _id: string;
  companyId: string;
  status: 'available' | 'on_road' | 'in_maintenance' | 'out_of_service';
  currentLoadId?: any;
  currentTruckId?: any;
  createdAt: string;
  updatedAt: string;
}

export const trailerApi = {
  // Get all trailers
  getTrailers: async (params?: { status?: string; type?: string }): Promise<Trailer[]> => {
    const response = await apiClient.get('/trailers', { params: { ...params, limit: 100 } });
    // Handle paginated response
    const responseData = response.data.data;
    return Array.isArray(responseData) ? responseData : responseData.data || [];
  },

  // Get single trailer
  getTrailerById: async (id: string): Promise<Trailer> => {
    const response = await apiClient.get(`/trailers/${id}`);
    return response.data.data;
  },

  // Create trailer
  createTrailer: async (data: TrailerFormData): Promise<Trailer> => {
    const response = await apiClient.post('/trailers', data);
    return response.data.data;
  },

  // Update trailer
  updateTrailer: async (id: string, data: Partial<TrailerFormData>): Promise<Trailer> => {
    const response = await apiClient.put(`/trailers/${id}`, data);
    return response.data.data;
  },

  // Delete trailer
  deleteTrailer: async (id: string): Promise<void> => {
    await apiClient.delete(`/trailers/${id}`);
  },
};
