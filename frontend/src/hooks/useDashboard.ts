import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, type OwnerDashboardData } from '@/api/dashboardApi';

export const useDashboard = (dateRange: string) => {
  const [data, setData] = useState<OwnerDashboardData | null>(null);
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