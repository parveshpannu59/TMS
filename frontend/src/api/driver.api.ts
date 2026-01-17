import { apiClient } from './client';

export interface DriverFormData {
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date | string;
  status?: 'available' | 'on_duty' | 'off_duty' | 'on_leave';
}

export interface Driver {
  _id: string;
  id?: string;
  companyId?: string;
  name?: string; // Driver model has name directly
  email?: string; // Driver model has email directly
  phone?: string; // Driver model has phone directly
  userId?: string | {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  licenseNumber: string;
  licenseExpiry: Date | string;
  status: 'available' | 'on_duty' | 'off_duty' | 'on_leave';
  currentLoadId?: any;
  createdAt: string;
  updatedAt: string;
}

export const driverApi = {
  // Get all drivers
  getDrivers: async (status?: string): Promise<Driver[]> => {
    const response = await apiClient.get('/drivers', { params: { status, limit: 100 } });
    // Handle paginated response
    const responseData = response.data.data;
    return Array.isArray(responseData) ? responseData : responseData.data || [];
  },

  // Get single driver
  getDriverById: async (id: string): Promise<Driver> => {
    const response = await apiClient.get(`/drivers/${id}`);
    return response.data.data;
  },

  // Create driver
  createDriver: async (data: DriverFormData): Promise<Driver> => {
    const response = await apiClient.post('/drivers', data);
    return response.data.data;
  },

  // Update driver
  updateDriver: async (id: string, data: Partial<DriverFormData>): Promise<Driver> => {
    const response = await apiClient.put(`/drivers/${id}`, data);
    return response.data.data;
  },

  // Delete driver
  deleteDriver: async (id: string): Promise<void> => {
    await apiClient.delete(`/drivers/${id}`);
  },
};
