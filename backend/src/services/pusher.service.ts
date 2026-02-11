import Pusher from 'pusher';

// ─── Pusher Instance (Singleton) ────────────────────────────

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher | null {
  if (pusherInstance) return pusherInstance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    console.warn('⚠️  Pusher credentials not configured — real-time disabled');
    return null;
  }

  pusherInstance = new Pusher({ appId, key, secret, cluster, useTLS: true });
  console.log('✅ Pusher initialized for real-time tracking');
  return pusherInstance;
}

// ─── Channel Naming Convention ──────────────────────────────
// load-{loadId}            → GPS + status for a specific load
// driver-{driverId}        → Events for a specific driver (assignments, messages)
// company-{companyId}      → Fleet-wide events for owner/dispatcher
// presence-company-{id}    → Online/offline presence tracking
// chat-{conversationId}    → Real-time messaging between two users

export const PusherChannels = {
  load: (loadId: string) => `load-${loadId}`,
  driver: (driverId: string) => `driver-${driverId}`,
  user: (userId: string) => `user-${userId}`,
  company: (companyId: string) => `company-${companyId}`,
  presence: (companyId: string) => `presence-company-${companyId}`,
  chat: (user1: string, user2: string) => {
    // Deterministic channel name regardless of who initiates
    const sorted = [user1, user2].sort();
    return `chat-${sorted[0]}-${sorted[1]}`;
  },
};

export const PusherEvents = {
  // ⭐ Live GPS (CRITICAL)
  LOCATION_UPDATE: 'location-update',
  // 🚚 Trip status (CRITICAL)
  STATUS_CHANGE: 'status-change',
  TRIP_STARTED: 'trip-started',
  TRIP_ENDED: 'trip-ended',
  // ⛽ Expense notifications (IMPORTANT)
  EXPENSE_LOGGED: 'expense-logged',
  EXPENSE_APPROVED: 'expense-approved',
  EXPENSE_REJECTED: 'expense-rejected',
  // 🟢 Online/offline (IMPORTANT)
  DRIVER_ONLINE: 'driver-online',
  DRIVER_OFFLINE: 'driver-offline',
  // 🔔 Assignments (CRITICAL)
  ASSIGNMENT_NEW: 'assignment-new',
  ASSIGNMENT_ACCEPTED: 'assignment-accepted',
  ASSIGNMENT_REJECTED: 'assignment-rejected',
  // 💬 Messaging (USEFUL)
  MESSAGE_NEW: 'message-new',
  MESSAGE_READ: 'message-read',
  // 📄 Document alerts (IMPORTANT)
  DOCUMENT_UPLOADED: 'document-uploaded',
  // 🚨 Emergency (CRITICAL)
  DRIVER_SOS: 'driver-sos',
  SOS_ACKNOWLEDGED: 'sos-acknowledged',
  SOS_RESOLVED: 'sos-resolved',
  // 📊 Progress tracking (NICE TO HAVE)
  TRIP_PROGRESS: 'trip-progress',
  // 👥 Multi-user sync (USEFUL)
  DASHBOARD_REFRESH: 'dashboard-refresh',
};

// ─── Payload Interfaces ─────────────────────────────────────

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

export interface ExpensePayload {
  expenseId: string;
  loadId: string;
  loadNumber: string;
  driverId: string;
  driverName: string;
  category: string;
  amount: number;
  description?: string;
  receiptUrl?: string;
  paidBy: string;
  timestamp: string;
  action: 'logged' | 'approved' | 'rejected';
}

export interface DocumentPayload {
  loadId: string;
  loadNumber: string;
  driverId: string;
  driverName: string;
  documentType: string;
  documentUrl: string;
  timestamp: string;
}

export interface AssignmentPayload {
  assignmentId: string;
  loadId: string;
  loadNumber: string;
  driverId: string;
  driverName: string;
  pickup: string;
  delivery: string;
  rate?: number;
  timestamp: string;
  action: 'new' | 'accepted' | 'rejected';
  reason?: string;
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

export interface SOSPayload {
  sosId: string;
  loadId?: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  message: string;
  location: string;
  emergencyType?: string;
  timestamp: string;
  action: 'alert' | 'acknowledged' | 'resolved';
}

export interface PresencePayload {
  userId: string;
  driverId?: string;
  name: string;
  role: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

// ─── Broadcast Functions ─────────────────────────────────────

/** Helper: fire-and-forget trigger with error logging */
async function safeTrigger(channels: string | string[], event: string, data: any): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(channels, event, data);
  } catch (err) {
    console.warn(`Pusher broadcast [${event}] failed:`, (err as Error).message);
  }
}

// ⭐ 1. Live driver location (CRITICAL)
export async function broadcastLocationUpdate(companyId: string, payload: LocationUpdatePayload): Promise<void> {
  await safeTrigger(
    [PusherChannels.load(payload.loadId), PusherChannels.company(companyId)],
    PusherEvents.LOCATION_UPDATE,
    payload
  );
}

// 🚚 2. Trip status updates (CRITICAL)
export async function broadcastStatusChange(companyId: string, payload: StatusChangePayload): Promise<void> {
  await safeTrigger(
    [PusherChannels.load(payload.loadId), PusherChannels.company(companyId)],
    PusherEvents.STATUS_CHANGE,
    payload
  );
}

// ⛽ 3. Expense notifications (IMPORTANT)
export async function broadcastExpense(companyId: string, driverUserId: string, payload: ExpensePayload): Promise<void> {
  const event = payload.action === 'logged'
    ? PusherEvents.EXPENSE_LOGGED
    : payload.action === 'approved'
    ? PusherEvents.EXPENSE_APPROVED
    : PusherEvents.EXPENSE_REJECTED;

  // Send to company channel (owner sees it) and driver channel (driver gets approval/rejection)
  await safeTrigger(
    [PusherChannels.company(companyId), PusherChannels.driver(driverUserId)],
    event,
    payload
  );
}

// 🟢 4. Driver online/offline (IMPORTANT)
export async function broadcastPresence(companyId: string, payload: PresencePayload): Promise<void> {
  await safeTrigger(
    PusherChannels.company(companyId),
    payload.status === 'online' ? PusherEvents.DRIVER_ONLINE : PusherEvents.DRIVER_OFFLINE,
    payload
  );
}

// 🔔 5. Trip assignments (CRITICAL)
export async function broadcastAssignment(
  companyId: string,
  driverUserId: string,
  payload: AssignmentPayload
): Promise<void> {
  const event = payload.action === 'new'
    ? PusherEvents.ASSIGNMENT_NEW
    : payload.action === 'accepted'
    ? PusherEvents.ASSIGNMENT_ACCEPTED
    : PusherEvents.ASSIGNMENT_REJECTED;

  // New assignment → driver channel + company channel
  // Accept/reject → company channel (owner gets notified)
  const channels = payload.action === 'new'
    ? [PusherChannels.driver(driverUserId), PusherChannels.company(companyId)]
    : [PusherChannels.company(companyId)];

  await safeTrigger(channels, event, payload);
}

// 💬 6. In-app messaging (USEFUL)
export async function broadcastMessage(
  fromUserId: string,
  toUserId: string,
  payload: MessagePayload
): Promise<void> {
  // Send to: chat channel (both users), driver channel (legacy), user channel (all roles)
  await safeTrigger(
    [
      PusherChannels.chat(fromUserId, toUserId),
      PusherChannels.driver(toUserId),   // for driver-specific listeners
      PusherChannels.user(toUserId),     // for ALL users (owner/dispatcher/accountant)
    ],
    PusherEvents.MESSAGE_NEW,
    payload
  );
}

// 💬 6b. Typing indicator
export async function broadcastTyping(
  fromUserId: string,
  toUserId: string,
  payload: { fromUserId: string; fromUserName: string; isTyping: boolean }
): Promise<void> {
  await safeTrigger(
    PusherChannels.chat(fromUserId, toUserId),
    'typing',
    payload
  );
}

// 💬 6c. Read receipt
export async function broadcastReadReceipt(
  fromUserId: string,
  toUserId: string,
  payload: { userId: string; readAt: string }
): Promise<void> {
  await safeTrigger(
    PusherChannels.chat(fromUserId, toUserId),
    'read-receipt',
    payload
  );
}

// 📄 7. Document alerts (IMPORTANT)
export async function broadcastDocumentUpload(companyId: string, payload: DocumentPayload): Promise<void> {
  await safeTrigger(
    PusherChannels.company(companyId),
    PusherEvents.DOCUMENT_UPLOADED,
    payload
  );
}

// 🚨 8. Emergency alerts (CRITICAL)
export async function broadcastSOS(companyId: string, payload: SOSPayload): Promise<void> {
  const event = payload.action === 'alert'
    ? PusherEvents.DRIVER_SOS
    : payload.action === 'acknowledged'
    ? PusherEvents.SOS_ACKNOWLEDGED
    : PusherEvents.SOS_RESOLVED;

  await safeTrigger(PusherChannels.company(companyId), event, payload);
}

// 📊 9. Progress tracking (NICE TO HAVE)
export async function broadcastTripProgress(
  companyId: string,
  payload: { loadId: string; loadNumber: string; progress: number; eta?: string; timestamp: string }
): Promise<void> {
  await safeTrigger(
    PusherChannels.company(companyId),
    PusherEvents.TRIP_PROGRESS,
    payload
  );
}

// 👥 10. Multi-user sync (USEFUL)
export async function broadcastDashboardRefresh(
  companyId: string,
  payload: { trigger: string; timestamp: string }
): Promise<void> {
  await safeTrigger(
    PusherChannels.company(companyId),
    PusherEvents.DASHBOARD_REFRESH,
    payload
  );
}

// ─── Pusher Auth for Presence Channels ──────────────────────

export function authenticatePresenceChannel(
  socketId: string,
  channel: string,
  userData: { id: string; name: string; role: string }
): any {
  const pusher = getPusher();
  if (!pusher) return null;

  return pusher.authorizeChannel(socketId, channel, {
    user_id: userData.id,
    user_info: { name: userData.name, role: userData.role },
  });
}

export default getPusher;
