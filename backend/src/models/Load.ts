import mongoose, { Document, Schema } from 'mongoose';

export interface ILoad extends Document {
  companyId: string;
  loadNumber: string;
  
  // Shipper Info
  shipperName: string;
  shipperAddress: string;
  shipperCity: string;
  shipperState: string;
  shipperZip: string;
  pickupDate: Date;
  pickupTime?: string;
  
  // Receiver Info
  receiverName: string;
  receiverAddress: string;
  receiverCity: string;
  receiverState: string;
  receiverZip: string;
  deliveryDate: Date;
  deliveryTime?: string;
  
  // Load Details
  commodity: string;
  weight: number;
  pieces?: number;
  equipmentType: string; // 'Dry Van', 'Reefer', 'Flatbed'
  temperature?: number;
  
  // References
  poNumber?: string;
  refNumber?: string;
  bolNumber?: string;
  sealNumber?: string;
  
  // Assignment
  driverId?: string;
  truckId?: string;
  trailerId?: string;
  
  // Status
  status: string; // 'Booked', 'Assigned', 'In Transit', 'Delivered', 'Completed'
  
  // Financial (Dispatcher/Owner only)
  brokerName?: string;
  brokerContact?: string;
  rateAmount?: number;
  fuelSurcharge?: number;
  accessorials?: number;
  totalAmount?: number;
  
  // Rate Confirmation
  rateConfirmationUrl?: string;
  
  // Instructions
  specialInstructions?: string;
  driverInstructions?: string;
  
  // Timestamps
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoadSchema = new Schema<ILoad>({
  companyId: { type: String, required: true, index: true },
  loadNumber: { type: String, required: true, unique: true },
  
  shipperName: { type: String, required: true },
  shipperAddress: { type: String, required: true },
  shipperCity: { type: String, required: true },
  shipperState: { type: String, required: true },
  shipperZip: { type: String, required: true },
  pickupDate: { type: Date, required: true },
  pickupTime: String,
  
  receiverName: { type: String, required: true },
  receiverAddress: { type: String, required: true },
  receiverCity: { type: String, required: true },
  receiverState: { type: String, required: true },
  receiverZip: { type: String, required: true },
  deliveryDate: { type: Date, required: true },
  deliveryTime: String,
  
  commodity: { type: String, required: true },
  weight: { type: Number, required: true },
  pieces: Number,
  equipmentType: { type: String, required: true },
  temperature: Number,
  
  poNumber: String,
  refNumber: String,
  bolNumber: String,
  sealNumber: String,
  
  driverId: { type: String, index: true },
  truckId: { type: String, index: true },
  trailerId: { type: String, index: true },
  
  status: { 
    type: String, 
    required: true, 
    default: 'Booked',
    enum: [
      'Booked',
      'Assigned',
      'Driver On Duty',
      'Arrived at Shipper',
      'Loading',
      'Departed Shipper',
      'In Transit',
      'Arrived at Receiver',
      'Unloading',
      'Delivered',
      'Completed'
    ]
  },
  
  brokerName: String,
  brokerContact: String,
  rateAmount: Number,
  fuelSurcharge: Number,
  accessorials: Number,
  totalAmount: Number,
  
  rateConfirmationUrl: String,
  
  specialInstructions: String,
  driverInstructions: String,
  
  createdBy: { type: String, required: true },
}, {
  timestamps: true
});

// Auto-generate load number
LoadSchema.pre('save', async function(next) {
  if (!this.loadNumber) {
    const count = await mongoose.models.Load.countDocuments({ companyId: this.companyId });
    this.loadNumber = `LOAD-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export const Load = mongoose.model<ILoad>('Load', LoadSchema);