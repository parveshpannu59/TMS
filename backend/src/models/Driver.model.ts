import mongoose, { Schema, Document } from 'mongoose';

export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_TRIP = 'on_trip',
}

export interface IDriver extends Document {
  userId?: string; // Reference to User account for driver login
  name: string;
  email?: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: Date;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadharNumber?: string;
  panNumber?: string;
  bloodGroup?: string;
  emergencyContact: string;
  emergencyContactName: string;
  status: DriverStatus;
  currentLoadId?: string;
  joiningDate: Date;
  salary?: number;
  payPerMile?: number; // Pay per mile for owner-operators
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  documents: {
    license?: string;
    aadhar?: string;
    pan?: string;
    photo?: string;
    others: string[];
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema({
  accountNumber: { type: String, required: true },
  ifscCode: { type: String, required: true },
  bankName: { type: String, required: true },
  accountHolderName: { type: String, required: true },
});

const DocumentsSchema = new Schema({
  license: { type: String },
  aadhar: { type: String },
  pan: { type: String },
  photo: { type: String },
  others: [{ type: String }],
});

const driverSchema = new Schema<IDriver>(
  {
    userId: {
      type: String,
      ref: 'User',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone must be 10 digits'],
      unique: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    licenseExpiry: {
      type: Date,
      required: [true, 'License expiry date is required'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^[0-9]{6}$/, 'Pincode must be 6 digits'],
    },
    aadharNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{12}$/, 'Aadhar must be 12 digits'],
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    emergencyContact: {
      type: String,
      required: [true, 'Emergency contact is required'],
      match: [/^[0-9]{10}$/, 'Phone must be 10 digits'],
    },
    emergencyContactName: {
      type: String,
      required: [true, 'Emergency contact name is required'],
    },
    status: {
      type: String,
      enum: Object.values(DriverStatus),
      default: DriverStatus.ACTIVE,
    },
    currentLoadId: {
      type: String,
      ref: 'Load',
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    salary: {
      type: Number,
      min: 0,
    },
    payPerMile: {
      type: Number,
      min: 0,
    },
    bankAccount: {
      type: BankAccountSchema,
    },
    documents: {
      type: DocumentsSchema,
      default: () => ({ others: [] }),
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

driverSchema.index({ phone: 1 });
driverSchema.index({ licenseNumber: 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ createdBy: 1 });

export const Driver = mongoose.model<IDriver>('Driver', driverSchema);