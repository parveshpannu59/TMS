import mongoose, { Schema, Document } from 'mongoose';

export enum VehicleType {
  TRUCK = 'truck',
  TRAILER = 'trailer',
}

export enum VehicleStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  ON_ROAD = 'on_road',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  IN_MAINTENANCE = 'in_maintenance',
  OUT_OF_SERVICE = 'out_of_service',
}

export enum TrailerType {
  DRY_VAN = 'dry_van',
  REEFER = 'reefer',
  FLATBED = 'flatbed',
  STEP_DECK = 'step_deck',
  LOWBOY = 'lowboy',
  TANKER = 'tanker',
}

export interface IVehicle extends Document {
  companyId: string;
  vehicleType: VehicleType; // truck or trailer
  
  // Common fields
  unitNumber: string;
  vehicleName: string;
  registrationNumber: string; // License plate / Reg no
  make?: string;
  vehicleModel?: string;
  year?: number;
  vin: string; // Vehicle identification number
  capacity?: string; // e.g., "2500 Kg", "16 Tons"
  
  // Status & assignment
  status: VehicleStatus;
  currentLoadId?: string;
  currentDriverId?: string;
  
  // Trailer-specific
  trailerType?: TrailerType;
  currentTruckId?: string; // If trailer, which truck is pulling it
  
  // Images & documents
  vehicleImage?: string; // Main vehicle photo
  documents: {
    registration?: string; // RC book
    insurance?: string;
    permit?: string;
    fitness?: string;
    pollution?: string;
    others: string[];
  };
  
  // Additional
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentsSchema = new Schema({
  registration: { type: String },
  insurance: { type: String },
  permit: { type: String },
  fitness: { type: String },
  pollution: { type: String },
  others: [{ type: String }],
});

const vehicleSchema = new Schema<IVehicle>(
  {
    companyId: {
      type: String,
      required: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: true,
    },
    unitNumber: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    make: {
      type: String,
      trim: true,
    },
    vehicleModel: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
      min: 1900,
      max: 2100,
    },
    vin: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    capacity: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.AVAILABLE,
    },
    currentLoadId: {
      type: String,
      ref: 'Load',
    },
    currentDriverId: {
      type: String,
      ref: 'Driver',
    },
    trailerType: {
      type: String,
      enum: Object.values(TrailerType),
    },
    currentTruckId: {
      type: String,
      ref: 'Vehicle',
    },
    vehicleImage: {
      type: String,
    },
    documents: {
      type: DocumentsSchema,
      default: {},
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
vehicleSchema.index({ companyId: 1, unitNumber: 1 });
vehicleSchema.index({ companyId: 1, status: 1 });
vehicleSchema.index({ companyId: 1, vehicleType: 1, status: 1 });
vehicleSchema.index({ vin: 1 }, { unique: true });
vehicleSchema.index({ currentDriverId: 1 });
vehicleSchema.index({ currentLoadId: 1 });
vehicleSchema.index({ registrationNumber: 1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema);
