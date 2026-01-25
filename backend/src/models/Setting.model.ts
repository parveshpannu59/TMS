import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  
  // Appearance
  theme: 'light' | 'dark';
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  
  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  loadUpdates: boolean;
  driverUpdates: boolean;
  maintenanceReminders: boolean;
  invoiceReminders: boolean;
  
  // Company
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  taxId: string;
  dotNumber: string;
  mcNumber: string;
  
  // System
  autoAssignment: boolean;
  requireLoadApproval: boolean;
  enableGPSTracking: boolean;
  defaultCurrency: string;
  timezone: string;
  measurementUnit: 'metric' | 'imperial';
  
  // Security
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
      index: true,
    },
    
    // Appearance Settings
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    language: {
      type: String,
      default: 'en',
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY',
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h',
    },
    
    // Notification Settings
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    loadUpdates: {
      type: Boolean,
      default: true,
    },
    driverUpdates: {
      type: Boolean,
      default: true,
    },
    maintenanceReminders: {
      type: Boolean,
      default: true,
    },
    invoiceReminders: {
      type: Boolean,
      default: true,
    },
    
    // Company Settings
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    companyEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    companyPhone: {
      type: String,
      default: '',
      trim: true,
    },
    companyAddress: {
      type: String,
      default: '',
      trim: true,
    },
    taxId: {
      type: String,
      default: '',
      trim: true,
    },
    dotNumber: {
      type: String,
      default: '',
      trim: true,
    },
    mcNumber: {
      type: String,
      default: '',
      trim: true,
    },
    
    // System Settings
    autoAssignment: {
      type: Boolean,
      default: false,
    },
    requireLoadApproval: {
      type: Boolean,
      default: true,
    },
    enableGPSTracking: {
      type: Boolean,
      default: false,
    },
    defaultCurrency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'],
    },
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    measurementUnit: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'imperial',
    },
    
    // Security Settings
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 480,
    },
    passwordExpiry: {
      type: Number,
      default: 90, // days
      min: 0,
      max: 365,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimized queries
settingsSchema.index({ userId: 1, companyId: 1 });

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export default Settings;