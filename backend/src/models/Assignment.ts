import mongoose, { Schema, Document } from 'mongoose';

export enum AssignmentStatus {
  PENDING = 'pending',           // Initial state when assigned
  ACCEPTED = 'accepted',         // Driver accepted
  REJECTED = 'rejected',         // Driver rejected
  CANCELLED = 'cancelled',       // Dispatcher cancelled
  EXPIRED = 'expired',           // Assignment expired (driver didn't respond)
}

export interface IAssignment extends Document {
  loadId: string;
  driverId: string;
  truckId?: string;
  trailerId?: string;
  assignedBy: string;           // Dispatcher/Owner ID
  status: AssignmentStatus;
  driverResponse?: {
    status: AssignmentStatus.ACCEPTED | AssignmentStatus.REJECTED;
    respondedAt: Date;
    reason?: string;             // Reason for rejection
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;              // Assignment expires if not accepted after X hours
  notificationId?: string;       // Reference to notification
}

const AssignmentSchema = new Schema(
  {
    loadId: {
      type: Schema.Types.ObjectId,
      ref: 'Load',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    truckId: {
      type: Schema.Types.ObjectId,
      ref: 'Truck',
    },
    trailerId: {
      type: Schema.Types.ObjectId,
      ref: 'Trailer',
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AssignmentStatus),
      default: AssignmentStatus.PENDING,
      index: true,
    },
    driverResponse: {
      status: {
        type: String,
        enum: [AssignmentStatus.ACCEPTED, AssignmentStatus.REJECTED],
      },
      respondedAt: Date,
      reason: String,             // Rejection reason
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding pending assignments for a driver
AssignmentSchema.index({ driverId: 1, status: 1 });
// loadId index already created by `index: true` in field definition

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
