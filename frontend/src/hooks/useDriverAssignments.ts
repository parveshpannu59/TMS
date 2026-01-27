import { useCallback, useEffect, useState } from 'react';
import assignmentApi from '../api/assignment.api';

export type PendingAssignment = {
  id: string;
  _id?: string;
  loadId?: any;
  loadNumber?: string;
  pickupLocation?: any;
  deliveryLocation?: any;
  status?: string;
  createdAt?: string;
};

export function useDriverAssignments(pollMs = 15000) {
  const [pending, setPending] = useState<PendingAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const data = await assignmentApi.getPendingAssignments();
      setPending(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const id = setInterval(fetchPending, pollMs);
    return () => clearInterval(id);
  }, [fetchPending, pollMs]);

  const accept = async (id: string) => {
    await assignmentApi.acceptAssignment(id);
    await fetchPending();
  };

  const reject = async (id: string, reason?: string) => {
    await assignmentApi.rejectAssignment(id, reason);
    await fetchPending();
  };

  return { pending, loading, error, refresh: fetchPending, accept, reject };
}
