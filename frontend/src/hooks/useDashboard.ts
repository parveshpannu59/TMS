import { useState, useEffect, useCallback } from 'react';
import { DashboardData } from '@/types/dashboard.types';
import { dashboardApi } from '@/api/dashboardApi';

export const useDashboard = (dateRange: string) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardApi.getOwnerDashboard(dateRange);
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refetch: loadData };
};