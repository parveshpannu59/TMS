import mongoose, { Schema, Document } from 'mongoose';

export enum LoadStatus {
  BOOKED = 'booked',
  RATE_CONFIRMED = 'rate_confirmed',
  ASSIGNED = 'assigned',
  TRIP_ACCEPTED = 'trip_accepted',
  TRIP_STARTED = 'trip_started',
  SHIPPER_CHECK_IN = 'shipper_check_in',
  SHIPPER_LOAD_IN = 'shipper_load_in',
  SHIPPER_LOAD_OUT = 'shipper_load_out',
  IN_TRANSIT = 'in_transit',
  RECEIVER_CHECK_IN = 'receiver_check_in',
  RECEIVER_OFFLOAD = 'receiver_offload',
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
  accuracy?: number; // GPS accuracy in meters
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

interface IBrokerConfirmationDetails {
  pickupAddress: ILocation;
  deliveryAddress: ILocation;
  miles: number;
}

interface IDriverFormDetails {
  loadNumber: string;
  pickupReferenceNumber: string;
  pickupTime: Date;
  pickupPlace: string;
  pickupDate: Date;
  pickupLocation: string;
  // Drop-off fields are optional — filled when driver ends the trip
  dropoffReferenceNumber?: string;
  dropoffTime?: Date;
  dropoffLocation?: string;
  dropoffDate?: Date;
  dropoffPlace?: string;
}

interface ITripStartDetails {
  startingMileage: number;
  startingPhoto: string; // URL or path to odometer/speedometer photo
  tripStartedAt: Date;
}

interface ITripExpenses {
  fuelExpenses: number;
  tolls: number;
  otherCosts: number;
  totalExpenses: number;
  additionalDetails?: string;
}

interface ITripCompletionDetails {
  endingMileage: number;
  endingPhoto?: string; // URL or path to ending odometer photo
  totalMiles: number;
  rate: number;
  totalPayment: number;
  expenses: ITripExpenses;
  completedAt: Date;
}

interface IStop {
  type: 'pickup' | 'delivery' | 'stop';
  location: { address: string; city: string; state: string; pincode: string; lat?: number; lng?: number };
  scheduledDate?: Date;
  actualDate?: Date;
  notes?: string;
  order: number;
}

interface IAccessorialCharge {
  type: 'detention' | 'layover' | 'fuel_surcharge' | 'lumper' | 'tarp' | 'overweight' | 'other';
  description: string;
  amount: number;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

interface IShipperCheckInDetails {
  poNumber?: string;
  loadNumber?: string;
  referenceNumber?: string;
  checkInAt: Date;
  latePassAmount?: number;
  latePassPhoto?: string;
  hasLatePass?: boolean;
}

interface IShipperLoadInDetails {
  confirmationDetails?: string;
  loadInAt: Date;
}

interface IShipperLoadOutDetails {
  loadOutAt: Date;
  bolDocument?: string; // URL or path to BOL PDF
}

interface IReceiverCheckInDetails {
  checkInAt: Date;
  arrivalConfirmed: boolean;
}

interface IReceiverOffloadDetails {
  offloadAt: Date;
  quantity?: string;
  additionalDetails?: string;
  bolAcknowledged: boolean;
  podDocument?: string; // URL or path to POD document/photo
  podPhoto?: string; // URL or path to proof of delivery photo
}

export interface ILoad extends Document {
  companyId?: string;
  loadNumber: string;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  broker?: string;
  pickupLocation: ILocation;
  deliveryLocation: ILocation;
  pickupDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  driverId?: string;
  truckId?: string;
  trailerId?: string;
  vehicleId?: string; // Unified vehicle reference
  cargoType: string;
  cargoDescription: string;
  weight: number;
  loadType: LoadType;
  loadImage?: string; // Image of the load/cargo
  rate: number;
  advancePaid: number;
  balance: number;
  fuelAdvance: number;
  distance: number;
  estimatedFuelCost: number;
  documents: IDocuments;
  status: LoadStatus;
  specialInstructions?: string;
  notes?: string;
  currentLocation?: IGPSLocation;
  locationHistory: IGPSLocation[];
  statusHistory: IStatusHistory[];
  // Broker confirmation fields
  trackingLink?: string;
  brokerConfirmedRate?: boolean;
  brokerConfirmedAt?: Date;
  brokerConfirmationDetails?: IBrokerConfirmationDetails;
  // Driver acceptance and form fields
  tripAcceptedAt?: Date;
  driverFormDetails?: IDriverFormDetails;
  // Trip start details
  tripStartDetails?: ITripStartDetails;
  // Trip completion details
  tripCompletionDetails?: ITripCompletionDetails;
  // Shipper check-in and load details
  shipperCheckInDetails?: IShipperCheckInDetails;
  shipperLoadInDetails?: IShipperLoadInDetails;
  shipperLoadOutDetails?: IShipperLoadOutDetails;
  // Receiver check-in and offload details
  receiverCheckInDetails?: IReceiverCheckInDetails;
  receiverOffloadDetails?: IReceiverOffloadDetails;
  // Status tracking timestamps
  assignedAt?: Date;
  tripEndedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  // Completion review workflow
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  paymentStatus?: 'pending' | 'approved' | 'paid';
  paymentApprovedAt?: Date;
  paymentApprovedBy?: string;
  paymentAmount?: number;
  // Recurring load fields
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurringDays?: number[];        // For weekly: [0=Sun, 1=Mon...6=Sat]
  recurringEndDate?: Date;
  parentLoadId?: string;           // Links copies to original recurring load
  recurringCount?: number;         // How many occurrences
  nextOccurrence?: Date;
  // Multi-stop support
  stops?: IStop[];
  // Detention time tracking
  detentionMinutes?: number;
  detentionChargePerHour?: number;
  detentionTotal?: number;
  detentionStartTime?: Date;
  detentionEndTime?: Date;
  // Accessorial charges
  accessorialCharges?: IAccessorialCharge[];
  totalAccessorialCharges?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema({
  address: { type: String, required: true },
  name: { type: String },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  lat: { type: Number },
  lng: { type: Number },
});

const GPSLocationSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  speed: { type: Number },
  heading: { type: Number },
  accuracy: { type: Number },
});

const StatusHistorySchema = new Schema({
  status: { type: String, enum: Object.values(LoadStatus), required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true },
  notes: { type: String },
  location: { type: String },         // human-readable address/place
  lat: { type: Number },              // GPS latitude
  lng: { type: Number },              // GPS longitude
  accuracy: { type: Number },         // GPS accuracy in meters
});

const DocumentsSchema = new Schema({
  bol: { type: String },
  pod: { type: String },
  lr: { type: String },
  others: [{ type: String }],
});

const BrokerConfirmationDetailsSchema = new Schema({
  pickupAddress: { type: Schema.Types.Mixed },
  deliveryAddress: { type: Schema.Types.Mixed },
  miles: { type: Number, default: 0, min: 0 },
});

const DriverFormDetailsSchema = new Schema({
  loadNumber: { type: String, required: true },
  pickupReferenceNumber: { type: String, required: true },
  pickupTime: { type: Date, required: true },
  pickupPlace: { type: String, required: true },
  pickupDate: { type: Date, required: true },
  pickupLocation: { type: String, required: true },
  // Drop-off fields are optional — filled when driver ends the trip
  dropoffReferenceNumber: { type: String },
  dropoffTime: { type: Date },
  dropoffLocation: { type: String },
  dropoffDate: { type: Date },
  dropoffPlace: { type: String },
});

const TripStartDetailsSchema = new Schema({
  startingMileage: { type: Number, required: true, min: 0 },
  startingPhoto: { type: String, required: true }, // URL or path to photo
  tripStartedAt: { type: Date, required: true },
});

const TripExpensesSchema = new Schema({
  fuelExpenses: { type: Number, required: true, min: 0, default: 0 },
  tolls: { type: Number, required: true, min: 0, default: 0 },
  otherCosts: { type: Number, required: true, min: 0, default: 0 },
  totalExpenses: { type: Number, required: true, min: 0 },
  additionalDetails: { type: String },
});

const TripCompletionDetailsSchema = new Schema({
  endingMileage: { type: Number, required: true, min: 0 },
  endingPhoto: { type: String }, // URL or path to ending odometer photo
  totalMiles: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 }, // Pay per mile rate
  totalPayment: { type: Number, required: true, min: 0 },
  expenses: { type: TripExpensesSchema, required: true },
  completedAt: { type: Date, required: true },
});

const ShipperCheckInDetailsSchema = new Schema({
  poNumber: { type: String },
  loadNumber: { type: String },
  referenceNumber: { type: String },
  checkInAt: { type: Date, required: true },
  latePassAmount: { type: Number, default: 0 },
  latePassPhoto: { type: String },
  hasLatePass: { type: Boolean, default: false },
});

const ShipperLoadInDetailsSchema = new Schema({
  confirmationDetails: { type: String },
  loadInAt: { type: Date, required: true },
});

const ShipperLoadOutDetailsSchema = new Schema({
  loadOutAt: { type: Date, required: true },
  bolDocument: { type: String }, // URL or path to BOL PDF
});

const ReceiverCheckInDetailsSchema = new Schema({
  checkInAt: { type: Date, required: true },
  arrivalConfirmed: { type: Boolean, default: true },
});

const ReceiverOffloadDetailsSchema = new Schema({
  offloadAt: { type: Date, required: true },
  quantity: { type: String },
  additionalDetails: { type: String },
  bolAcknowledged: { type: Boolean, required: true },
  podDocument: { type: String }, // URL or path to POD document
  podPhoto: { type: String }, // URL or path to POD photo
});

const StopSchema = new Schema({
  type: { type: String, enum: ['pickup', 'delivery', 'stop'], required: true },
  location: { type: LocationSchema, required: true },
  scheduledDate: { type: Date },
  actualDate: { type: Date },
  notes: { type: String },
  order: { type: Number, required: true },
});

const AccessorialChargeSchema = new Schema({
  type: {
    type: String,
    enum: ['detention', 'layover', 'fuel_surcharge', 'lumper', 'tarp', 'overweight', 'other'],
    required: true,
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  approved: { type: Boolean, required: true },
  approvedBy: { type: String },
  approvedAt: { type: Date },
});

const loadSchema = new Schema<ILoad>(
  {
    companyId: {
      type: String,
      required: false, // Optional for backward compatibility
    },
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
    broker: {
      type: String,
      trim: true,
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
      type: Schema.Types.ObjectId,
      ref: 'Driver',
    },
    truckId: {
      type: Schema.Types.ObjectId,
      ref: 'Truck',
    },
    trailerId: {
      type: Schema.Types.ObjectId,
      ref: 'Trailer',
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
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
    loadImage: {
      type: String,
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
      default: LoadStatus.BOOKED,
    },
    specialInstructions: {
      type: String,
    },
    notes: {
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
    // Broker confirmation fields
    trackingLink: {
      type: String,
    },
    brokerConfirmedRate: {
      type: Boolean,
      default: false,
    },
    brokerConfirmedAt: {
      type: Date,
    },
    brokerConfirmationDetails: {
      type: BrokerConfirmationDetailsSchema,
    },
    // Driver acceptance and form fields
    tripAcceptedAt: {
      type: Date,
    },
    driverFormDetails: {
      type: DriverFormDetailsSchema,
    },
    // Trip start details
    tripStartDetails: {
      type: TripStartDetailsSchema,
    },
    // Trip completion details
    tripCompletionDetails: {
      type: TripCompletionDetailsSchema,
    },
    // Shipper check-in and load details
    shipperCheckInDetails: {
      type: ShipperCheckInDetailsSchema,
    },
    shipperLoadInDetails: {
      type: ShipperLoadInDetailsSchema,
    },
    shipperLoadOutDetails: {
      type: ShipperLoadOutDetailsSchema,
    },
    // Receiver check-in and offload details
    receiverCheckInDetails: {
      type: ReceiverCheckInDetailsSchema,
    },
    receiverOffloadDetails: {
      type: ReceiverOffloadDetailsSchema,
    },
    // Status tracking timestamps
    assignedAt: {
      type: Date,
    },
    tripEndedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    // ─── Completion Review Workflow ──────────────────────────
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'approved', 'paid'],
      default: 'pending',
    },
    paymentApprovedAt: {
      type: Date,
    },
    paymentApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentAmount: {
      type: Number,
    },
    // ─── Recurring Load Fields ─────────────────────────────
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
    },
    recurringDays: {
      type: [Number],  // 0=Sun, 1=Mon...6=Sat
      default: [],
    },
    recurringEndDate: {
      type: Date,
    },
    parentLoadId: {
      type: Schema.Types.ObjectId,
      ref: 'Load',
    },
    recurringCount: {
      type: Number,
      default: 0,
    },
    nextOccurrence: {
      type: Date,
    },
    // Multi-stop support
    stops: {
      type: [StopSchema],
    },
    // Detention time tracking
    detentionMinutes: {
      type: Number,
    },
    detentionChargePerHour: {
      type: Number,
    },
    detentionTotal: {
      type: Number,
    },
    detentionStartTime: {
      type: Date,
    },
    detentionEndTime: {
      type: Date,
    },
    // Accessorial charges
    accessorialCharges: {
      type: [AccessorialChargeSchema],
    },
    totalAccessorialCharges: {
      type: Number,
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
loadSchema.index({ isRecurring: 1 });
// Make loadNumber unique per company, not globally
loadSchema.index({ companyId: 1, loadNumber: 1 }, { unique: true });

export const Load = mongoose.model<ILoad>('Load', loadSchema);