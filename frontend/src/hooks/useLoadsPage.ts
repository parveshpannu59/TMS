import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { loadService } from '@/services/loadService';
import type { Load, LoadFormData } from '@/api/load.api';
import type { Truck } from '@/api/truck.api';
import type { Trailer } from '@/api/trailer.api';
import type { Driver } from '@/api/driver.api';

type LoadsPageFilters = {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
};

export const useLoadsPage = (filters: LoadsPageFilters) => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchingLoadsRef = useRef(false);
  const fetchLoads = useCallback(async () => {
    if (fetchingLoadsRef.current) return;
    fetchingLoadsRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const data = await loadService.getLoads();
      setLoads(data.loads ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch loads';
      setError(msg);
    } finally {
      setLoading(false);
      fetchingLoadsRef.current = false;
    }
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const { trucks: t, trailers: tr, drivers: d } = await loadService.getAssignmentResources();
      setTrucks(t);
      setTrailers(tr);
      setDrivers(d);
    } catch {
      // Resources are optional for assign dialog; load list still works
    }
  }, []);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    fetchLoads(); // Only 1 API call on mount; fetchResources runs when Assign dialog opens
  }, [fetchLoads]);

  const stats = useMemo(() => {
    const total = loads.length;
    const booked = loads.filter(
      (l) => l.status === 'booked' || l.status === 'rate_confirmed'
    ).length;
    const inTransit = loads.filter((l) =>
      ['assigned', 'trip_accepted', 'trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'].includes(l.status)
    ).length;
    const delivered = loads.filter((l) => l.status === 'delivered').length;
    const completed = loads.filter((l) => l.status === 'completed').length;
    const totalRevenue = loads
      .filter((l) => ['delivered', 'completed'].includes(l.status))
      .reduce((sum, l) => sum + (l.rate ?? 0), 0);
    return { total, booked, inTransit, delivered, completed, totalRevenue };
  }, [loads]);

  const filteredLoads = useMemo(() => {
    let result = [...loads];
    const { searchTerm, statusFilter, priorityFilter } = filters;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((load) => {
        const pickup = (load as unknown as Record<string, unknown>).pickupLocation ?? (load as unknown as Record<string, unknown>).origin;
        const delivery = (load as unknown as Record<string, unknown>).deliveryLocation ?? (load as unknown as Record<string, unknown>).destination;
        const p = pickup as Record<string, unknown> | undefined;
        const d = delivery as Record<string, unknown> | undefined;
        return (
          (load.loadNumber?.toLowerCase().includes(lower)) ||
          (p?.city as string)?.toLowerCase().includes(lower) ||
          (p?.state as string)?.toLowerCase().includes(lower) ||
          (d?.city as string)?.toLowerCase().includes(lower) ||
          (d?.state as string)?.toLowerCase().includes(lower) ||
          (load.broker as string)?.toLowerCase().includes(lower) ||
          ((load as Record<string, unknown>).commodity as string)?.toLowerCase().includes(lower) ||
          ((load as Record<string, unknown>).cargoType as string)?.toLowerCase().includes(lower)
        );
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      result = result.filter((l) => (l as Record<string, unknown>).priority === priorityFilter);
    }

    return result;
  }, [loads, filters.searchTerm, filters.statusFilter, filters.priorityFilter]);

  const assignLoad = useCallback(
    async (
      loadId: string,
      assignment: { driverId: string; truckId: string; trailerId: string }
    ) => {
      await loadService.assignLoad(loadId, assignment);
      await fetchLoads();
    },
    [fetchLoads]
  );

  const unassignLoad = useCallback(
    async (loadId: string, reason?: string) => {
      await loadService.unassignLoad(loadId, reason);
      await fetchLoads();
    },
    [fetchLoads]
  );

  const createLoad = useCallback(
    async (data: LoadFormData) => {
      await loadService.createLoad(data);
      await fetchLoads();
    },
    [fetchLoads]
  );

  const updateLoad = useCallback(
    async (id: string, data: Partial<LoadFormData>) => {
      await loadService.updateLoad(id, data);
      await fetchLoads();
    },
    [fetchLoads]
  );

  const deleteLoad = useCallback(
    async (id: string) => {
      await loadService.deleteLoad(id);
      await fetchLoads();
    },
    [fetchLoads]
  );

  const confirmRate = useCallback(
    async (
      id: string,
      data: {
        trackingLink: string;
        pickupAddress: { address: string; city: string; state: string; pincode: string };
        deliveryAddress: { address: string; city: string; state: string; pincode: string };
        miles: number;
      }
    ) => {
      await loadService.confirmRate(id, data);
      await fetchLoads();
    },
    [fetchLoads]
  );

  return {
    loads,
    filteredLoads,
    trucks,
    trailers,
    drivers,
    loading,
    error,
    stats,
    fetchLoads,
    fetchResources,
    assignLoad,
    unassignLoad,
    createLoad,
    updateLoad,
    deleteLoad,
    confirmRate,
    setError,
  };
};
