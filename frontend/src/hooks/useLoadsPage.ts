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

export interface PaginationModel {
  page: number;   // 0-based for MUI DataGrid
  pageSize: number;
}

export const useLoadsPage = (filters: LoadsPageFilters) => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<PaginationModel>({ page: 0, pageSize: 10 });
  // Stats from a single "all loads" count — fetched once on mount
  const [stats, setStats] = useState({ total: 0, booked: 0, inTransit: 0, delivered: 0, completed: 0, totalRevenue: 0 });

  const fetchingLoadsRef = useRef(false);
  const fetchLoads = useCallback(async (pagination?: PaginationModel, statusOverride?: string) => {
    if (fetchingLoadsRef.current) return;
    fetchingLoadsRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const p = pagination ?? paginationModel;
      const params: Record<string, any> = {
        page: p.page + 1,   // backend is 1-based
        limit: p.pageSize,
      };
      const sf = statusOverride ?? filters.statusFilter;
      if (sf && sf !== 'all') params.status = sf;
      const data = await loadService.getLoads(params);
      setLoads(data.loads ?? []);
      setTotalRows(data.pagination?.total ?? 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch loads';
      setError(msg);
    } finally {
      setLoading(false);
      fetchingLoadsRef.current = false;
    }
  }, [paginationModel, filters.statusFilter]);

  // Fetch stats (counts per status) once on mount — lightweight aggregate
  const fetchStats = useCallback(async () => {
    try {
      // Fetch all loads without limit just for stats (use the existing API with a large limit or separate stats endpoint)
      const allData = await loadService.getLoads({ page: 1, limit: 1 });
      const total = allData.pagination?.total ?? 0;
      // We'll also fetch per-status counts by making a few calls or computing from totalRows
      // For simplicity, fetch all IDs with status info only
      const fullData = await loadService.getLoads({ page: 1, limit: 99999 });
      const allLoads = fullData.loads ?? [];
      const booked = allLoads.filter(
        (l) => l.status === 'booked' || l.status === 'rate_confirmed'
      ).length;
      const inTransit = allLoads.filter((l) =>
        ['assigned', 'trip_accepted', 'trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'].includes(l.status)
      ).length;
      const delivered = allLoads.filter((l) => l.status === 'delivered').length;
      const completed = allLoads.filter((l) => l.status === 'completed').length;
      const totalRevenue = allLoads
        .filter((l) => ['delivered', 'completed'].includes(l.status))
        .reduce((sum, l) => sum + (l.rate ?? 0), 0);
      setStats({ total, booked, inTransit, delivered, completed, totalRevenue });
    } catch {
      // Stats are secondary; don't block
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
    fetchLoads();
    fetchStats();
  }, [fetchLoads, fetchStats]);

  // Re-fetch when pagination or status filter changes
  const prevPagRef = useRef(paginationModel);
  const prevStatusRef = useRef(filters.statusFilter);
  useEffect(() => {
    if (
      prevPagRef.current.page !== paginationModel.page ||
      prevPagRef.current.pageSize !== paginationModel.pageSize ||
      prevStatusRef.current !== filters.statusFilter
    ) {
      prevPagRef.current = paginationModel;
      prevStatusRef.current = filters.statusFilter;
      fetchLoads(paginationModel, filters.statusFilter);
    }
  }, [paginationModel, filters.statusFilter, fetchLoads]);

  // Client-side search/priority filtering on the current page of loads
  const filteredLoads = useMemo(() => {
    let result = [...loads];
    const { searchTerm, priorityFilter } = filters;

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
          ((load as unknown as Record<string, unknown>).commodity as string)?.toLowerCase().includes(lower) ||
          ((load as unknown as Record<string, unknown>).cargoType as string)?.toLowerCase().includes(lower)
        );
      });
    }

    if (priorityFilter !== 'all') {
      result = result.filter((l) => (l as unknown as Record<string, unknown>).priority === priorityFilter);
    }

    return result;
  }, [loads, filters.searchTerm, filters.priorityFilter]);

  const handlePaginationModelChange = useCallback((model: PaginationModel) => {
    setPaginationModel(model);
  }, []);

  const assignLoad = useCallback(
    async (
      loadId: string,
      assignment: { driverId: string; truckId: string; trailerId: string }
    ) => {
      await loadService.assignLoad(loadId, assignment);
      await fetchLoads();
      fetchStats();
    },
    [fetchLoads, fetchStats]
  );

  const unassignLoad = useCallback(
    async (loadId: string, reason?: string) => {
      await loadService.unassignLoad(loadId, reason);
      await fetchLoads();
      fetchStats();
    },
    [fetchLoads, fetchStats]
  );

  const createLoad = useCallback(
    async (data: LoadFormData) => {
      await loadService.createLoad(data);
      await fetchLoads();
      fetchStats();
    },
    [fetchLoads, fetchStats]
  );

  const updateLoad = useCallback(
    async (id: string, data: Partial<LoadFormData>) => {
      await loadService.updateLoad(id, data);
      await fetchLoads();
      fetchStats();
    },
    [fetchLoads, fetchStats]
  );

  const deleteLoad = useCallback(
    async (id: string) => {
      await loadService.deleteLoad(id);
      await fetchLoads();
      fetchStats();
    },
    [fetchLoads, fetchStats]
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
      fetchStats();
    },
    [fetchLoads, fetchStats]
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
    totalRows,
    paginationModel,
    handlePaginationModelChange,
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
