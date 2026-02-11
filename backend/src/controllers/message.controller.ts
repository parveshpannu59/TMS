import { Request, Response } from 'express';
import { Message, Group } from '../models/Message.model';
import { User } from '../models/User.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export class MessageController {
  // Get conversation between two users
  static getConversation = asyncHandler(async (req: Request, res: Response) => {
    const { userId: otherUserId, loadId } = req.query;
    const currentUserId = req.user!.id;

    if (!otherUserId) {
      throw ApiError.badRequest('User ID is required');
    }

    const query: any = {
      $or: [
        { fromUserId: currentUserId, toUserId: otherUserId as string },
        { fromUserId: otherUserId as string, toUserId: currentUserId },
      ],
    };

    if (loadId) {
      query.loadId = loadId;
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return ApiResponse.success(res, messages, 'Conversation fetched successfully');
  });

  // Send message (with optional file attachment)
  static sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { toUserId, loadId, message, messageType = 'text', attachments } = req.body;
    const fromUserId = req.user!.id;

    if (!toUserId) {
      throw ApiError.badRequest('To user ID is required');
    }

    // If file uploaded via multer
    let finalAttachments = attachments ? (typeof attachments === 'string' ? JSON.parse(attachments) : attachments) : [];
    let finalMessageType = messageType;
    let finalMessage = message || '';

    const file = (req as any).file;
    if (file) {
      const fileUrl = `/uploads/chat/${file.filename}`;
      const isImage = file.mimetype.startsWith('image/');
      finalMessageType = isImage ? 'image' : 'file';
      finalAttachments = [{
        url: fileUrl,
        type: file.mimetype,
        name: file.originalname,
        size: file.size,
      }];
      if (!finalMessage) {
        finalMessage = isImage ? '📷 Photo' : `📎 ${file.originalname}`;
      }
    }

    if (!finalMessage && finalAttachments.length === 0) {
      throw ApiError.badRequest('Message or file is required');
    }

    const newMessage = await Message.create({
      fromUserId,
      toUserId,
      loadId,
      message: finalMessage,
      messageType: finalMessageType,
      attachments: finalAttachments,
      encrypted: true,
      read: false,
    });

    // Get sender's name
    let fromUserName = (req.user as any)?.name || req.user?.email || 'User';
    try {
      const u = await User.findById(fromUserId).select('name').lean();
      if (u?.name) fromUserName = u.name;
    } catch (_) { /* ignore */ }

    // ─── Pusher: Instant message delivery ────────────────
    try {
      const { broadcastMessage } = require('../services/pusher.service');
      await broadcastMessage(fromUserId, toUserId, {
        messageId: newMessage._id.toString(),
        fromUserId,
        fromUserName,
        toUserId,
        loadId: loadId || undefined,
        message: finalMessage,
        messageType: finalMessageType,
        attachments: finalAttachments,
        timestamp: new Date().toISOString(),
      });
    } catch (err) { console.warn('Pusher message broadcast failed:', (err as Error).message); }

    return ApiResponse.success(res, newMessage, 'Message sent successfully', 201);
  });

  // Mark messages as read + broadcast read receipt
  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { userId: fromUserId } = req.query;
    const toUserId = req.user!.id;

    if (!fromUserId) {
      throw ApiError.badRequest('User ID is required');
    }

    console.log(`📬 markAsRead: from=${fromUserId} to=${toUserId}`);

    const result = await Message.updateMany(
      {
        fromUserId: fromUserId as string,
        toUserId,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    console.log(`📬 markAsRead result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

    // Broadcast read receipt via Pusher
    if (result.modifiedCount > 0) {
      try {
        const { broadcastReadReceipt } = require('../services/pusher.service');
        await broadcastReadReceipt(toUserId, fromUserId as string, {
          userId: toUserId,
          readAt: new Date().toISOString(),
        });
      } catch (_) { /* ignore */ }
    }

    // Verify remaining unread count
    const remaining = await Message.countDocuments({ toUserId, read: false });
    console.log(`📬 Remaining unread for ${toUserId}: ${remaining}`);

    return ApiResponse.success(res, { updated: result.modifiedCount }, 'Messages marked as read');
  });

  // Get unread message count
  static getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const toUserId = req.user!.id;

    const count = await Message.countDocuments({
      toUserId,
      read: false,
      groupId: { $exists: false },  // Exclude group messages
    });

    return ApiResponse.success(res, { count }, 'Unread count fetched successfully');
  });

  // Get conversations list with user names
  static getConversations = asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = req.user!.id;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
          groupId: { $exists: false },  // Exclude group messages from 1:1 conversations
          toUserId: { $ne: '' },        // Also exclude messages with empty toUserId
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            otherUserId: {
              $cond: {
                if: { $eq: ['$fromUserId', currentUserId] },
                then: '$toUserId',
                else: '$fromUserId',
              },
            },
          },
          lastMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$toUserId', currentUserId] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
      {
        $limit: 50,
      },
    ]);

    // Enrich with user names
    const userIds = conversations.map((c: any) => c._id.otherUserId);
    const users = await User.find({ _id: { $in: userIds } }).select('name email role profilePicture').lean();
    const userMap: Record<string, any> = {};
    users.forEach((u: any) => { userMap[u._id.toString()] = u; });

    const enriched = conversations.map((c: any) => {
      const user = userMap[c._id.otherUserId] || {};
      return {
        otherUserId: c._id.otherUserId,
        otherUserName: user.name || user.email || 'Unknown',
        otherUserRole: user.role || 'unknown',
        otherUserAvatar: user.profilePicture || null,
        lastMessage: c.lastMessage,
        unreadCount: c.unreadCount,
        messageCount: c.messageCount,
      };
    });

    return ApiResponse.success(res, enriched, 'Conversations fetched successfully');
  });

  // Typing indicator
  static typing = asyncHandler(async (req: Request, res: Response) => {
    const { toUserId, isTyping } = req.body;
    const fromUserId = req.user!.id;

    if (!toUserId) {
      throw ApiError.badRequest('To user ID is required');
    }

    let fromUserName = (req.user as any)?.name || 'User';
    try {
      const u = await User.findById(fromUserId).select('name').lean();
      if (u?.name) fromUserName = u.name;
    } catch (_) { /* ignore */ }

    try {
      const { broadcastTyping } = require('../services/pusher.service');
      await broadcastTyping(fromUserId, toUserId, {
        fromUserId,
        fromUserName,
        isTyping: isTyping !== false,
      });
    } catch (_) { /* ignore */ }

    return ApiResponse.success(res, null, 'OK');
  });

  // Delete message
  static deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await Message.findById(id);

    if (!message) {
      throw ApiError.notFound('Message not found');
    }

    if (message.fromUserId !== userId && message.fromUserId.toString() !== userId) {
      throw ApiError.forbidden('You can only delete your own messages');
    }

    await Message.findByIdAndDelete(id);

    return ApiResponse.success(res, null, 'Message deleted successfully');
  });

  // Get user info for starting a new chat
  // Everyone can chat with everyone in their company
  static getUsers = asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = req.user!.id;
    const companyId = (req.user as any)?.companyId;
    const mongoose = require('mongoose');

    let companyObjId: any;
    try { companyObjId = new mongoose.Types.ObjectId(companyId); } catch { companyObjId = null; }
    const currentObjId = (() => { try { return new mongoose.Types.ObjectId(currentUserId); } catch { return null; } })();

    // Use native MongoDB driver to avoid Mongoose schema type casting issues
    // (companyId may be stored as string or ObjectId in different records)
    const db = mongoose.connection.db;
    const matchConditions: any[] = [];
    if (companyId) {
      matchConditions.push({ companyId: companyId });
      matchConditions.push({ companyId: { $exists: false } }); // users created without companyId
      matchConditions.push({ companyId: null });               // users with null companyId
    }
    if (companyObjId) {
      matchConditions.push({ companyId: companyObjId });
      matchConditions.push({ _id: companyObjId });
    }

    const pipeline: any[] = [
      {
        $match: {
          _id: { $ne: currentObjId },
          status: 'active',
          ...(matchConditions.length > 0 ? { $or: matchConditions } : {}),
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          profilePicture: 1,
          phone: 1,
        },
      },
      { $sort: { role: 1, name: 1 } },
    ];

    const users = await db.collection('users').aggregate(pipeline).toArray();

    console.log(`💬 Chat contacts for ${(req.user as any)?.name || currentUserId}: found ${users.length} users`);

    return ApiResponse.success(res, users, 'Users fetched');
  });

  // ═══════════════════════════════════════════════════════════
  //  GROUP CHAT ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  // Create a new group
  static createGroup = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, members } = req.body;
    const createdBy = req.user!.id;

    if (!name) throw ApiError.badRequest('Group name is required');
    if (!members || !Array.isArray(members) || members.length < 1) {
      throw ApiError.badRequest('At least 1 other member is required');
    }

    // Ensure creator is in members and admins
    const allMembers = Array.from(new Set([createdBy, ...members]));
    const companyId = (req.user as any)?.companyId || createdBy;

    const group = await Group.create({
      name,
      description,
      createdBy,
      members: allMembers,
      admins: [createdBy],
      companyId,
      isActive: true,
    });

    // Broadcast to all members via Pusher
    try {
      const { safeTrigger, PusherChannels } = require('../services/pusher.service');
      const creatorUser = await User.findById(createdBy).select('name').lean();
      for (const memberId of members) {
        await safeTrigger(
          PusherChannels.user(memberId),
          'group-created',
          {
            groupId: group._id.toString(),
            groupName: name,
            createdBy: creatorUser?.name || 'Someone',
          }
        );
      }
    } catch { /* ignore */ }

    return ApiResponse.created(res, group, 'Group created successfully');
  });

  // Get all groups for current user
  static getGroups = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const groups = await Group.find({
      members: userId,
      isActive: true,
    }).sort({ lastMessageAt: -1, updatedAt: -1 }).lean();

    // Enrich with last message and unread count for each group
    const enriched = await Promise.all(
      groups.map(async (group: any) => {
        const lastMessage = await Message.findOne({ groupId: group._id })
          .sort({ createdAt: -1 }).lean();

        const unreadCount = await Message.countDocuments({
          groupId: group._id,
          fromUserId: { $ne: userId },
          readBy: { $nin: [userId] },
        });

        // Get member names
        const memberUsers = await User.find({ _id: { $in: group.members } })
          .select('name email role profilePicture').lean();

        return {
          ...group,
          id: group._id.toString(),
          lastMessage,
          unreadCount,
          memberDetails: memberUsers.map((u: any) => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            profilePicture: u.profilePicture,
          })),
        };
      })
    );

    return ApiResponse.success(res, enriched, 'Groups fetched');
  });

  // Get group messages
  static getGroupMessages = asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const userId = req.user!.id;

    const group = await Group.findById(groupId);
    if (!group) throw ApiError.notFound('Group not found');
    if (!group.members.includes(userId)) throw ApiError.forbidden('Not a member');

    const messages = await Message.find({ groupId })
      .sort({ createdAt: 1 }).limit(200).lean();

    return ApiResponse.success(res, messages, 'Group messages fetched');
  });

  // Send group message
  static sendGroupMessage = asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { message, messageType = 'text', attachments } = req.body;
    const fromUserId = req.user!.id;

    const group = await Group.findById(groupId);
    if (!group) throw ApiError.notFound('Group not found');
    if (!group.members.includes(fromUserId)) throw ApiError.forbidden('Not a member');

    let finalAttachments = attachments ? (typeof attachments === 'string' ? JSON.parse(attachments) : attachments) : [];
    let finalMessageType = messageType;
    let finalMessage = message || '';

    const file = (req as any).file;
    if (file) {
      const fileUrl = `/uploads/chat/${file.filename}`;
      const isImage = file.mimetype.startsWith('image/');
      finalMessageType = isImage ? 'image' : 'file';
      finalAttachments = [{
        url: fileUrl,
        type: file.mimetype,
        name: file.originalname,
        size: file.size,
      }];
      if (!finalMessage) finalMessage = isImage ? '📷 Photo' : `📎 ${file.originalname}`;
    }

    if (!finalMessage && finalAttachments.length === 0) {
      throw ApiError.badRequest('Message or file is required');
    }

    const newMessage = await Message.create({
      fromUserId,
      toUserId: '',
      groupId: groupId as any,
      message: finalMessage,
      messageType: finalMessageType,
      attachments: finalAttachments,
      encrypted: true,
      read: false,
      readBy: [fromUserId],
    });

    // Update group lastMessageAt
    await Group.findByIdAndUpdate(groupId, { lastMessageAt: new Date() });

    // Get sender's name
    let fromUserName = (req.user as any)?.name || 'User';
    try {
      const u = await User.findById(fromUserId).select('name').lean();
      if (u?.name) fromUserName = u.name;
    } catch { /* ignore */ }

    // Broadcast to all group members via Pusher
    try {
      const { safeTrigger, PusherEvents } = require('../services/pusher.service');
      const payload = {
        messageId: (newMessage as any)._id.toString(),
        groupId: groupId,
        groupName: group!.name,
        fromUserId,
        fromUserName,
        message: finalMessage,
        messageType: finalMessageType,
        attachments: finalAttachments,
        timestamp: new Date().toISOString(),
      };
      // Send to group channel
      await safeTrigger(`group-${groupId}`, PusherEvents.MESSAGE_NEW, payload);
      // Also notify each member's personal channel (for badge updates)
      for (const memberId of group.members) {
        if (memberId !== fromUserId) {
          await safeTrigger(`user-${memberId}`, 'group-message', payload);
        }
      }
    } catch (err) { console.warn('Group message broadcast failed:', (err as Error).message); }

    return ApiResponse.success(res, newMessage, 'Group message sent', 201);
  });

  // Mark group messages as read
  static markGroupAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const userId = req.user!.id;

    await Message.updateMany(
      {
        groupId,
        fromUserId: { $ne: userId },
        readBy: { $nin: [userId] },
      },
      {
        $addToSet: { readBy: userId },
      }
    );

    return ApiResponse.success(res, null, 'Group messages marked as read');
  });

  // Add members to group
  static addGroupMembers = asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { members } = req.body;
    const userId = req.user!.id;

    const group = await Group.findById(groupId);
    if (!group) throw ApiError.notFound('Group not found');
    if (!group.admins.includes(userId)) throw ApiError.forbidden('Only admins can add members');

    const newMembers = members.filter((m: string) => !group.members.includes(m));
    if (newMembers.length === 0) {
      return ApiResponse.success(res, group, 'No new members to add');
    }

    group.members.push(...newMembers);
    await group.save();

    return ApiResponse.success(res, group, 'Members added');
  });

  // Remove member from group
  static removeGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const { groupId, memberId } = req.params;
    const userId = req.user!.id;

    const group = await Group.findById(groupId);
    if (!group) throw ApiError.notFound('Group not found');
    if (!group.admins.includes(userId) && memberId !== userId) {
      throw ApiError.forbidden('Only admins can remove members');
    }

    group.members = group.members.filter(m => m !== memberId);
    group.admins = group.admins.filter(m => m !== memberId);
    await group.save();

    return ApiResponse.success(res, group, 'Member removed');
  });

  // Update group info
  static updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user!.id;

    const group = await Group.findById(groupId);
    if (!group) throw ApiError.notFound('Group not found');
    if (!group.admins.includes(userId)) throw ApiError.forbidden('Only admins can update');

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    await group.save();

    return ApiResponse.success(res, group, 'Group updated');
  });

  // Delete group (only creator can delete)
  static deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const userId = req.user!.id;

    const group = await Group.findById(groupId);
    if (!group) throw ApiError.notFound('Group not found');
    if (group.createdBy !== userId) {
      throw ApiError.forbidden('Only the group creator can delete this group');
    }

    // Delete all messages in the group
    await Message.deleteMany({ groupId: groupId as any });
    // Delete the group
    await Group.findByIdAndDelete(groupId);

    return ApiResponse.success(res, null, 'Group deleted successfully');
  });
}
