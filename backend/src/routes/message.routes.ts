import express from 'express';
import { MessageController } from '../controllers/message.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';
import { uploadChatAttachment } from '../middleware/upload.middleware';

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

const allRoles = [UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER];

// Get users for new conversation
router.get('/users', authorize(...allRoles), MessageController.getUsers);

// Get conversations list
router.get('/conversations', authorize(...allRoles), MessageController.getConversations);

// Get conversation between two users
router.get('/conversation', authorize(...allRoles), MessageController.getConversation);

// Send message (with optional file upload)
router.post('/', authorize(...allRoles), uploadChatAttachment, MessageController.sendMessage);

// Typing indicator
router.post('/typing', authorize(...allRoles), MessageController.typing);

// Mark messages as read
router.patch('/read', authorize(...allRoles), MessageController.markAsRead);

// Get unread message count
router.get('/unread-count', authorize(...allRoles), MessageController.getUnreadCount);

// Delete message
router.delete('/:id', authorize(...allRoles), MessageController.deleteMessage);

// ─── Group Chat Routes ──────────────────────────────────────
router.post('/groups', authorize(...allRoles), MessageController.createGroup);
router.get('/groups', authorize(...allRoles), MessageController.getGroups);
router.get('/groups/:groupId/messages', authorize(...allRoles), MessageController.getGroupMessages);
router.post('/groups/:groupId/messages', authorize(...allRoles), uploadChatAttachment, MessageController.sendGroupMessage);
router.patch('/groups/:groupId/read', authorize(...allRoles), MessageController.markGroupAsRead);
router.post('/groups/:groupId/members', authorize(...allRoles), MessageController.addGroupMembers);
router.delete('/groups/:groupId/members/:memberId', authorize(...allRoles), MessageController.removeGroupMember);
router.put('/groups/:groupId', authorize(...allRoles), MessageController.updateGroup);
router.delete('/groups/:groupId', authorize(...allRoles), MessageController.deleteGroup);

export default router;
