import mongoose, { Schema, Document } from 'mongoose';

export interface ILoadDocument extends Document {
  loadId: string;
  companyId: string;
  type: 'rate_confirmation' | 'bol' | 'pod' | 'receipt' | 'scale_ticket' | 'lumper_receipt' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  metadata?: {
    extractedData?: any;
    ocrText?: string;
    aiSummary?: string;
  };
}

const LoadDocumentSchema = new Schema({
  loadId: { type: Schema.Types.ObjectId, ref: 'Load', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  type: {
    type: String,
    enum: ['rate_confirmation', 'bol', 'pod', 'receipt', 'scale_ticket', 'lumper_receipt', 'other'],
    required: true,
  },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  metadata: {
    extractedData: { type: Schema.Types.Mixed },
    ocrText: { type: String },
    aiSummary: { type: String },
  },
}, { timestamps: true });

LoadDocumentSchema.index({ loadId: 1, type: 1 });

export default mongoose.model<ILoadDocument>('LoadDocument', LoadDocumentSchema);
