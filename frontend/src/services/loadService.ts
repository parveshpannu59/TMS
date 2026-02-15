/**
 * Load service - encapsulates load-related API calls.
 * Components use this via hooks; no direct API calls in UI.
 */
import { loadApi } from '@/api/load.api';
import { truckApi } from '@/api/truck.api';
import { trailerApi } from '@/api/trailer.api';
import { driverApi } from '@/api/driver.api';
import type { Load, LoadFormData, LoadsResponse } from '@/api/load.api';
import type { Truck } from '@/api/truck.api';
import type { Trailer } from '@/api/trailer.api';
import type { Driver } from '@/api/driver.api';

export const loadService = {
  getLoads: (params?: Parameters<typeof loadApi.getLoads>[0]): Promise<LoadsResponse> =>
    loadApi.getLoads(params),

  getLoadById: (id: string): Promise<Load> =>
    loadApi.getLoadById(id),

  createLoad: (data: LoadFormData): Promise<Load> =>
    loadApi.createLoad(data),

  updateLoad: (id: string, data: Partial<LoadFormData>): Promise<Load> =>
    loadApi.updateLoad(id, data),

  deleteLoad: (id: string): Promise<void> =>
    loadApi.deleteLoad(id),

  assignLoad: (
    id: string,
    assignment: { driverId: string; truckId: string; trailerId: string }
  ): Promise<Load> =>
    loadApi.assignLoad(id, assignment),

  unassignLoad: (id: string, reason?: string): Promise<Load> =>
    loadApi.unassignLoad(id, reason),

  editAssignment: (
    id: string,
    data: { driverId?: string; truckId?: string; trailerId?: string; rate?: number }
  ): Promise<Load> =>
    loadApi.editAssignment(id, data),

  confirmRate: (
    id: string,
    data: {
      trackingLink: string;
      pickupAddress: { address: string; city: string; state: string; pincode: string };
      deliveryAddress: { address: string; city: string; state: string; pincode: string };
      miles: number;
    }
  ): Promise<Load> =>
    loadApi.confirmRate(id, data),

  getAssignmentResources: async (): Promise<{
    trucks: Truck[];
    trailers: Trailer[];
    drivers: Driver[];
  }> => {
    const [trucks, trailers, drivers] = await Promise.all([
      truckApi.getTrucks('available'),
      trailerApi.getTrailers({ status: 'available' }),
      driverApi.getDrivers('available'),
    ]);
    return { trucks, trailers, drivers };
  },
};
