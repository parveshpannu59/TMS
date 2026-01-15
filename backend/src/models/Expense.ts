import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  loadId: string;
  driverId: string;
  companyId: string;
  category: 'fuel' | 'toll' | 'scale' | 'parking' | 'lumper' | 'late_fee' | 'dock_fee' | 'repair' | 'other';
  type: 'on_the_way' | 'shipper' | 'receiver' | 'other';
  amount: number;
  currency: string;
  date: Date;
  location?: string;
  description?: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

const ExpenseSchema = new Schema({
  loadId: { type: Schema.Types.ObjectId, ref: 'Load', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  category: {
    type: String,
    enum: ['fuel', 'toll', 'scale', 'parking', 'lumper', 'late_fee', 'dock_fee', 'repair', 'other'],
    required: true,
  },
  type: {
    type: String,
    enum: ['on_the_way', 'shipper', 'receiver', 'other'],
    required: true,
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  date: { type: Date, required: true },
  location: { type: String },
  description: { type: String },
  receiptUrl: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true });

ExpenseSchema.index({ loadId: 1, status: 1 });
ExpenseSchema.index({ driverId: 1, status: 1 });

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
