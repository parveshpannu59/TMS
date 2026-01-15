import { Schema, model, Document } from 'mongoose';

export enum NotificationType {
  SUCCESS = 'success',
  WARNING = 'warning',
  INFO = 'info',
  ERROR = 'error',
  LOAD = 'load',
  DRIVER = 'driver',
  TRUCK = 'truck',
  TRAILER = 'trailer',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface INotification {
  _id?: string;
  companyId: Schema.Types.ObjectId;
  userId?: Schema.Types.ObjectId;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  metadata?: {
    loadId?: string;
    driverId?: string;
    truckId?: string;
    trailerId?: string;
    actionUrl?: string;
    [key: string]: any;
  };
  expiresAt?: Date;
  createdAt?: Date;
  readAt?: Date;
}

interface INotificationDocument extends Omit<INotification, '_id'>, Document {}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimized queries
NotificationSchema.index({ companyId: 1, userId: 1, read: 1 });
NotificationSchema.index({ companyId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Method to mark as read
NotificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

const Notification = model<INotificationDocument>('Notification', NotificationSchema);

export default Notification;
