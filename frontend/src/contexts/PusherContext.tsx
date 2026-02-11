import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Pusher from 'pusher-js';
import type { Channel } from 'pusher-js';
import { useAuth } from '@/hooks/useAuth';

// ─── Pusher Config ──────────────────────────────────────────
const PUSHER_KEY = 'f2a0012b79580debd3d6';
const PUSHER_CLUSTER = 'ap2';

// ─── Event Types (must match backend) ───────────────────────
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
  DOCUMENT_UPLOADED: 'document-uploaded',
  DRIVER_SOS: 'driver-sos',
  SOS_ACKNOWLEDGED: 'sos-acknowledged',
  SOS_RESOLVED: 'sos-resolved',
  TRIP_PROGRESS: 'trip-progress',
  DASHBOARD_REFRESH: 'dashboard-refresh',
};

// ─── Toast Notification Types ───────────────────────────────
export interface RealtimeToast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'sos';
  icon: string;
  title: string;
  message: string;
  timestamp: Date;
  action?: { label: string; href?: string; onClick?: () => void };
  sound?: boolean;
  persistent?: boolean;
}

// ─── Online Driver State ────────────────────────────────────
export interface OnlineDriver {
  userId: string;
  driverId: string;
  name: string;
  lastSeen: string;
}

// ─── Context Type ───────────────────────────────────────────
interface PusherContextType {
  connected: boolean;
  toasts: RealtimeToast[];
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  onlineDrivers: Map<string, OnlineDriver>;
  onlineCount: number;
  // Subscribe to specific events
  subscribe: (event: string, handler: (data: any) => void) => () => void;
  // Direct access for components that need it
  companyChannel: Channel | null;
  // Direct Pusher access for chat
  pusherInstance: Pusher | null;
}

const PusherContext = createContext<PusherContextType>({
  connected: false,
  toasts: [],
  dismissToast: () => {},
  clearToasts: () => {},
  onlineDrivers: new Map(),
  onlineCount: 0,
  subscribe: () => () => {},
  companyChannel: null,
  pusherInstance: null,
});

export const usePusherContext = () => useContext(PusherContext);

// ─── Toast sound ────────────────────────────────────────────
function playNotificationSound(type: 'default' | 'urgent' = 'default') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'urgent') {
      // Urgent: 3 rapid beeps
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.start(ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // Default: gentle chime
      osc.frequency.value = 587.33;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch { /* audio not available */ }
}

// ─── Provider ───────────────────────────────────────────────
export function PusherProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const pusherRef = useRef<Pusher | null>(null);
  const companyChannelRef = useRef<Channel | null>(null);
  const driverChannelRef = useRef<Channel | null>(null);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<RealtimeToast[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<Map<string, OnlineDriver>>(new Map());
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((toast: Omit<RealtimeToast, 'id' | 'timestamp'>) => {
    const newToast: RealtimeToast = {
      ...toast,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    };
    setToasts(prev => [newToast, ...prev].slice(0, 20)); // Keep max 20

    if (toast.sound !== false) {
      playNotificationSound(toast.type === 'sos' || toast.type === 'error' ? 'urgent' : 'default');
    }

    // Auto-dismiss after 8s (unless persistent)
    if (!toast.persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 8000);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => setToasts([]), []);

  // Subscribe to custom events from other components
  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);

    return () => {
      eventHandlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  // ─── Main Pusher Connection ───────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const companyId = (user as any).companyId || user.id;
    const isDriver = user.role === 'driver';

    // Initialize Pusher
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
    });
    pusherRef.current = pusher;

    pusher.connection.bind('connected', () => {
      setConnected(true);
      // Request notification permission when connected
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    });
    pusher.connection.bind('disconnected', () => setConnected(false));
    pusher.connection.bind('error', () => setConnected(false));

    // Subscribe to company channel (all users)
    const companyChannel = pusher.subscribe(`company-${companyId}`);
    companyChannelRef.current = companyChannel;

    // Subscribe to personal user channel (for direct notifications like messages)
    const userChannel = pusher.subscribe(`user-${user.id}`);

    // 💬 ALL USERS: New message notification via user channel
    userChannel.bind(PusherEvents.MESSAGE_NEW, (data: any) => {
      if (data.fromUserId !== user.id) {
        addToast({
          type: 'info',
          icon: '💬',
          title: `Message from ${data.fromUserName || 'Someone'}`,
          message: (data.message || '').slice(0, 100),
          action: isDriver
            ? { label: 'Open Chat', href: '/driver/mobile/messages' }
            : { label: 'Open Chat', href: '/messages' },
        });
        // Native browser notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(`💬 ${data.fromUserName || 'New Message'}`, {
              body: (data.message || 'New message').slice(0, 100),
              tag: `msg-${data.messageId || Date.now()}`,
              icon: '/favicon.ico',
            });
          } catch { /* ignore */ }
        }
        // Forward to subscriber system so shell/sidebar badges update
        eventHandlersRef.current.get(PusherEvents.MESSAGE_NEW)?.forEach(handler => handler(data));
      }
    });

    // Subscribe to driver-specific channel if driver
    if (isDriver) {
      const driverChannel = pusher.subscribe(`driver-${user.id}`);
      driverChannelRef.current = driverChannel;

      // ─── Driver: Assignment notifications ──────────────────
      driverChannel.bind(PusherEvents.ASSIGNMENT_NEW, (data: any) => {
        addToast({
          type: 'info',
          icon: '🔔',
          title: 'New Trip Assignment!',
          message: `Load #${data.loadNumber} — ${data.pickup} → ${data.delivery}`,
          persistent: true,
          action: { label: 'View', href: '/driver/mobile/dashboard' },
        });
        // Also trigger native notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('New Trip Assignment', {
              body: `Load #${data.loadNumber}: ${data.pickup} → ${data.delivery}`,
              icon: '/favicon.ico',
            });
          } catch { /* ignore */ }
        }
      });

      // Driver: Expense approval/rejection
      driverChannel.bind(PusherEvents.EXPENSE_APPROVED, (data: any) => {
        addToast({
          type: 'success',
          icon: '✅',
          title: 'Expense Approved!',
          message: `${data.category} expense of $${data.amount} has been approved`,
        });
      });
      driverChannel.bind(PusherEvents.EXPENSE_REJECTED, (data: any) => {
        addToast({
          type: 'warning',
          icon: '❌',
          title: 'Expense Rejected',
          message: `${data.category} expense of $${data.amount} was rejected`,
        });
      });
    }

    // ─── Owner/Dispatcher: All company-wide events ──────────
    if (!isDriver) {
      // ⛽ Expense logged by driver
      companyChannel.bind(PusherEvents.EXPENSE_LOGGED, (data: any) => {
        const icons: Record<string, string> = {
          fuel: '⛽', toll: '🛣️', repair: '🔧', lumper: '💪',
          parking: '🅿️', scale: '⚖️', other: '💰',
        };
        addToast({
          type: data.category === 'repair' ? 'warning' : 'info',
          icon: icons[data.category] || '💰',
          title: `${data.driverName} — ${data.category.charAt(0).toUpperCase() + data.category.slice(1)} Expense`,
          message: `$${data.amount} on Load #${data.loadNumber}${data.description ? ` — ${data.description}` : ''}`,
          action: { label: 'Review' },
        });
      });

      // 📄 Document uploaded by driver
      companyChannel.bind(PusherEvents.DOCUMENT_UPLOADED, (data: any) => {
        const docIcons: Record<string, string> = {
          bol: '📋', pod: '📸', fuel_receipt: '⛽', toll_receipt: '🛣️',
          maintenance: '🔧', lumper_receipt: '💰',
        };
        addToast({
          type: 'info',
          icon: docIcons[data.documentType] || '📄',
          title: `${data.driverName} uploaded ${data.documentType.toUpperCase()}`,
          message: `Load #${data.loadNumber}`,
        });
      });

      // 🔔 Assignment accepted/rejected
      companyChannel.bind(PusherEvents.ASSIGNMENT_ACCEPTED, (data: any) => {
        addToast({
          type: 'success',
          icon: '✅',
          title: `${data.driverName} accepted assignment`,
          message: `Load #${data.loadNumber}`,
        });
      });
      companyChannel.bind(PusherEvents.ASSIGNMENT_REJECTED, (data: any) => {
        addToast({
          type: 'error',
          icon: '❌',
          title: `${data.driverName} rejected assignment`,
          message: `Load #${data.loadNumber}${data.reason ? ` — ${data.reason}` : ''}`,
          persistent: true,
        });
      });

      // 🚚 Status changes
      companyChannel.bind(PusherEvents.STATUS_CHANGE, (data: any) => {
        const statusLabels: Record<string, string> = {
          trip_started: '🚀 Trip Started',
          shipper_check_in: '📍 Arrived at Shipper',
          shipper_load_in: '📦 Loaded',
          shipper_load_out: '📄 BOL Uploaded',
          in_transit: '🚛 In Transit',
          receiver_check_in: '🏁 At Receiver',
          receiver_offload: '📋 Offloading',
          delivered: '✅ Delivered!',
          completed: '🎉 Trip Completed!',
        };
        const label = statusLabels[data.newStatus];
        if (label) {
          addToast({
            type: ['delivered', 'completed'].includes(data.newStatus) ? 'success' : 'info',
            icon: label.split(' ')[0],
            title: label.slice(label.indexOf(' ') + 1),
            message: `${data.driverName} — Load #${data.loadNumber}`,
          });
        }
      });

      // 🟢 Driver online/offline
      companyChannel.bind(PusherEvents.DRIVER_ONLINE, (data: any) => {
        setOnlineDrivers(prev => {
          const next = new Map(prev);
          next.set(data.driverId || data.userId, {
            userId: data.userId,
            driverId: data.driverId || data.userId,
            name: data.name,
            lastSeen: data.lastSeen || new Date().toISOString(),
          });
          return next;
        });
      });
      companyChannel.bind(PusherEvents.DRIVER_OFFLINE, (data: any) => {
        setOnlineDrivers(prev => {
          const next = new Map(prev);
          next.delete(data.driverId || data.userId);
          return next;
        });
      });

      // 🚨 SOS Emergency
      companyChannel.bind(PusherEvents.DRIVER_SOS, (data: any) => {
        addToast({
          type: 'sos',
          icon: '🚨',
          title: `EMERGENCY — ${data.driverName}`,
          message: `${data.message}${data.location ? ` | Location: ${data.location}` : ''}`,
          persistent: true,
          sound: true,
        });
        // Native notification
        if (Notification.permission === 'granted') {
          new Notification(`🚨 SOS: ${data.driverName}`, {
            body: data.message,
            icon: '/favicon.ico',
            requireInteraction: true,
          });
        }
      });

      // 💬 Messages for owner/dispatcher are handled via user channel above
    }

    // Forward all events to custom subscribers
    const allEvents = Object.values(PusherEvents);
    allEvents.forEach(event => {
      companyChannel.bind(event, (data: any) => {
        eventHandlersRef.current.get(event)?.forEach(handler => handler(data));
      });
    });

    // ─── Driver Heartbeat (every 30s) ────────────────────────
    if (isDriver) {
      const sendHeartbeat = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          await fetch('/api/pusher/heartbeat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
        } catch { /* ignore */ }
      };
      sendHeartbeat();
      heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Send offline notification for driver
      if (isDriver) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            navigator.sendBeacon?.('/api/pusher/offline', new Blob([JSON.stringify({})], { type: 'application/json' }));
          }
        } catch { /* ignore */ }
      }
      try {
        pusher.unsubscribe(`company-${companyId}`);
        pusher.unsubscribe(`user-${user.id}`);
        if (isDriver) pusher.unsubscribe(`driver-${user.id}`);
      } catch { /* already unsubscribed */ }
      try {
        if (pusher.connection.state !== 'disconnected') {
          pusher.disconnect();
        }
      } catch { /* already disconnected */ }
      pusherRef.current = null;
      companyChannelRef.current = null;
      driverChannelRef.current = null;
      setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, user?.role]);

  return (
    <PusherContext.Provider value={{
      connected,
      toasts,
      dismissToast,
      clearToasts,
      onlineDrivers,
      onlineCount: onlineDrivers.size,
      subscribe,
      companyChannel: companyChannelRef.current,
      pusherInstance: pusherRef.current,
    }}>
      {children}
      {/* ─── Toast Overlay ──────────────────────────────────── */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 380,
          pointerEvents: 'none',
        }}>
          {toasts.slice(0, 5).map((toast, idx) => (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: toast.type === 'sos'
                  ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                  : toast.type === 'error'
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : toast.type === 'warning'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : toast.type === 'success'
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
                animation: `slideInRight 0.3s ease ${idx * 0.05}s both`,
                cursor: 'pointer',
                transition: 'transform 0.2s, opacity 0.2s',
                backdropFilter: 'blur(8px)',
              }}
              onClick={() => {
                if (toast.action?.href) {
                  window.location.href = toast.action.href;
                }
                if (toast.action?.onClick) toast.action.onClick();
                dismissToast(toast.id);
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{toast.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, marginBottom: 2 }}>
                  {toast.title}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {toast.message}
                </div>
                {toast.action && (
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, opacity: 0.8, textDecoration: 'underline' }}>
                    {toast.action.label} →
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </PusherContext.Provider>
  );
}

export default PusherProvider;
