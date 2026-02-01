import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardApi, type OwnerDashboardData } from '@/api/dashboardApi';

export const useDashboard = (dateRange: string) => {
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const prevDateRangeRef = useRef(dateRange);

  const loadData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardApi.getOwnerDashboard(dateRange);
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [dateRange]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadData();
      return;
    }
    if (prevDateRangeRef.current !== dateRange) {
      prevDateRangeRef.current = dateRange;
      loadData();
    }
  }, [loadData, dateRange]);

  return { data, loading, error, refetch: loadData };
};