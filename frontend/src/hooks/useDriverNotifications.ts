import { useCallback, useEffect, useState } from 'react';
import { notificationApi } from '../api/notification.api';

export type DriverNotification = any;

const PUSH_SHOWN_KEY = 'driver_push_shown_ids';

function getShownIds(): string[] {
  try {
    const s = sessionStorage.getItem(PUSH_SHOWN_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function addShownIds(ids: string[]) {
  try {
    const curr = getShownIds();
    const next = [...new Set([...curr, ...ids])].slice(-50);
    sessionStorage.setItem(PUSH_SHOWN_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function showPushNotification(title: string, body: string, tag?: string) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag: tag || 'tms-driver',
      icon: '/favicon.ico',
    });
  } catch {
    // ignore
  }
}

export function useDriverNotifications(pollMs = 20000) {
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, unread] = await Promise.all([
        notificationApi.getNotifications({ page: 1, limit: 20 }),
        notificationApi.getUnreadCount(),
      ]);
      const raw = listRes as any;
      const items = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : []);
      const list = Array.isArray(items) ? items : [];
      setNotifications(list);
      setUnreadCount(typeof unread === 'number' ? unread : (unread?.count || 0));
      setError(null);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && list.length > 0) {
        const shown = getShownIds();
        const unreadList = list.filter((n: any) => !n.read);
        const newUnread = unreadList.filter((n: any) => {
          const id = n._id || n.id;
          return id && !shown.includes(id);
        });
        for (const n of newUnread.slice(0, 3)) {
          const id = n._id || n.id;
          if (id) {
            showPushNotification(n.title || 'Notification', n.message || '', id);
            addShownIds([id]);
          }
        }
      }
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

  return { notifications, unreadCount, loading, error, refresh: fetchAll, markAsRead, requestPermission };
}
