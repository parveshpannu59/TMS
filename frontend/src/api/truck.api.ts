import { apiClient } from './client';

export interface TruckFormData {
  unitNumber: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  status?: 'available' | 'on_road' | 'in_maintenance' | 'out_of_service';
  notes?: string;
}

export interface Truck extends TruckFormData {
  _id: string;
  companyId: string;
  status: 'available' | 'on_road' | 'in_maintenance' | 'out_of_service';
  currentLoadId?: any;
  currentDriverId?: any;
  createdAt: string;
  updatedAt: string;
}

export const truckApi = {
  // Get all trucks
  getTrucks: async (status?: string): Promise<Truck[]> => {
    const response = await apiClient.get('/trucks', { params: { status, limit: 100 } });
    // Handle paginated response
    const responseData = response.data.data;
    return Array.isArray(responseData) ? responseData : responseData.data || [];
  },

  // Get single truck
  getTruckById: async (id: string): Promise<Truck> => {
    const response = await apiClient.get(`/trucks/${id}`);
    return response.data.data;
  },

  // Create truck
  createTruck: async (data: TruckFormData): Promise<Truck> => {
    const response = await apiClient.post('/trucks', data);
    return response.data.data;
  },

  // Update truck
  updateTruck: async (id: string, data: Partial<TruckFormData>): Promise<Truck> => {
    const response = await apiClient.put(`/trucks/${id}`, data);
    return response.data.data;
  },

  // Delete truck
  deleteTruck: async (id: string): Promise<void> => {
    await apiClient.delete(`/trucks/${id}`);
  },
};
