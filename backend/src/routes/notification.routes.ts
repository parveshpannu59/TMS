import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  clearReadNotifications,
} from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.patch('/read-all', markAllAsRead);

// Clear all read notifications
router.delete('/clear-read', clearReadNotifications);

// Mark single notification as read
router.patch('/:id/read', markAsRead);

// Delete single notification
router.delete('/:id', deleteNotification);

// Create notification (Admin only)
router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  createNotification
);

export default router;
