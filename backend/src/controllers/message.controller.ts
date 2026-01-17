import { Request, Response } from 'express';
import { Message } from '../models/Message.model';
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
      .limit(100)
      .lean();

    return ApiResponse.success(res, messages, 'Conversation fetched successfully');
  });

  // Send message
  static sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { toUserId, loadId, message, messageType = 'text', attachments } = req.body;
    const fromUserId = req.user!.id;

    if (!toUserId || !message) {
      throw ApiError.badRequest('To user ID and message are required');
    }

    // Validate message type
    const validTypes = ['text', 'image', 'file', 'location', 'emergency'];
    if (!validTypes.includes(messageType)) {
      throw ApiError.badRequest('Invalid message type');
    }

    const newMessage = await Message.create({
      fromUserId,
      toUserId,
      loadId,
      message,
      messageType,
      attachments: attachments || [],
      encrypted: true,
      read: false,
    });

    return ApiResponse.success(res, newMessage, 'Message sent successfully', 201);
  });

  // Mark messages as read
  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { userId: fromUserId } = req.query;
    const toUserId = req.user!.id;

    if (!fromUserId) {
      throw ApiError.badRequest('User ID is required');
    }

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

    return ApiResponse.success(res, { updated: result.modifiedCount }, 'Messages marked as read');
  });

  // Get unread message count
  static getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const toUserId = req.user!.id;

    const count = await Message.countDocuments({
      toUserId,
      read: false,
    });

    return ApiResponse.success(res, { count }, 'Unread count fetched successfully');
  });

  // Get conversations list (all users you've messaged with)
  static getConversations = asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = req.user!.id;

    // Get distinct conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
        },
      },
      {
        $project: {
          otherUserId: {
            $cond: {
              if: { $eq: ['$fromUserId', currentUserId] },
              then: '$toUserId',
              else: '$fromUserId',
            },
          },
          lastMessage: '$$ROOT',
          loadId: 1,
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
      {
        $group: {
          _id: { otherUserId: '$otherUserId', loadId: '$loadId' },
          lastMessage: { $first: '$lastMessage' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$lastMessage.toUserId', currentUserId] },
                    { $eq: ['$lastMessage.read', false] },
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

    return ApiResponse.success(res, conversations, 'Conversations fetched successfully');
  });

  // Delete message
  static deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await Message.findById(id);

    if (!message) {
      throw ApiError.notFound('Message not found');
    }

    // Only sender can delete their message
    if (message.fromUserId !== userId && message.fromUserId.toString() !== userId) {
      throw ApiError.forbidden('You can only delete your own messages');
    }

    await Message.findByIdAndDelete(id);

    return ApiResponse.success(res, null, 'Message deleted successfully');
  });
}

