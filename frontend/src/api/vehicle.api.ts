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

export type VehicleDocumentType = 'registration' | 'inspection' | 'title';
export type DocumentStatus = 'active' | 'expired' | 'expiring_soon' | 'archived';

export interface VehicleDocumentData {
  _id: string;
  vehicleId: string | Vehicle;
  companyId: string;
  documentType: VehicleDocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  expiryDate: string;
  issuedDate?: string;
  status: DocumentStatus;
  version: number;
  isLatest: boolean;
  notes?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const vehicleApi = {
  /**
   * Get all vehicles (supports server-side pagination when page/limit provided)
   */
  async getAll(params?: { status?: string; vehicleType?: string; page?: number; limit?: number; search?: string }): Promise<Vehicle[] | { vehicles: Vehicle[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
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
   * Upload vehicle document (legacy)
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

  // ── Vehicle Document Management (Registration, Inspection, Title) ──

  /**
   * Get all latest documents for a vehicle
   */
  async getDocuments(vehicleId: string): Promise<VehicleDocumentData[]> {
    const response = await apiClient.get(`/vehicles/${vehicleId}/documents`);
    return response.data.data;
  },

  /**
   * Get document history (all versions) for a vehicle
   */
  async getDocumentHistory(vehicleId: string, documentType?: VehicleDocumentType): Promise<VehicleDocumentData[]> {
    const response = await apiClient.get(`/vehicles/${vehicleId}/documents/history`, {
      params: documentType ? { documentType } : {},
    });
    return response.data.data;
  },

  /**
   * Upload a new vehicle document (Registration/Inspection/Title PDF)
   */
  async uploadVehicleDoc(
    vehicleId: string,
    file: File,
    documentType: VehicleDocumentType,
    expiryDate: string,
    issuedDate?: string,
    notes?: string
  ): Promise<VehicleDocumentData> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('expiryDate', expiryDate);
    if (issuedDate) formData.append('issuedDate', issuedDate);
    if (notes) formData.append('notes', notes);

    const response = await apiClient.post(`/vehicles/${vehicleId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  /**
   * Delete a vehicle document
   */
  async deleteVehicleDoc(vehicleId: string, documentId: string): Promise<void> {
    await apiClient.delete(`/vehicles/${vehicleId}/documents/${documentId}`);
  },

  /**
   * Search documents across all vehicles
   */
  async searchDocuments(params: {
    q?: string;
    status?: DocumentStatus;
    documentType?: VehicleDocumentType;
  }): Promise<VehicleDocumentData[]> {
    const response = await apiClient.get('/vehicle-documents/search', { params });
    return response.data.data;
  },

  /**
   * Get expiring documents
   */
  async getExpiringDocuments(): Promise<VehicleDocumentData[]> {
    const response = await apiClient.get('/vehicle-documents/expiring');
    return response.data.data;
  },
};
