import { apiClient } from './client';

export interface LoadFormData {
  origin: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    contactName?: string;
    contactPhone?: string;
    appointmentTime?: Date | string;
    instructions?: string;
  };
  destination: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    contactName?: string;
    contactPhone?: string;
    appointmentTime?: Date | string;
    instructions?: string;
  };
  pickupDate: Date | string;
  deliveryDate: Date | string;
  miles: number;
  weight?: number;
  commodity?: string;
  loadType?: 'ltl' | 'ftl' | 'partial';
  equipmentType?: string;
  rate: number;
  broker: string;
  brokerContact?: string;
  brokerPhone?: string;
  brokerEmail?: string;
  paymentTerms?: string;
  driverRate?: number;
  specialInstructions?: string;
  internalNotes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface Load extends LoadFormData {
  _id: string;
  loadNumber: string;
  companyId: string;
  driverId?: {
    _id: string;
    name: string;
    email: string;
  };
  truckId?: {
    _id: string;
    unitNumber: string;
    make: string;
    model: string;
  };
  trailerId?: {
    _id: string;
    unitNumber: string;
    type: string;
  };
  status: string;
  hasRateConfirmation: boolean;
  hasBOL: boolean;
  hasPOD: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LoadsResponse {
  loads: Load[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const loadApi = {
  // Get all loads
  getLoads: async (params?: {
    status?: string;
    driverId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<LoadsResponse> => {
    const response = await apiClient.get('/loads', { params });
    return response.data.data;
  },

  // Get single load
  getLoadById: async (id: string): Promise<Load> => {
    const response = await apiClient.get(`/loads/${id}`);
    return response.data.data;
  },

  // Create load
  createLoad: async (data: LoadFormData): Promise<Load> => {
    const response = await apiClient.post('/loads', data);
    return response.data.data;
  },

  // Update load
  updateLoad: async (id: string, data: Partial<LoadFormData>): Promise<Load> => {
    const response = await apiClient.put(`/loads/${id}`, data);
    return response.data.data;
  },

  // Assign load
  assignLoad: async (
    id: string,
    assignment: { driverId: string; truckId: string; trailerId: string }
  ): Promise<Load> => {
    const response = await apiClient.post(`/loads/${id}/assign`, assignment);
    return response.data.data;
  },

  // Update status
  updateStatus: async (
    id: string,
    statusData: {
      status: string;
      notes?: string;
      location?: { lat: number; lng: number };
    }
  ): Promise<Load> => {
    const response = await apiClient.patch(`/loads/${id}/status`, statusData);
    return response.data.data;
  },

  // Delete load
  deleteLoad: async (id: string): Promise<void> => {
    await apiClient.delete(`/loads/${id}`);
  },

  // Broker confirms rate
  confirmRate: async (
    id: string,
    data: {
      trackingLink: string;
      pickupAddress: {
        address: string;
        city: string;
        state: string;
        pincode: string;
      };
      deliveryAddress: {
        address: string;
        city: string;
        state: string;
        pincode: string;
      };
      miles: number;
    }
  ): Promise<Load> => {
    const response = await apiClient.post(`/loads/${id}/confirm-rate`, data);
    return response.data.data;
  },

  // Driver accepts trip
  acceptTrip: async (id: string): Promise<Load> => {
    const response = await apiClient.post(`/loads/${id}/accept-trip`);
    return response.data.data;
  },

  // Driver submits form details
  submitDriverForm: async (
    id: string,
    data: {
      loadNumber: string;
      pickupReferenceNumber: string;
      pickupTime: string;
      pickupPlace: string;
      pickupDate: string;
      pickupLocation: string;
      dropoffReferenceNumber: string;
      dropoffTime: string;
      dropoffLocation: string;
      dropoffDate: string;
    }
  ): Promise<Load> => {
    const response = await apiClient.post(`/loads/${id}/driver-form`, data);
    return response.data.data;
  },
};
