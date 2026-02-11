import { useEffect, useRef, useCallback, useState } from 'react';
import Pusher from 'pusher-js';
import type { Channel } from 'pusher-js';

// ─── Pusher Configuration ────────────────────────────────────
const PUSHER_KEY = 'f2a0012b79580debd3d6';
const PUSHER_CLUSTER = 'ap2';

// ─── Singleton Pusher instance ───────────────────────────────
let pusherInstance: Pusher | null = null;
let subscriberCount = 0;

function getPusherClient(): Pusher {
  if (!pusherInstance) {
    if (import.meta.env.DEV) {
      Pusher.logToConsole = false;
    }
    pusherInstance = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
    });
  }
  subscriberCount++;
  return pusherInstance;
}

function releasePusherClient() {
  subscriberCount--;
  if (subscriberCount <= 0 && pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
    subscriberCount = 0;
  }
}

// ─── Channel Naming (must match backend) ─────────────────────
export const PusherChannels = {
  load: (loadId: string) => `load-${loadId}`,
  driver: (driverId: string) => `driver-${driverId}`,
  company: (companyId: string) => `company-${companyId}`,
  chat: (user1: string, user2: string) => {
    const sorted = [user1, user2].sort();
    return `chat-${sorted[0]}-${sorted[1]}`;
  },
};

export const PusherEvents = {
  LOCATION_UPDATE: 'location-update',
  STATUS_CHANGE: 'status-change',
  EXPENSE_LOGGED: 'expense-logged',
  EXPENSE_APPROVED: 'expense-approved',
  EXPENSE_REJECTED: 'expense-rejected',
  DRIVER_ONLINE: 'driver-online',
  DRIVER_OFFLINE: 'driver-offline',
  ASSIGNMENT_NEW: 'assignment-new',
  ASSIGNMENT_ACCEPTED: 'assignment-accepted',
  ASSIGNMENT_REJECTED: 'assignment-rejected',
  MESSAGE_NEW: 'message-new',
  MESSAGE_READ: 'message-read',
  DOCUMENT_UPLOADED: 'document-uploaded',
  DRIVER_SOS: 'driver-sos',
  SOS_ACKNOWLEDGED: 'sos-acknowledged',
  SOS_RESOLVED: 'sos-resolved',
  TRIP_PROGRESS: 'trip-progress',
  DASHBOARD_REFRESH: 'dashboard-refresh',
};

// ─── Payload Types ──────────────────────────────────────────
export interface LocationUpdatePayload {
  loadId: string;
  loadNumber: string;
  driverId: string;
  driverName: string;
  lat: number;
  lng: number;
  speed?: number;
  accuracy?: number;
  heading?: number;
  timestamp: string;
  status: string;
}

export interface StatusChangePayload {
  loadId: string;
  loadNumber: string;
  driverId: string;
  driverName: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface MessagePayload {
  messageId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  loadId?: string;
  message: string;
  messageType: string;
  timestamp: string;
}

// ─── usePusherChannel Hook ──────────────────────────────────
interface UsePusherChannelOptions {
  channelName: string | null;
  events: Record<string, (data: any) => void>;
  enabled?: boolean;
}

export function usePusherChannel({ channelName, events, enabled = true }: UsePusherChannelOptions) {
  const channelRef = useRef<Channel | null>(null);
  const eventsRef = useRef(events);
  const [connected, setConnected] = useState(false);

  useEffect(() => { eventsRef.current = events; }, [events]);

  useEffect(() => {
    if (!channelName || !enabled) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    pusher.connection.bind('connected', () => setConnected(true));
    pusher.connection.bind('disconnected', () => setConnected(false));
    pusher.connection.bind('error', () => setConnected(false));
    setConnected(pusher.connection.state === 'connected');

    const boundHandlers: Record<string, (data: any) => void> = {};
    Object.keys(eventsRef.current).forEach((eventName) => {
      const handler = (data: any) => {
        if (eventsRef.current[eventName]) eventsRef.current[eventName](data);
      };
      boundHandlers[eventName] = handler;
      channel.bind(eventName, handler);
    });

    return () => {
      Object.keys(boundHandlers).forEach((eventName) => {
        channel.unbind(eventName, boundHandlers[eventName]);
      });
      pusher.unsubscribe(channelName);
      channelRef.current = null;
      releasePusherClient();
    };
  }, [channelName, enabled]);

  return { connected };
}

// ─── useLoadTracking Hook ───────────────────────────────────
interface UseLoadTrackingOptions {
  loadId: string | null;
  onLocationUpdate?: (data: LocationUpdatePayload) => void;
  onStatusChange?: (data: StatusChangePayload) => void;
  enabled?: boolean;
}

export function useLoadTracking({
  loadId,
  onLocationUpdate,
  onStatusChange,
  enabled = true,
}: UseLoadTrackingOptions) {
  const onLocationRef = useRef(onLocationUpdate);
  const onStatusRef = useRef(onStatusChange);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => { onLocationRef.current = onLocationUpdate; }, [onLocationUpdate]);
  useEffect(() => { onStatusRef.current = onStatusChange; }, [onStatusChange]);

  const events = useCallback(() => ({
    [PusherEvents.LOCATION_UPDATE]: (data: LocationUpdatePayload) => {
      setLastUpdate(new Date());
      setUpdateCount(c => c + 1);
      onLocationRef.current?.(data);
    },
    [PusherEvents.STATUS_CHANGE]: (data: StatusChangePayload) => {
      setLastUpdate(new Date());
      onStatusRef.current?.(data);
    },
  }), []);

  const { connected } = usePusherChannel({
    channelName: loadId ? PusherChannels.load(loadId) : null,
    events: events(),
    enabled,
  });

  return { connected, lastUpdate, updateCount };
}

// ─── useRealtimeChat Hook ───────────────────────────────────
interface UseRealtimeChatOptions {
  currentUserId: string | null;
  otherUserId: string | null;
  onMessage?: (data: MessagePayload) => void;
  enabled?: boolean;
}

export function useRealtimeChat({
  currentUserId,
  otherUserId,
  onMessage,
  enabled = true,
}: UseRealtimeChatOptions) {
  const onMessageRef = useRef(onMessage);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const channelName = currentUserId && otherUserId
    ? PusherChannels.chat(currentUserId, otherUserId)
    : null;

  const events = useCallback(() => ({
    [PusherEvents.MESSAGE_NEW]: (data: MessagePayload) => {
      setMessageCount(c => c + 1);
      onMessageRef.current?.(data);
    },
  }), []);

  const { connected } = usePusherChannel({
    channelName,
    events: events(),
    enabled,
  });

  return { connected, messageCount };
}

export default usePusherChannel;
