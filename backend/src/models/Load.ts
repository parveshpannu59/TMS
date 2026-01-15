import mongoose, { Schema, Document } from 'mongoose';

export interface ILoad extends Document {
  loadNumber: string;
  companyId: string;
  driverId?: string;
  truckId?: string;
  trailerId?: string;
  
  // Origin details
  origin: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    contactName?: string;
    contactPhone?: string;
    appointmentTime?: Date;
    instructions?: string;
  };
  
  // Destination details
  destination: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    contactName?: string;
    contactPhone?: string;
    appointmentTime?: Date;
    instructions?: string;
  };
  
  // Status tracking - comprehensive workflow
  status: 'booked' | 'assigned' | 'on_duty' | 'arrived_shipper' | 'loading' | 
          'departed_shipper' | 'in_transit' | 'arrived_receiver' | 'unloading' | 
          'delivered' | 'completed' | 'cancelled';
  
  // Status timestamps for tracking
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    location?: { lat: number; lng: number };
    notes?: string;
    updatedBy: string;
  }>;
  
  // Load details
  pickupDate: Date;
  deliveryDate: Date;
  miles: number;
  weight?: number;
  commodity?: string;
  loadType?: 'ltl' | 'ftl' | 'partial';
  equipmentType?: string;
  
  // Financial details
  rate: number;
  currency: string;
  broker: string;
  brokerContact?: string;
  brokerPhone?: string;
  brokerEmail?: string;
  paymentTerms?: string;
  
  // Driver-specific info (hidden from driver)
  driverRate?: number;
  profitMargin?: number;
  
  // Documents flags
  hasRateConfirmation: boolean;
  hasBOL: boolean;
  hasPOD: boolean;
  
  // Additional metadata
  specialInstructions?: string;
  internalNotes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // Tracking
  createdBy: string;
  assignedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const LoadSchema = new Schema({
  loadNumber: { type: String, required: true, unique: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'User' },
  truckId: { type: Schema.Types.ObjectId, ref: 'Truck' },
  trailerId: { type: Schema.Types.ObjectId, ref: 'Trailer' },
  
  // Origin details
  origin: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    contactName: { type: String },
    contactPhone: { type: String },
    appointmentTime: { type: Date },
    instructions: { type: String },
  },
  
  // Destination details
  destination: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    contactName: { type: String },
    contactPhone: { type: String },
    appointmentTime: { type: Date },
    instructions: { type: String },
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['booked', 'assigned', 'on_duty', 'arrived_shipper', 'loading', 
           'departed_shipper', 'in_transit', 'arrived_receiver', 'unloading', 
           'delivered', 'completed', 'cancelled'],
    default: 'booked',
  },
  
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    notes: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  }],
  
  // Load details
  pickupDate: { type: Date, required: true },
  deliveryDate: { type: Date, required: true },
  miles: { type: Number, required: true },
  weight: { type: Number },
  commodity: { type: String },
  loadType: { type: String, enum: ['ltl', 'ftl', 'partial'] },
  equipmentType: { type: String },
  
  // Financial details
  rate: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  broker: { type: String, required: true },
  brokerContact: { type: String },
  brokerPhone: { type: String },
  brokerEmail: { type: String },
  paymentTerms: { type: String },
  
  // Driver-specific info (hidden from driver)
  driverRate: { type: Number },
  profitMargin: { type: Number },
  
  // Documents flags
  hasRateConfirmation: { type: Boolean, default: false },
  hasBOL: { type: Boolean, default: false },
  hasPOD: { type: Boolean, default: false },
  
  // Additional metadata
  specialInstructions: { type: String },
  internalNotes: { type: String },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  
  // Tracking
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
}, { timestamps: true });

// Indexes for optimized performance
LoadSchema.index({ loadNumber: 1 }, { unique: true }); // Unique load number lookup
LoadSchema.index({ companyId: 1, status: 1 }); // Filter by company and status
LoadSchema.index({ companyId: 1, createdAt: -1 }); // Sort loads by creation date
LoadSchema.index({ driverId: 1, status: 1 }); // Driver's loads by status
LoadSchema.index({ pickupDate: 1, deliveryDate: 1 }); // Date range queries
LoadSchema.index({ status: 1, pickupDate: 1 }); // Active loads by pickup date
LoadSchema.index({ broker: 1 }); // Group by broker
LoadSchema.index({ truckId: 1 }); // Find loads by truck
LoadSchema.index({ trailerId: 1 }); // Find loads by trailer
LoadSchema.index({ 'origin.state': 1, 'destination.state': 1 }); // Route analysis

export default mongoose.model<ILoad>('Load', LoadSchema);