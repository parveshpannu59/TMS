import { Schema, model, Document } from 'mongoose';

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

export interface IActivityLog {
  _id?: string;
  companyId?: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
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
  createdAt?: Date;
}

interface IActivityLogDocument extends Omit<IActivityLog, '_id'>, Document {}

const ActivityLogSchema = new Schema<IActivityLogDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // indexed via compound index below
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(ActivityAction),
      required: true,
      index: true,
    },
    entity: {
      type: String,
      enum: Object.values(ActivityEntity),
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    entityName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    changes: [{
      field: String,
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
    }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimized queries
ActivityLogSchema.index({ companyId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ entity: 1, entityId: 1 });
ActivityLogSchema.index({ action: 1, entity: 1 });

const ActivityLog = model<IActivityLogDocument>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
