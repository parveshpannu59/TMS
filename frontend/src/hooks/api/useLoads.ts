import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { loadApi, Load } from '@/api/load.api';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface UseLoadsOptions {
  page?: number;
  limit?: number;
  status?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const LOADS_QUERY_KEY = 'loads';

export const useLoads = (options: UseLoadsOptions = {}) => {
  return useQuery({
    queryKey: [LOADS_QUERY_KEY, options],
    queryFn: async () => {
      const loads = await loadApi.getAllLoads(options);
      return loads;
    },
  });
};

export const useInfiniteLoads = (options: Omit<UseLoadsOptions, 'page'> = {}) => {
  return useInfiniteQuery({
    queryKey: [LOADS_QUERY_KEY, 'infinite', options],
    queryFn: async ({ pageParam = 1 }) => {
      const loads = await loadApi.getAllLoads({ ...options, page: pageParam });
      return loads as PaginatedResponse<Load>;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination?.hasNextPage
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
  });
};

export const useLoadById = (id: string | undefined) => {
  return useQuery({
    queryKey: [LOADS_QUERY_KEY, id],
    queryFn: () => loadApi.getLoadById(id!),
    enabled: !!id,
  });
};

export const useLoadStats = () => {
  return useQuery({
    queryKey: [LOADS_QUERY_KEY, 'stats'],
    queryFn: loadApi.getLoadStats,
  });
};

export const useCreateLoad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loadApi.createLoad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOADS_QUERY_KEY] });
    },
  });
};

export const useUpdateLoad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Load> }) =>
      loadApi.updateLoad(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOADS_QUERY_KEY] });
    },
  });
};

export const useDeleteLoad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loadApi.deleteLoad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOADS_QUERY_KEY] });
    },
  });
};

export const useAssignLoad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      loadApi.assignLoad(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOADS_QUERY_KEY] });
    },
  });
};

export const useUpdateLoadStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      loadApi.updateLoadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOADS_QUERY_KEY] });
    },
  });
};
