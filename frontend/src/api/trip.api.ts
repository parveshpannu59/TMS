import axios from 'axios';
import type {
  Trip,
  StartTripData,
  UpdateTripLocationData,
  EndTripData,
} from '@/types/trip.types';

const API_URL = `${import.meta.env.VITE_API_URL}/trips`;

// Helper function to upload file to server
const uploadFile = async (file: File | string): Promise<string> => {
  if (typeof file === 'string') {
    return file; // Already a URL
  }

  const formData = new FormData();
  formData.append('file', file);

  // In production, implement proper file upload endpoint
  // For now, return a placeholder
  return URL.createObjectURL(file);
};

export const tripApi = {
  /**
   * Start a new trip
   */
  startTrip: async (data: StartTripData): Promise<Trip> => {
    // Upload odometer photo
    const odometerPhotoUrl = await uploadFile(data.odometerStartPhoto);

    const response = await axios.post(`${API_URL}/start`, {
      ...data,
      odometerStartPhoto: odometerPhotoUrl,
    });
    return response.data.data;
  },

  /**
   * Get current active trip
   */
  getCurrentTrip: async (): Promise<Trip | null> => {
    const response = await axios.get(`${API_URL}/current`);
    return response.data.data;
  },

  /**
   * Update trip location
   */
  updateLocation: async (data: UpdateTripLocationData): Promise<Trip> => {
    const response = await axios.patch(`${API_URL}/${data.tripId}/location`, {
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      distanceTraveled: data.distanceTraveled,
      distanceRemaining: data.distanceRemaining,
    });
    return response.data.data;
  },

  /**
   * Complete trip
   */
  completeTrip: async (data: EndTripData): Promise<Trip> => {
    // Upload files
    const odometerEndPhotoUrl = await uploadFile(data.odometerEndPhoto);
    const bolUrl = data.documents.billOfLading
      ? await uploadFile(data.documents.billOfLading)
      : null;
    const podUrl = data.documents.proofOfDelivery
      ? await uploadFile(data.documents.proofOfDelivery)
      : null;
    
    let otherUrls: string[] = [];
    if (data.documents.other && data.documents.other.length > 0) {
      otherUrls = await Promise.all(
        data.documents.other.map(file => uploadFile(file))
      );
    }

    const response = await axios.patch(`${API_URL}/${data.tripId}/complete`, {
      endingMileage: data.endingMileage,
      odometerEndPhoto: odometerEndPhotoUrl,
      expenses: data.expenses,
      documents: {
        billOfLading: bolUrl,
        proofOfDelivery: podUrl,
        other: otherUrls,
      },
      notes: data.notes,
    });
    return response.data.data;
  },

  /**
   * Get trip by ID
   */
  getTripById: async (id: string): Promise<Trip> => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data.data;
  },

  /**
   * Get trip history
   */
  getTripHistory: async (page: number = 1, limit: number = 10) => {
    const response = await axios.get(`${API_URL}/history`, {
      params: { page, limit },
    });
    return response.data.data;
  },

  /**
   * Update trip status
   */
  updateTripStatus: async (tripId: string, status: string): Promise<Trip> => {
    const response = await axios.patch(`${API_URL}/${tripId}/status`, {
      status,
    });
    return response.data.data;
  },
};

export default tripApi;
