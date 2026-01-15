import Notification, { NotificationType, NotificationPriority } from '../models/Notification';
import { Schema } from 'mongoose';

interface CreateNotificationOptions {
  companyId: string | Schema.Types.ObjectId;
  userId?: string | Schema.Types.ObjectId;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  metadata?: any;
  expiresAt?: Date;
}

/**
 * Helper function to create notifications
 */
export const createNotification = async (options: CreateNotificationOptions) => {
  try {
    const notification = await Notification.create({
      companyId: options.companyId,
      userId: options.userId,
      type: options.type,
      priority: options.priority || NotificationPriority.MEDIUM,
      title: options.title,
      message: options.message,
      metadata: options.metadata,
      expiresAt: options.expiresAt,
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create load-related notifications
 */
export const notifyLoadAssigned = async (
  companyId: string | Schema.Types.ObjectId,
  driverId: string | Schema.Types.ObjectId,
  loadNumber: string,
  driverName: string
) => {
  return createNotification({
    companyId,
    userId: driverId,
    type: NotificationType.LOAD,
    priority: NotificationPriority.HIGH,
    title: 'New Load Assigned',
    message: `Load #${loadNumber} has been assigned to you`,
    metadata: { loadNumber, driverName },
  });
};

export const notifyLoadCompleted = async (
  companyId: string | Schema.Types.ObjectId,
  loadNumber: string
) => {
  return createNotification({
    companyId,
    type: NotificationType.SUCCESS,
    priority: NotificationPriority.MEDIUM,
    title: 'Load Completed',
    message: `Load #${loadNumber} has been delivered successfully`,
    metadata: { loadNumber },
  });
};

export const notifyLoadDelayed = async (
  companyId: string | Schema.Types.ObjectId,
  loadNumber: string,
  reason: string
) => {
  return createNotification({
    companyId,
    type: NotificationType.WARNING,
    priority: NotificationPriority.HIGH,
    title: 'Load Delayed',
    message: `Load #${loadNumber} is delayed: ${reason}`,
    metadata: { loadNumber, reason },
  });
};

/**
 * Create driver-related notifications
 */
export const notifyDriverStatusChange = async (
  companyId: string | Schema.Types.ObjectId,
  driverName: string,
  status: string
) => {
  return createNotification({
    companyId,
    type: NotificationType.INFO,
    priority: NotificationPriority.LOW,
    title: 'Driver Update',
    message: `Driver ${driverName} updated status to ${status}`,
    metadata: { driverName, status },
  });
};

/**
 * Create maintenance-related notifications
 */
export const notifyMaintenanceDue = async (
  companyId: string | Schema.Types.ObjectId,
  vehicleType: 'truck' | 'trailer',
  vehicleNumber: string,
  daysUntilDue: number
) => {
  const priority = daysUntilDue <= 7 ? NotificationPriority.URGENT : NotificationPriority.HIGH;
  return createNotification({
    companyId,
    type: NotificationType.WARNING,
    priority,
    title: 'Maintenance Due',
    message: `${vehicleType} #${vehicleNumber} requires maintenance in ${daysUntilDue} days`,
    metadata: { vehicleType, vehicleNumber, daysUntilDue },
  });
};

/**
 * Create document expiration notifications
 */
export const notifyDocumentExpiring = async (
  companyId: string | Schema.Types.ObjectId,
  userId: string | Schema.Types.ObjectId,
  documentType: string,
  daysUntilExpiry: number
) => {
  const priority = daysUntilExpiry <= 7 ? NotificationPriority.URGENT : NotificationPriority.HIGH;
  return createNotification({
    companyId,
    userId,
    type: NotificationType.WARNING,
    priority,
    title: 'Document Expiring',
    message: `Your ${documentType} expires in ${daysUntilExpiry} days`,
    metadata: { documentType, daysUntilExpiry },
  });
};

/**
 * Cleanup old read notifications
 */
export const cleanupOldNotifications = async (daysOld: number = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await Notification.deleteMany({
    read: true,
    readAt: { $lt: cutoffDate },
  });

  console.log(`Cleaned up ${result.deletedCount} old notifications`);
  return result.deletedCount;
};
