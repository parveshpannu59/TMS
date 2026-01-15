import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  loadId: string;
  companyId: string;
  invoiceNumber: string;
  brokerName: string;
  amount: number;
  currency: string;
  invoiceDate: Date;
  dueDate: Date;
  status: 'draft' | 'submitted' | 'paid' | 'overdue' | 'disputed';
  submittedDate?: Date;
  paidDate?: Date;
  paidAmount?: number;
  paymentMethod?: string;
  notes?: string;
  disputeReason?: string;
  createdBy: string;
}

const InvoiceSchema = new Schema({
  loadId: { type: Schema.Types.ObjectId, ref: 'Load', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  brokerName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'paid', 'overdue', 'disputed'],
    default: 'draft',
  },
  submittedDate: { type: Date },
  paidDate: { type: Date },
  paidAmount: { type: Number },
  paymentMethod: { type: String },
  notes: { type: String },
  disputeReason: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

InvoiceSchema.index({ companyId: 1, status: 1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
