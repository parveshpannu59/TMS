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
  // Reimbursement tracking
  paidBy?: 'driver' | 'dispatcher' | 'broker';
  reimbursementStatus?: 'not_applicable' | 'pending' | 'approved' | 'paid' | 'rejected';
  reimbursementAmount?: number;
  reimbursementDate?: Date;
  // Fuel-specific
  fuelQuantity?: number;
  fuelStation?: string;
  odometerBefore?: number;
  odometerAfter?: number;
  odometerBeforePhoto?: string;
  odometerAfterPhoto?: string;
  // Repair/maintenance specific
  repairStartTime?: Date;
  repairEndTime?: Date;
  repairDowntimeHours?: number;
  repairDescription?: string;
  notes?: string;
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
  // Reimbursement tracking
  paidBy: {
    type: String,
    enum: ['driver', 'dispatcher', 'broker'],
    default: 'driver',
  },
  reimbursementStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'approved', 'paid', 'rejected'],
    default: 'not_applicable',
  },
  reimbursementAmount: { type: Number },
  reimbursementDate: { type: Date },
  // Fuel-specific
  fuelQuantity: { type: Number },
  fuelStation: { type: String },
  odometerBefore: { type: Number },
  odometerAfter: { type: Number },
  odometerBeforePhoto: { type: String },
  odometerAfterPhoto: { type: String },
  // Repair/maintenance specific
  repairStartTime: { type: Date },
  repairEndTime: { type: Date },
  repairDowntimeHours: { type: Number },
  repairDescription: { type: String },
  notes: { type: String },
}, { timestamps: true });

ExpenseSchema.index({ loadId: 1, status: 1 });
ExpenseSchema.index({ driverId: 1, status: 1 });
ExpenseSchema.index({ companyId: 1, status: 1 });

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
