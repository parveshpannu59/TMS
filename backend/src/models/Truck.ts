import mongoose, { Document, Schema } from 'mongoose';

export interface ITruck extends Document {
  companyId: string;
  unitNumber: string; // MANDATORY
  vin?: string;
  licensePlate?: string;
  make?: string;
  model?: string;
  year?: number;
  eldDeviceId?: string;
  status: 'Available' | 'Assigned' | 'Out of Service' | 'In Maintenance';
  currentDriverId?: string;
  currentLoadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TruckSchema = new Schema<ITruck>({
  companyId: { type: String, required: true, index: true },
  unitNumber: { type: String, required: true },
  vin: String,
  licensePlate: String,
  make: String,
  model: String,
  year: Number,
  eldDeviceId: String,
  status: {
    type: String,
    required: true,
    default: 'Available',
    enum: ['Available', 'Assigned', 'Out of Service', 'In Maintenance']
  },
  currentDriverId: String,
  currentLoadId: String,
}, {
  timestamps: true
});

// Compound unique index
TruckSchema.index({ companyId: 1, unitNumber: 1 }, { unique: true });

export const Truck = mongoose.model<ITruck>('Truck', TruckSchema);