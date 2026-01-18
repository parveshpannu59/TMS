import mongoose, { Schema, Document } from 'mongoose';

export enum SOSStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export interface ISOSEmergency extends Document {
  driverId: string;
  loadId?: string;
  tripId?: string;
  
  // Emergency details
  message: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: SOSStatus;
  
  // Contacts notified
  contactsNotified: string[]; // Array of user IDs (owner, dispatcher, etc.)
  
  // Response tracking
  acknowledgedBy?: string; // User ID who acknowledged
  acknowledgedAt?: Date;
  resolvedBy?: string; // User ID who resolved
  resolvedAt?: Date;
  resolutionNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const SOSEmergencySchema = new Schema(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    loadId: {
      type: Schema.Types.ObjectId,
      ref: 'Load',
    },
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
    },
    message: {
      type: String,
      required: true,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      address: String,
    },
    status: {
      type: String,
      enum: Object.values(SOSStatus),
      default: SOSStatus.ACTIVE,
      index: true,
    },
    contactsNotified: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: Date,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    resolutionNotes: String,
  },
  {
    timestamps: true,
  }
);

// Index for finding active emergencies
SOSEmergencySchema.index({ status: 1, createdAt: -1 });
// Index for driver's emergency history
SOSEmergencySchema.index({ driverId: 1, createdAt: -1 });

export default mongoose.model<ISOSEmergency>('SOSEmergency', SOSEmergencySchema);
