import mongoose, { Schema, Document } from 'mongoose';

export interface IDashboardWidget extends Document {
  userId: string;
  widgetId: string;
  type: 'kpi' | 'chart' | 'list' | 'table';
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  visible: boolean;
  settings: Record<string, any>;
}

const DashboardWidgetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  widgetId: { type: String, required: true },
  type: { type: String, enum: ['kpi', 'chart', 'list', 'table'], required: true },
  title: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
  },
  visible: { type: Boolean, default: true },
  settings: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model<IDashboardWidget>('DashboardWidget', DashboardWidgetSchema);