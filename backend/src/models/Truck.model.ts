import mongoose, { Schema, Document } from 'mongoose';

// Type workaround for model property conflict with mongoose Document
type TruckDocument = Omit<Document, 'model'> & {
  model: string; // Truck model name, not mongoose model method
};

export enum TruckStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  IN_SERVICE = 'in_service',
  ON_TRIP = 'on_trip',
}

export enum TruckType {
  OPEN_BODY = 'Open Body',
  CLOSED_CONTAINER = 'Closed Container',
  FLATBED = 'Flatbed',
  TANKER = 'Tanker',
  REFRIGERATED = 'Refrigerated',
  TRAILER = 'Trailer',
}

export interface ITruck extends TruckDocument {
  truckNumber: string;
  make: string;
  model: string; // Truck model name (e.g., "LPT 1918")
  year: number;
  truckType: TruckType;
  capacity: number;
  registrationNumber: string;
  registrationExpiry: Date;
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  pucExpiry?: Date;
  fitnessExpiry?: Date;
  permitNumber?: string;
  permitExpiry?: Date;
  chassisNumber?: string;
  engineNumber?: string;
  fuelType: string;
  mileage?: number;
  currentKm?: number;
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  status: TruckStatus;
  currentLoadId?: string;
  currentDriverId?: string;
  documents: {
    rc?: string;
    insurance?: string;
    permit?: string;
    puc?: string;
    fitness?: string;
    photos: string[];
    others: string[];
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentsSchema = new Schema({
  rc: { type: String },
  insurance: { type: String },
  permit: { type: String },
  puc: { type: String },
  fitness: { type: String },
  photos: [{ type: String }],
  others: [{ type: String }],
});

const truckSchema = new Schema<ITruck>(
  {
    truckNumber: {
      type: String,
      required: [true, 'Truck number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    make: {
      type: String,
      required: [true, 'Make is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
    truckType: {
      type: String,
      enum: Object.values(TruckType),
      required: [true, 'Truck type is required'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: 0,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    registrationExpiry: {
      type: Date,
      required: [true, 'Registration expiry date is required'],
    },
    insuranceNumber: {
      type: String,
      trim: true,
    },
    insuranceExpiry: {
      type: Date,
    },
    pucExpiry: {
      type: Date,
    },
    fitnessExpiry: {
      type: Date,
    },
    permitNumber: {
      type: String,
      trim: true,
    },
    permitExpiry: {
      type: Date,
    },
    chassisNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    engineNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    fuelType: {
      type: String,
      enum: ['Diesel', 'Petrol', 'CNG', 'Electric'],
      default: 'Diesel',
    },
    mileage: {
      type: Number,
      min: 0,
    },
    currentKm: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastServiceDate: {
      type: Date,
    },
    nextServiceDue: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(TruckStatus),
      default: TruckStatus.ACTIVE,
      index: true,
    },
    currentLoadId: {
      type: String,
      ref: 'Load',
    },
    currentDriverId: {
      type: String,
      ref: 'Driver',
    },
    documents: {
      type: DocumentsSchema,
      default: () => ({ photos: [], others: [] }),
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

truckSchema.index({ truckNumber: 1 });
truckSchema.index({ registrationNumber: 1 });
truckSchema.index({ status: 1 });
truckSchema.index({ createdBy: 1 });

export const Truck = mongoose.model<ITruck>('Truck', truckSchema);