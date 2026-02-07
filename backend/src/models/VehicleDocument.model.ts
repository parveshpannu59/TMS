import mongoose, { Schema, Document } from 'mongoose';

export enum VehicleDocumentType {
  REGISTRATION = 'registration',
  INSPECTION = 'inspection',
  TITLE = 'title',
}

export enum DocumentStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  EXPIRING_SOON = 'expiring_soon', // within 30 days
  ARCHIVED = 'archived', // replaced by newer version
}

export interface IVehicleDocument extends Document {
  vehicleId: mongoose.Types.ObjectId;
  companyId: string;
  documentType: VehicleDocumentType;
  fileName: string; // original file name
  filePath: string; // stored file path
  fileSize: number; // in bytes
  mimeType: string;
  expiryDate: Date;
  issuedDate?: Date;
  status: DocumentStatus;
  version: number; // version number for history tracking
  isLatest: boolean; // true = current active version
  notes?: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleDocumentSchema = new Schema<IVehicleDocument>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: Object.values(VehicleDocumentType),
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/pdf',
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    issuedDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.ACTIVE,
    },
    version: {
      type: Number,
      default: 1,
    },
    isLatest: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
vehicleDocumentSchema.index({ vehicleId: 1, documentType: 1, isLatest: 1 });
vehicleDocumentSchema.index({ vehicleId: 1, documentType: 1, version: -1 });
vehicleDocumentSchema.index({ companyId: 1, status: 1 });
vehicleDocumentSchema.index({ expiryDate: 1 }); // for expiry cron checks

// Auto-compute status based on expiry date before saving
vehicleDocumentSchema.pre('save', function () {
  if (this.isLatest && this.expiryDate) {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (this.expiryDate < now) {
      this.status = DocumentStatus.EXPIRED;
    } else if (this.expiryDate <= thirtyDaysFromNow) {
      this.status = DocumentStatus.EXPIRING_SOON;
    } else {
      this.status = DocumentStatus.ACTIVE;
    }
  }
});

export const VehicleDocument = mongoose.model<IVehicleDocument>(
  'VehicleDocument',
  vehicleDocumentSchema
);
