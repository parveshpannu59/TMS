import mongoose, { Document, Schema } from 'mongoose';

export interface ITrailer extends Document {
  companyId: string;
  unitNumber: string; // MANDATORY
  trailerType: 'Dry Van' | 'Reefer' | 'Flatbed';
  vin?: string;
  licensePlate?: string;
  reeferUnitId?: string;
  status: 'Available' | 'Assigned' | 'In Maintenance';
  currentLoadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrailerSchema = new Schema<ITrailer>({
  companyId: { type: String, required: true, index: true },
  unitNumber: { type: String, required: true },
  trailerType: {
    type: String,
    required: true,
    enum: ['Dry Van', 'Reefer', 'Flatbed']
  },
  vin: String,
  licensePlate: String,
  reeferUnitId: String,
  status: {
    type: String,
    required: true,
    default: 'Available',
    enum: ['Available', 'Assigned', 'In Maintenance']
  },
  currentLoadId: String,
}, {
  timestamps: true
});

TrailerSchema.index({ companyId: 1, unitNumber: 1 }, { unique: true });

export const Trailer = mongoose.model<ITrailer>('Trailer', TrailerSchema);