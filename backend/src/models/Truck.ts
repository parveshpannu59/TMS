import mongoose, { Schema, Document } from 'mongoose';

export interface ITruck {
  companyId: string;
  unitNumber: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  status: 'available' | 'on_road' | 'in_maintenance' | 'out_of_service';
  currentLoadId?: string;
  currentDriverId?: string;
  notes?: string;
}

export interface ITruckDocument extends Omit<Document, 'model'>, ITruck {}

const TruckSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  unitNumber: { type: String, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  vin: { type: String, required: true, unique: true },
  licensePlate: { type: String, required: true },
  status: {
    type: String,
    enum: ['available', 'on_road', 'in_maintenance', 'out_of_service'],
    default: 'available',
  },
  currentLoadId: { type: Schema.Types.ObjectId, ref: 'Load' },
  currentDriverId: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true });

// Indexes for optimized queries
TruckSchema.index({ companyId: 1, unitNumber: 1 }, { unique: true }); // Unique unit number per company
TruckSchema.index({ companyId: 1, status: 1 }); // Filter by company and status
TruckSchema.index({ vin: 1 }, { unique: true }); // Unique VIN lookup
TruckSchema.index({ currentDriverId: 1 }); // Find truck by driver
TruckSchema.index({ currentLoadId: 1 }); // Find truck by load

export default mongoose.model<ITruckDocument>('Truck', TruckSchema);