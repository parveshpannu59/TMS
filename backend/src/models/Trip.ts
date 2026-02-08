import mongoose, { Schema, Document } from 'mongoose';

export enum TripStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  AT_SHIPPER = 'at_shipper',
  LOADED = 'loaded',
  IN_TRANSIT = 'in_transit',
  AT_RECEIVER = 'at_receiver',
  OFFLOADED = 'offloaded',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ITripExpense {
  type: 'fuel' | 'toll' | 'loading' | 'offloading' | 'other';
  amount: number;
  description?: string;
  receiptUrl?: string;
  location?: string;
  date: Date;
}

export interface ITripDocument {
  type: 'odometer_start' | 'odometer_end' | 'bill_of_lading' | 'proof_of_delivery' | 'other';
  url: string;
  fileName: string;
  uploadedAt: Date;
  description?: string;
}

export interface ITripLocation {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
}

export interface ITrip extends Document {
  loadId: string | mongoose.Types.ObjectId;
  driverId: string | mongoose.Types.ObjectId;
  truckId?: string | mongoose.Types.ObjectId;
  trailerId?: string | mongoose.Types.ObjectId;
  assignmentId: string | mongoose.Types.ObjectId;
  
  // Trip status
  status: TripStatus;
  
  // Mileage tracking
  startingMileage?: number;
  endingMileage?: number;
  totalMiles?: number;
  odometerStartPhoto?: string;
  odometerEndPhoto?: string;
  
  // Pay per mile
  ratePerMile: number;
  totalEarnings?: number;
  
  // Time tracking
  startedAt?: Date;
  completedAt?: Date;
  estimatedDeliveryTime?: Date;
  
  // Location tracking
  currentLocation?: ITripLocation;
  locationHistory: ITripLocation[];
  distanceTraveled?: number;
  distanceRemaining?: number;
  
  // Expenses
  expenses: ITripExpense[];
  totalExpenses?: number;
  
  // Documents
  documents: ITripDocument[];
  
  // Additional details
  notes?: string;
  specialInstructions?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const TripExpenseSchema = new Schema({
  type: {
    type: String,
    enum: ['fuel', 'toll', 'loading', 'offloading', 'other'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: String,
  receiptUrl: String,
  location: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

const TripDocumentSchema = new Schema({
  type: {
    type: String,
    enum: ['odometer_start', 'odometer_end', 'bill_of_lading', 'proof_of_delivery', 'other'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  description: String,
});

const TripLocationSchema = new Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  address: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const TripSchema = new Schema(
  {
    loadId: {
      type: Schema.Types.ObjectId,
      ref: 'Load',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    truckId: {
      type: Schema.Types.ObjectId,
      ref: 'Truck',
    },
    trailerId: {
      type: Schema.Types.ObjectId,
      ref: 'Trailer',
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TripStatus),
      default: TripStatus.NOT_STARTED,
      index: true,
    },
    startingMileage: {
      type: Number,
      min: 0,
    },
    endingMileage: {
      type: Number,
      min: 0,
    },
    totalMiles: {
      type: Number,
      min: 0,
    },
    odometerStartPhoto: String,
    odometerEndPhoto: String,
    ratePerMile: {
      type: Number,
      required: true,
      min: 0,
    },
    totalEarnings: {
      type: Number,
      min: 0,
    },
    startedAt: Date,
    completedAt: Date,
    estimatedDeliveryTime: Date,
    currentLocation: TripLocationSchema,
    locationHistory: [TripLocationSchema],
    distanceTraveled: {
      type: Number,
      min: 0,
      default: 0,
    },
    distanceRemaining: Number,
    expenses: [TripExpenseSchema],
    totalExpenses: {
      type: Number,
      default: 0,
      min: 0,
    },
    documents: [TripDocumentSchema],
    notes: String,
    specialInstructions: String,
  },
  {
    timestamps: true,
  }
);

// Index for finding active trips for a driver
TripSchema.index({ driverId: 1, status: 1 });
// loadId index already created by `index: true` in field definition
// Index for tracking active trips
TripSchema.index({ status: 1, startedAt: -1 });

// Calculate total miles before saving
TripSchema.pre('save', async function () {
  if (this.startingMileage && this.endingMileage) {
    this.totalMiles = this.endingMileage - this.startingMileage;
  }
  
  // Calculate total expenses
  if (this.expenses && this.expenses.length > 0) {
    this.totalExpenses = this.expenses.reduce((total, expense) => total + expense.amount, 0);
  }
  
  // Calculate total earnings
  if (this.totalMiles && this.ratePerMile) {
    this.totalEarnings = this.totalMiles * this.ratePerMile;
  }
});

export default mongoose.model<ITrip>('Trip', TripSchema);
