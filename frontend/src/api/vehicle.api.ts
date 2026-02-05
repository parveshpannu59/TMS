import { apiClient } from './client';

export interface Vehicle {
  _id?: string;
  id?: string;
  companyId: string;
  vehicleType: 'truck' | 'trailer';
  unitNumber: string;
  vehicleName: string;
  registrationNumber: string;
  make?: string;
  vehicleModel?: string;
  year?: number;
  vin: string;
  capacity?: string;
  status: 'available' | 'assigned' | 'on_road' | 'out_for_delivery' | 'in_maintenance' | 'out_of_service';
  currentLoadId?: string;
  currentDriverId?: string;
  trailerType?: string;
  currentTruckId?: string;
  vehicleImage?: string;
  documents?: {
    registration?: string;
    insurance?: string;
    permit?: string;
    fitness?: string;
    pollution?: string;
    others?: string[];
  };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleStats {
  available: number;
  assigned: number;
  outForDelivery: number;
  totalActive: number;
}

export interface CreateVehicleData {
  vehicleType: 'truck' | 'trailer';
  unitNumber: string;
  vehicleName: string;
  registrationNumber: string;
  make?: string;
  vehicleModel?: string;
  year?: number;
  vin: string;
  capacity?: string;
  trailerType?: string;
  notes?: string;
}

export const vehicleApi = {
  /**
   * Get all vehicles
   */
  async getAll(params?: { status?: string; vehicleType?: string }): Promise<Vehicle[]> {
    const response = await apiClient.get('/vehicles', { params });
    return response.data.data;
  },

  /**
   * Get vehicle stats for dashboard
   */
  async getStats(): Promise<VehicleStats> {
    const response = await apiClient.get('/vehicles/stats');
    return response.data.data;
  },

  /**
   * Get vehicles by status (for dashboard dialog)
   */
  async getByStatus(status: 'available' | 'assigned', vehicleType?: string): Promise<Vehicle[]> {
    const response = await apiClient.get('/vehicles/by-status', {
      params: { status, vehicleType },
    });
    return response.data.data;
  },

  /**
   * Get single vehicle by ID
   */
  async getById(id: string): Promise<Vehicle> {
    const response = await apiClient.get(`/vehicles/${id}`);
    return response.data.data;
  },

  /**
   * Create new vehicle
   */
  async create(data: CreateVehicleData): Promise<Vehicle> {
    const response = await apiClient.post('/vehicles', data);
    return response.data.data;
  },

  /**
   * Update vehicle
   */
  async update(id: string, data: Partial<CreateVehicleData>): Promise<Vehicle> {
    const response = await apiClient.put(`/vehicles/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete vehicle
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/vehicles/${id}`);
  },

  /**
   * Upload vehicle image
   */
  async uploadImage(id: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file); // Backend expects 'image' field name

    const response = await apiClient.post(`/vehicles/${id}/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Upload vehicle document
   */
  async uploadDocument(
    id: string,
    file: File,
    documentType: 'registration' | 'insurance' | 'permit' | 'fitness' | 'pollution' | 'other'
  ): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const response = await apiClient.post(`/vehicles/${id}/upload-document`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },
};
