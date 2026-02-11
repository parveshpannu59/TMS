import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authenticatePresenceChannel, broadcastPresence } from '../services/pusher.service';
import { Driver } from '../models/Driver.model';

const router = Router();

/**
 * POST /api/pusher/auth
 * Authenticates users for Pusher presence channels.
 * Required for online/offline driver tracking.
 */
router.post('/auth', authenticate, async (req: Request, res: Response) => {
  const { socket_id, channel_name } = req.body;
  const user = req.user;

  if (!user || !socket_id || !channel_name) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Only allow presence channels that match the user's company
  if (channel_name.startsWith('presence-company-')) {
    const channelCompanyId = channel_name.replace('presence-company-', '');
    const userCompanyId = user.companyId || user.id;

    if (channelCompanyId !== userCompanyId) {
      return res.status(403).json({ error: 'Unauthorized channel' });
    }

    const auth = authenticatePresenceChannel(socket_id, channel_name, {
      id: user.id,
      name: (user as any).name || user.email,
      role: user.role,
    });

    if (!auth) {
      return res.status(500).json({ error: 'Pusher not configured' });
    }

    return res.json(auth);
  }

  // Allow regular private channels if needed in future
  return res.status(403).json({ error: 'Channel not authorized' });
});

/**
 * POST /api/pusher/heartbeat
 * Driver sends periodic heartbeat to confirm online status.
 * Updates driver's lastSeen and broadcasts presence.
 */
router.post('/heartbeat', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId || req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Find driver and update lastSeen
    const driver = await Driver.findOneAndUpdate(
      { userId },
      { lastSeen: new Date(), isOnline: true },
      { new: true }
    ).lean();

    if (driver) {
      await broadcastPresence(companyId as string, {
        userId,
        driverId: driver._id.toString(),
        name: driver.name,
        role: 'driver',
        status: 'online',
        lastSeen: new Date().toISOString(),
      });
    }

    return res.json({ success: true, timestamp: new Date().toISOString() });
  } catch {
    return res.json({ success: true });
  }
});

/**
 * POST /api/pusher/offline
 * Driver explicitly goes offline (app closed, logout).
 */
router.post('/offline', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId || req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const driver = await Driver.findOneAndUpdate(
      { userId },
      { lastSeen: new Date(), isOnline: false },
      { new: true }
    ).lean();

    if (driver) {
      await broadcastPresence(companyId as string, {
        userId,
        driverId: driver._id.toString(),
        name: driver.name,
        role: 'driver',
        status: 'offline',
        lastSeen: new Date().toISOString(),
      });
    }

    return res.json({ success: true });
  } catch {
    return res.json({ success: true });
  }
});

export default router;
