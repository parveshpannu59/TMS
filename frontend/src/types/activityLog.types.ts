export enum ActivityAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  COMPLETE = 'complete',
  CANCEL = 'cancel',
  START = 'start',
  PAUSE = 'pause',
  RESUME = 'resume',
}

export enum ActivityEntity {
  LOAD = 'load',
  DRIVER = 'driver',
  TRUCK = 'truck',
  TRAILER = 'trailer',
  USER = 'user',
  COMPANY = 'company',
}

export interface ActivityLog {
  _id: string;
  companyId?: string;
  userId: string;
  userName: string;
  userRole: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  entityName: string;
  description: string;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface ActivityLogResponse {
  data: ActivityLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ActivityStats {
  totalCount: number;
  byAction: Array<{ _id: string; count: number }>;
  byEntity: Array<{ _id: string; count: number }>;
}
