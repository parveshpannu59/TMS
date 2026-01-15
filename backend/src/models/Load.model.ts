import mongoose, { Schema, Document } from 'mongoose';

export enum LoadStatus {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum LoadType {
  FTL = 'FTL',
  LTL = 'LTL',
}

interface ILocation {
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
}

interface IGPSLocation {
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

interface IStatusHistory {
  status: LoadStatus;
  timestamp: Date;
  updatedBy: string;
  notes?: string;
}

interface IDocuments {
  bol?: string;
  pod?: string;
  lr?: string;
  others: string[];
}

export interface ILoad extends Document {
  loadNumber: string;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  pickupLocation: ILocation;
  deliveryLocation: ILocation;
  pickupDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  driverId?: string;
  truckId?: string;
  cargoType: string;
  cargoDescription: string;
  weight: number;
  loadType: LoadType;
  rate: number;
  advancePaid: number;
  balance: number;
  fuelAdvance: number;
  distance: number;
  estimatedFuelCost: number;
  documents: IDocuments;
  status: LoadStatus;
  specialInstructions?: string;
  currentLocation?: IGPSLocation;
  locationHistory: IGPSLocation[];
  statusHistory: IStatusHistory[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },
});

const GPSLocationSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  speed: { type: Number },
  heading: { type: Number },
});

const StatusHistorySchema = new Schema({
  status: { type: String, enum: Object.values(LoadStatus), required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true },
  notes: { type: String },
});

const DocumentsSchema = new Schema({
  bol: { type: String },
  pod: { type: String },
  lr: { type: String },
  others: [{ type: String }],
});

const loadSchema = new Schema<ILoad>(
  {
    loadNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerContact: {
      type: String,
      required: [true, 'Customer contact is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    pickupLocation: {
      type: LocationSchema,
      required: true,
    },
    deliveryLocation: {
      type: LocationSchema,
      required: true,
    },
    pickupDate: {
      type: Date,
      required: [true, 'Pickup date is required'],
    },
    expectedDeliveryDate: {
      type: Date,
      required: [true, 'Expected delivery date is required'],
    },
    actualDeliveryDate: {
      type: Date,
    },
    driverId: {
      type: String,
      ref: 'Driver',
    },
    truckId: {
      type: String,
      ref: 'Truck',
    },
    cargoType: {
      type: String,
      required: [true, 'Cargo type is required'],
    },
    cargoDescription: {
      type: String,
      required: [true, 'Cargo description is required'],
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: 0,
    },
    loadType: {
      type: String,
      enum: Object.values(LoadType),
      required: true,
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: 0,
    },
    advancePaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    fuelAdvance: {
      type: Number,
      default: 0,
      min: 0,
    },
    distance: {
      type: Number,
      required: [true, 'Distance is required'],
      min: 0,
    },
    estimatedFuelCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    documents: {
      type: DocumentsSchema,
      default: () => ({ others: [] }),
    },
    status: {
      type: String,
      enum: Object.values(LoadStatus),
      default: LoadStatus.CREATED,
    },
    specialInstructions: {
      type: String,
    },
    currentLocation: {
      type: GPSLocationSchema,
    },
    locationHistory: {
      type: [GPSLocationSchema],
      default: [],
    },
    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
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

loadSchema.pre('save', async function () {
  if (this.isModified('rate') || this.isModified('advancePaid')) {
    this.balance = this.rate - (this.advancePaid || 0);
  }
});

loadSchema.index({ status: 1, createdAt: -1 });
loadSchema.index({ driverId: 1, status: 1 });
loadSchema.index({ createdBy: 1 });
loadSchema.index({ loadNumber: 1 });

export const Load = mongoose.model<ILoad>('Load', loadSchema);