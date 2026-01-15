import { Request, Response } from 'express';
import Notification, { NotificationPriority } from '../models/Notification';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { PaginationHelper } from '../utils/pagination';

/**
 * @desc Get user notifications
 * @route GET /api/notifications
 * @access Private
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;
  const { page = 1, limit = 20, read, type, priority } = req.query;

  // Build query - let Mongoose handle ObjectId conversion
  const query: any = {};

  // If user has companyId, filter by it
  if (companyId) {
    query.companyId = companyId;
  }

  // Add $or condition for user-specific or company-wide notifications
  if (userId) {
    query.$or = [
      { userId: userId },
      { userId: null },
    ];
  } else {
    query.userId = null;
  }

  if (read !== undefined) {
    query.read = read === 'true';
  }

  if (type) {
    query.type = type;
  }

  if (priority) {
    query.priority = priority;
  }

  const result = await PaginationHelper.paginate(
    Notification,
    query,
    { page: Number(page), limit: Number(limit), sortBy: 'createdAt', sortOrder: 'desc' }
  );

  res.json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

/**
 * @desc Get unread notification count
 * @route GET /api/notifications/unread-count
 * @access Private
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  const query: any = {
    read: false,
  };

  // If user has companyId, filter by it
  if (companyId) {
    query.companyId = companyId;
  }

  if (userId) {
    query.$or = [
      { userId: userId },
      { userId: null },
    ];
  } else {
    query.userId = null;
  }

  const count = await Notification.countDocuments(query);

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * @desc Mark notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  const query: any = {
    _id: id,
  };

  // If user has companyId, filter by it
  if (companyId) {
    query.companyId = companyId;
  }

  if (userId) {
    query.$or = [
      { userId: userId },
      { userId: null },
    ];
  } else {
    query.userId = null;
  }

  const notification = await Notification.findOne(query);

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  notification.read = true;
  notification.readAt = new Date();
  await notification.save();

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: notification,
  });
});

/**
 * @desc Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  const query: any = {
    read: false,
  };

  // If user has companyId, filter by it
  if (companyId) {
    query.companyId = companyId;
  }

  if (userId) {
    query.$or = [
      { userId: userId },
      { userId: null },
    ];
  } else {
    query.userId = null;
  }

  const result = await Notification.updateMany(
    query,
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  );

  res.json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
    data: { count: result.modifiedCount },
  });
});

/**
 * @desc Delete notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  const query: any = {
    _id: id,
  };

  // If user has companyId, filter by it
  if (companyId) {
    query.companyId = companyId;
  }

  if (userId) {
    query.$or = [
      { userId: userId },
      { userId: null },
    ];
  } else {
    query.userId = null;
  }

  const notification = await Notification.findOneAndDelete(query);

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  res.json({
    success: true,
    message: 'Notification deleted',
  });
});

/**
 * @desc Create notification (Admin/System use)
 * @route POST /api/notifications
 * @access Private - Admin only
 */
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { userId, type, priority, title, message, metadata, expiresAt, companyId: bodyCompanyId } = req.body;
  const companyId = bodyCompanyId || req.user?.companyId;

  if (!type || !title || !message) {
    throw ApiError.badRequest('Type, title, and message are required');
  }

  const notificationData: any = {
    type,
    priority: priority || NotificationPriority.MEDIUM,
    title,
    message,
    metadata,
    expiresAt,
  };

  // Add companyId if available
  if (companyId) {
    notificationData.companyId = companyId;
  }

  if (userId) {
    notificationData.userId = userId;
  }

  const notification = await Notification.create(notificationData);

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: notification,
  });
});

/**
 * @desc Delete all read notifications
 * @route DELETE /api/notifications/clear-read
 * @access Private
 */
export const clearReadNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  const query: any = {
    read: true,
  };

  // If user has companyId, filter by it
  if (companyId) {
    query.companyId = companyId;
  }

  if (userId) {
    query.$or = [
      { userId: userId },
      { userId: null },
    ];
  } else {
    query.userId = null;
  }

  const result = await Notification.deleteMany(query);

  res.json({
    success: true,
    message: `${result.deletedCount} notifications cleared`,
    data: { count: result.deletedCount },
  });
});
