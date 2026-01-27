import mongoose, { Schema, Document } from 'mongoose';

export interface ITrailer {
  companyId: string;
  unitNumber: string;
  type: 'dry_van' | 'reefer' | 'flatbed' | 'step_deck' | 'lowboy' | 'tanker';
  make?: string;
  year?: number;
  vin: string;
  licensePlate: string;
  status: 'available' | 'on_road' | 'in_maintenance' | 'out_of_service';
  currentLoadId?: string;
  currentTruckId?: string;
  notes?: string;
}

export interface ITrailerDocument extends Omit<Document, 'type'>, ITrailer {}

const TrailerSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  unitNumber: { type: String, required: true },
  type: {
    type: String,
    enum: ['dry_van', 'reefer', 'flatbed', 'step_deck', 'lowboy', 'tanker'],
    required: true,
  },
  make: { type: String },
  year: { type: Number },
  vin: { type: String, required: true, unique: true },
  licensePlate: { type: String, required: true },
  status: {
    type: String,
    enum: ['available', 'on_road', 'in_maintenance', 'out_of_service'],
    default: 'available',
  },
  currentLoadId: { type: Schema.Types.ObjectId, ref: 'Load' },
  currentTruckId: { type: Schema.Types.ObjectId, ref: 'Truck' },
  notes: { type: String },
}, { timestamps: true });

// Indexes for optimized queries
TrailerSchema.index({ companyId: 1, unitNumber: 1 }, { unique: true }); // Unique unit number per company
TrailerSchema.index({ companyId: 1, status: 1 }); // Filter by company and status
TrailerSchema.index({ companyId: 1, type: 1, status: 1 }); // Filter by type and status
TrailerSchema.index({ vin: 1 }, { unique: true }); // Unique VIN lookup
TrailerSchema.index({ currentTruckId: 1 }); // Find trailer by truck
TrailerSchema.index({ currentLoadId: 1 }); // Find trailer by load

export default mongoose.model<ITrailerDocument>('Trailer', TrailerSchema);
