import { apiClient } from './client';

export interface DriverFormData {
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date | string;
  status?: 'active' | 'inactive' | 'on_trip';
  notes?: string;
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
  status: 'active' | 'inactive' | 'on_trip';
  currentLoadId?: any;
  documents?: {
    photo?: string;
    license?: string;
    aadhar?: string;
    pan?: string;
    others?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export const driverApi = {
  // Get my driver profile (for logged-in driver)
  getMyProfile: async (): Promise<Driver> => {
    const response = await apiClient.get('/drivers/me/profile');
    return response.data.data;
  },

  // Get my duty status
  getMyDutyStatus: async (): Promise<{ status: string; dutyLabel: string; currentLoadId: string | null; driverName: string }> => {
    const response = await apiClient.get('/drivers/me/duty-status');
    return response.data.data;
  },

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

  // Upload driver photo
  uploadPhoto: async (id: string, file: File): Promise<Driver> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/drivers/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  // Upload driver document (license, aadhar, pan, other)
  uploadDocument: async (id: string, file: File, type: 'license' | 'aadhar' | 'pan' | 'other'): Promise<Driver> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const response = await apiClient.post(`/drivers/${id}/document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};
