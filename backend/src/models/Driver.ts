import mongoose, { Schema, Document } from 'mongoose';

export interface IDriver extends Document {
  userId: string;
  companyId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  status: 'available' | 'on_duty' | 'off_duty' | 'on_leave';
  currentLoadId?: string;
}

const DriverSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  licenseNumber: { type: String, required: true },
  licenseExpiry: { type: Date, required: true },
  status: {
    type: String,
    enum: ['available', 'on_duty', 'off_duty', 'on_leave'],
    default: 'off_duty',
  },
  currentLoadId: { type: Schema.Types.ObjectId, ref: 'Load' },
}, { timestamps: true });

// Indexes for optimized queries
DriverSchema.index({ userId: 1 }, { unique: true }); // One driver profile per user
DriverSchema.index({ companyId: 1, status: 1 }); // Filter by company and status
DriverSchema.index({ companyId: 1, createdAt: -1 }); // Sort by creation date
DriverSchema.index({ licenseExpiry: 1 }); // Find expiring licenses
DriverSchema.index({ currentLoadId: 1 }); // Find driver by load

export default mongoose.model<IDriver>('Driver', DriverSchema);