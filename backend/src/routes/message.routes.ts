import express from 'express';
import { MessageController } from '../controllers/message.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

// Get conversations list
router.get(
  '/conversations',
  authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER),
  MessageController.getConversations
);

// Get conversation between two users
router.get(
  '/conversation',
  authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER),
  MessageController.getConversation
);

// Send message
router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER),
  MessageController.sendMessage
);

// Mark messages as read
router.patch(
  '/read',
  authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER),
  MessageController.markAsRead
);

// Get unread message count
router.get(
  '/unread-count',
  authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER),
  MessageController.getUnreadCount
);

// Delete message
router.delete(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER),
  MessageController.deleteMessage
);

export default router;
