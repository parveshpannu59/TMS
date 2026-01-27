import { useCallback, useEffect, useState } from 'react';
import { notificationApi } from '../api/notification.api';

export type DriverNotification = any; // Use your project's Notification type if exported

export function useDriverNotifications(pollMs = 20000) {
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, unread] = await Promise.all([
        notificationApi.getNotifications({ page: 1, limit: 20 }),
        notificationApi.getUnreadCount(),
      ]);
      const items = (listRes as any)?.items || (listRes as any)?.data || listRes || [];
      setNotifications(Array.isArray(items) ? items : []);
      setUnreadCount(typeof unread === 'number' ? unread : (unread?.count || 0));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, pollMs);
    return () => clearInterval(id);
  }, [fetchAll, pollMs]);

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      await fetchAll();
    } catch {
      // ignore
    }
  };

  return { notifications, unreadCount, loading, error, refresh: fetchAll, markAsRead };
}
