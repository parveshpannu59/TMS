import { apiClient } from './client';
import type { ApiResponse } from '../types/api.types';
import type {
  Load,
  CreateLoadData,
  LoadStats,
  Driver,
  CreateDriverData,
  Truck,
  CreateTruckData,
  GPSLocation,
  Location,
} from '../types/all.types';
import { LoadStatus } from '../types/all.types';

// LOAD API
export const loadApi = {
  createLoad: async (data: CreateLoadData): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>('/loads', data);
    return response.data.data as Load;
  },

  // Fetch all loads; backend returns { loads, pagination }
  getAllLoads: async (params?: Record<string, any>): Promise<Load[]> => {
    const response = await apiClient.get<ApiResponse<{ loads: Load[]; pagination: any }>>('/loads', {
      params,
    });
    const data = response.data.data as unknown as { loads: Load[]; pagination: any };
    return Array.isArray((data as any).loads) ? (data as any).loads : [];
  },

  // Get loads assigned to current driver — supports pagination
  getMyAssignedLoads: async (params?: { page?: number; limit?: number; status?: string }): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>('/loads/me/assigned', { params });
    return response.data.data;
  },

  getLoadById: async (id: string): Promise<Load> => {
    const response = await apiClient.get<ApiResponse<Load>>(`/loads/${id}`);
    return response.data.data as Load;
  },

  updateLoad: async (id: string, data: Partial<CreateLoadData>): Promise<Load> => {
    const response = await apiClient.put<ApiResponse<Load>>(`/loads/${id}`, data);
    return response.data.data as Load;
  },

  updateLoadStatus: async (id: string, status: LoadStatus, notes?: string): Promise<Load> => {
    const response = await apiClient.patch<ApiResponse<Load>>(`/loads/${id}/status`, {
      status,
      notes,
    });
    return response.data.data as Load;
  },

  deleteLoad: async (id: string): Promise<void> => {
    await apiClient.delete(`/loads/${id}`);
  },

  getLoadStats: async (): Promise<LoadStats> => {
    const response = await apiClient.get<ApiResponse<LoadStats>>('/loads/stats');
    return response.data.data as LoadStats;
  },

  // Broker confirms rate
  confirmRate: async (
    id: string,
    data: {
      trackingLink: string;
      pickupAddress: Location;
      deliveryAddress: Location;
      miles: number;
    }
  ): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/confirm-rate`, data);
    return response.data.data as Load;
  },

  // Driver accepts trip
  acceptTrip: async (id: string): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/accept-trip`);
    return response.data.data as Load;
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
      dropoffPlace?: string;
    }
  ): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/driver-form`, data);
    return response.data.data as Load;
  },

  // Upload document for load (odometer, BOL, POD)
  uploadLoadDocument: async (loadId: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      `/loads/${loadId}/upload-document`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data!.url;
  },

  // Trip workflow endpoints
  startTrip: async (
    id: string,
    data: {
      startingMileage: number;
      startingPhoto: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/start-trip`, data);
    return response.data.data as Load;
  },

  shipperCheckIn: async (
    id: string,
    data: {
      poNumber?: string;
      loadNumber?: string;
      referenceNumber?: string;
      latitude?: number;
      longitude?: number;
      latePassAmount?: number;
      latePassPhoto?: string;
      hasLatePass?: boolean;
    }
  ): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/shipper-check-in`, data);
    return response.data.data as Load;
  },

  shipperLoadIn: async (
    id: string,
    data?: {
      confirmationDetails?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/shipper-load-in`, data || {});
    return response.data.data as Load;
  },

  shipperLoadOut: async (
    id: string,
    data: {
      bolDocument: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/shipper-load-out`, data);
    return response.data.data as Load;
  },

  receiverCheckIn: async (id: string, data?: { latitude?: number; longitude?: number }): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/receiver-check-in`, data || {});
    return response.data.data as Load;
  },

  receiverOffload: async (
    id: string,
    data: {
      quantity?: string;
      additionalDetails?: string;
      bolAcknowledged: boolean;
      podDocument?: string;
      podPhoto?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/receiver-offload`, data);
    return response.data.data as Load;
  },

  reportDelay: async (loadId: string, data: { reason: string; notes?: string }): Promise<void> => {
    await apiClient.post(`/loads/${loadId}/report-delay`, data);
  },

  updateLocation: async (
    id: string,
    data: { lat: number; lng: number; speed?: number; heading?: number; accuracy?: number }
  ): Promise<void> => {
    await apiClient.post(`/loads/${id}/update-location`, data);
  },

  getLocationHistory: async (
    id: string
  ): Promise<{
    currentLocation: { lat: number; lng: number; timestamp: string; speed?: number } | null;
    locationHistory: { lat: number; lng: number; timestamp: string; speed?: number }[];
    pickupLocation: any;
    deliveryLocation: any;
    status: string;
    loadNumber: string;
    driverName: string;
  }> => {
    const response = await apiClient.get<ApiResponse<any>>(`/loads/${id}/location-history`);
    return response.data.data;
  },

  addExpense: async (
    loadId: string,
    data: {
      category: string;
      type?: string;
      amount: number;
      date?: string;
      location?: string;
      description?: string;
      receiptUrl?: string;
      paidBy?: string;
      fuelQuantity?: number;
      fuelStation?: string;
      odometerBefore?: number;
      odometerAfter?: number;
      odometerBeforePhoto?: string;
      odometerAfterPhoto?: string;
      repairStartTime?: string;
      repairEndTime?: string;
      repairDescription?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(`/loads/${loadId}/expenses`, data);
    return response.data.data;
  },

  getLoadExpenses: async (loadId: string): Promise<{ expenses: any[]; summary: { total: number; fuel: number; tolls: number; other: number } }> => {
    const response = await apiClient.get<ApiResponse<any>>(`/loads/${loadId}/expenses`);
    return response.data.data;
  },

  endTrip: async (
    id: string,
    data?: {
      endingMileage?: number;
      endingPhoto?: string;
      totalMiles?: number;
      rate?: number;
      fuelExpenses?: number;
      tolls?: number;
      otherCosts?: number;
      additionalExpenseDetails?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<Load> => {
    const response = await apiClient.post<ApiResponse<Load>>(`/loads/${id}/end-trip`, data || {});
    return response.data.data as Load;
  },

  // SOS/Emergency notification
  sendSOS: async (
    id: string,
    data: {
      message: string;
      location?: string;
      emergencyType?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(`/loads/${id}/sos`, data);
    return response.data.data;
  },

  // Expense approval (Owner/Dispatcher)
  getPendingExpenses: async (): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>('/loads/expenses/pending');
    return response.data.data;
  },

  approveExpense: async (
    expenseId: string,
    data: { action: 'approve' | 'reject'; reimbursementAmount?: number; notes?: string }
  ): Promise<any> => {
    const response = await apiClient.patch<ApiResponse<any>>(`/loads/expenses/${expenseId}/approve`, data);
    return response.data.data;
  },

  markExpenseReimbursed: async (expenseId: string): Promise<any> => {
    const response = await apiClient.patch<ApiResponse<any>>(`/loads/expenses/${expenseId}/reimburse`, {});
    return response.data.data;
  },

  // Document Analysis (OCR/PDF reading)
  analyzeDocument: async (file: File): Promise<{
    documentType: string;
    summary: string;
    extractedFields: Record<string, string>;
    rawText: string;
    confidence: number;
    wordCount?: number;
    pageInfo?: string;
  }> => {
    const formData = new FormData();
    formData.append('document', file);
    const response = await apiClient.post<ApiResponse<any>>('/loads/documents/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};

// GPS API
export const gpsApi = {
  checkGPSStatus: async (): Promise<{ enabled: boolean }> => {
    const response = await apiClient.get<ApiResponse<{ enabled: boolean }>>('/gps/status');
    return response.data.data as { enabled: boolean };
  },

  updateLocation: async (
    loadId: string,
    location: { lat: number; lng: number; speed?: number; heading?: number }
  ): Promise<void> => {
    await apiClient.post('/gps/update-location', { loadId, ...location });
  },

  getCurrentLocation: async (loadId: string): Promise<GPSLocation | null> => {
    const response = await apiClient.get<ApiResponse<GPSLocation | null>>(
      `/gps/load/${loadId}/location`
    );
    return response.data.data || null;
  },

  getRouteData: async (loadId: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/gps/load/${loadId}/route`);
    return response.data.data;
  },

  startTracking: async (loadId: string): Promise<void> => {
    await apiClient.post(`/gps/start-tracking/${loadId}`);
  },

  stopTracking: async (loadId: string): Promise<void> => {
    await apiClient.post(`/gps/stop-tracking/${loadId}`);
  },
};

// DRIVER API
export const driverApi = {
  createDriver: async (data: CreateDriverData): Promise<Driver> => {
    const response = await apiClient.post<ApiResponse<Driver>>('/drivers', data);
    return response.data.data as Driver;
  },

  getAllDrivers: async (): Promise<Driver[]> => {
    const response = await apiClient.get<ApiResponse<Driver[]>>('/drivers');
    return response.data.data as Driver[];
  },

  getAvailableDrivers: async (): Promise<
    Array<{ id: string; name: string; phone: string; licenseNumber: string }>
  > => {
    const response = await apiClient.get<
      ApiResponse<Array<{ id: string; name: string; phone: string; licenseNumber: string }>>
    >('/drivers/available');
    return response.data.data as Array<{
      id: string;
      name: string;
      phone: string;
      licenseNumber: string;
    }>;
  },

  getDriverById: async (id: string): Promise<Driver> => {
    const response = await apiClient.get<ApiResponse<Driver>>(`/drivers/${id}`);
    return response.data.data as Driver;
  },

  updateDriver: async (id: string, data: Partial<CreateDriverData>): Promise<Driver> => {
    const response = await apiClient.put<ApiResponse<Driver>>(`/drivers/${id}`, data);
    return response.data.data as Driver;
  },

  deleteDriver: async (id: string): Promise<void> => {
    await apiClient.delete(`/drivers/${id}`);
  },

  getDriverStats: async (): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>('/drivers/stats');
    return response.data.data;
  },
};
// ASSIGNMENT API
export const assignmentApi = {
  getPendingAssignments: async (): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/assignments/me/pending');
    return response.data.data as any[];
  },

  getMyAssignments: async (): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/assignments/me');
    return response.data.data as any[];
  },

  getAssignment: async (id: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/assignments/${id}`);
    return response.data.data as any;
  },

  acceptAssignment: async (id: string): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(`/assignments/${id}/accept`);
    return response.data.data;
  },

  rejectAssignment: async (id: string, reason?: string): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(`/assignments/${id}/reject`, { reason });
    return response.data.data;
  },

  getAllAssignments: async (filters?: any): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>('/assignments', { params: filters });
    return response.data.data;
  },
};
// TRUCK API
export const truckApi = {
  createTruck: async (data: CreateTruckData): Promise<Truck> => {
    const response = await apiClient.post<ApiResponse<Truck>>('/trucks', data);
    return response.data.data as Truck;
  },

  getAllTrucks: async (): Promise<Truck[]> => {
    const response = await apiClient.get<ApiResponse<Truck[]>>('/trucks');
    return response.data.data as Truck[];
  },

  getAvailableTrucks: async (): Promise<
    Array<{
      id: string;
      truckNumber: string;
      make: string;
      model: string;
      capacity: number;
      truckType: string;
    }>
  > => {
    const response = await apiClient.get<
      ApiResponse<
        Array<{
          id: string;
          truckNumber: string;
          make: string;
          model: string;
          capacity: number;
          truckType: string;
        }>
      >
    >('/trucks/available');
    return response.data.data as Array<{
      id: string;
      truckNumber: string;
      make: string;
      model: string;
      capacity: number;
      truckType: string;
    }>;
  },

  getTruckById: async (id: string): Promise<Truck> => {
    const response = await apiClient.get<ApiResponse<Truck>>(`/trucks/${id}`);
    return response.data.data as Truck;
  },

  updateTruck: async (id: string, data: Partial<CreateTruckData>): Promise<Truck> => {
    const response = await apiClient.put<ApiResponse<Truck>>(`/trucks/${id}`, data);
    return response.data.data as Truck;
  },

  deleteTruck: async (id: string): Promise<void> => {
    await apiClient.delete(`/trucks/${id}`);
  },

  getTruckStats: async (): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>('/trucks/stats');
    return response.data.data;
  },
};