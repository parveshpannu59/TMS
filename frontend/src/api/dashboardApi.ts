import { apiClient } from './client';
import type { ApiResponse } from '../types/api.types';
import { DashboardData, DashboardWidget } from '@/types/dashboard.types';

export interface OwnerDashboardData extends DashboardData {
  invoices?: {
    total: number;
    paid: number;
    unpaid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  };
  financialMetrics?: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    profitMargin: number;
    totalDistanceKm: number;
    totalDistanceMiles: number;
  };
  operationalMetrics?: {
    totalLoads: number;
    assignedDrivers: number;
    completedLoads: number;
    totalDistanceMiles: number;
    totalDistanceKm: string;
  };
}

export interface AccountantDashboardData {
  currentDateTime: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  driverAssignments: Array<{
    loadNumber: string;
    driverName: string;
    driverPhone: string;
    truckNumber: string;
    assignedAt: string;
    status: string;
    rate: number;
  }>;
  payments: Array<{
    loadNumber: string;
    driverName: string;
    totalPayment: number;
    payPerMile: number;
    totalMiles: number;
    paymentDate: string;
  }>;
  documents: {
    totalLoads: number;
    bolDocuments: number;
    podDocuments: number;
    missingBol: number;
    missingPod: number;
    documentList?: Array<{
      loadNumber: string;
      loadId?: string;
      bolUrl: string | null;
      podUrl: string | null;
    }>;
  };
  expenses: {
    total: number;
    count: number;
    byCategory: Record<string, number>;
    expenses: Array<any>;
  };
  invoices: Array<any>;
  profitLoss: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: string;
  };
}

export const dashboardApi = {
  getOwnerDashboard: async (dateRange: string = 'today'): Promise<OwnerDashboardData> => {
    // Use /dashboard endpoint which allows all authenticated users
    // /dashboard/owner requires OWNER or DISPATCHER role
    const response = await apiClient.get<ApiResponse<OwnerDashboardData>>('/dashboard', {
      params: { dateRange },
    });
    return response.data.data as OwnerDashboardData;
  },

  getAccountantDashboard: async (dateRange: string = 'month'): Promise<AccountantDashboardData> => {
    const response = await apiClient.get<ApiResponse<AccountantDashboardData>>('/dashboard/accountant', {
      params: { dateRange },
    });
    return response.data.data as AccountantDashboardData;
  },

  getUserWidgets: async (): Promise<DashboardWidget[]> => {
    const response = await apiClient.get<ApiResponse<DashboardWidget[]>>('/dashboard/widgets');
    return response.data.data as DashboardWidget[];
  },

  saveUserWidgets: async (widgets: DashboardWidget[]): Promise<DashboardWidget[]> => {
    const response = await apiClient.post<ApiResponse<DashboardWidget[]>>('/dashboard/widgets', { widgets });
    return response.data.data as DashboardWidget[];
  },

  resetUserWidgets: async (): Promise<DashboardWidget[]> => {
    const response = await apiClient.delete<ApiResponse<DashboardWidget[]>>('/dashboard/widgets');
    return response.data.data as DashboardWidget[];
  },
};