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

export interface Notification {
  _id: string;
  companyId: string;
  userId?: string;
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
  expiresAt?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationResponse {
  data: Notification[];
  pagination: {
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UnreadCountResponse {
  count: number;
}
