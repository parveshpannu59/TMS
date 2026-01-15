import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { userApi } from '@/api/user.api';
import type { User, UserStats } from '@/types/user.types';

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

interface UseUsersOptions {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

const USERS_QUERY_KEY = 'users';

export const useUsers = (options: UseUsersOptions = {}) => {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.role) params.append('role', options.role);
      if (options.status) params.append('status', options.status);
      if (options.search) params.append('search', options.search);

      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      return result.data as PaginatedResponse<User>;
    },
  });
};

export const useInfiniteUsers = (options: Omit<UseUsersOptions, 'page'> = {}) => {
  return useInfiniteQuery({
    queryKey: [USERS_QUERY_KEY, 'infinite', options],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', pageParam.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.role) params.append('role', options.role);
      if (options.status) params.append('status', options.status);
      if (options.search) params.append('search', options.search);

      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      return result.data as PaginatedResponse<User>;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
  });
};

export const useUserStats = () => {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, 'stats'],
    queryFn: async () => {
      const stats = await userApi.getUserStats();
      return stats;
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      userApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { oldPassword: string; newPassword: string } }) =>
      userApi.changePassword(id, data),
  });
};
