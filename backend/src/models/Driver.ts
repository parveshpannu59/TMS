import mongoose, { Document, Schema } from 'mongoose';

export interface IDriver extends Document {
  companyId: string;
  userId?: string; // Link to User if driver has login
  name: string;
  phone: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  status: 'Available' | 'On Trip' | 'Off Duty' | 'On Leave';
  payType?: 'per_mile' | 'per_hour' | 'per_trip' | 'weekly' | 'monthly';
  payRate?: number;
  currentTruckId?: string;
  currentLoadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema = new Schema<IDriver>({
  companyId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  licenseNumber: String,
  licenseExpiry: Date,
  status: {
    type: String,
    required: true,
    default: 'Available',
    enum: ['Available', 'On Trip', 'Off Duty', 'On Leave']
  },
  payType: {
    type: String,
    enum: ['per_mile', 'per_hour', 'per_trip', 'weekly', 'monthly']
  },
  payRate: Number,
  currentTruckId: String,
  currentLoadId: String,
}, {
  timestamps: true
});

export const Driver = mongoose.model<IDriver>('Driver', DriverSchema);