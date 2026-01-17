import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  fromUserId: string;
  toUserId: string;
  loadId?: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'location' | 'emergency';
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
  }>;
  read: boolean;
  readAt?: Date;
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
});

const messageSchema = new Schema<IMessage>(
  {
    fromUserId: {
      type: String,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: String,
      ref: 'User',
      required: true,
    },
    loadId: {
      type: String,
      ref: 'Load',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'location', 'emergency'],
      default: 'text',
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    encrypted: {
      type: Boolean,
      default: true, // End-to-end encryption enabled by default
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

// Indexes for efficient queries
messageSchema.index({ fromUserId: 1, createdAt: -1 });
messageSchema.index({ toUserId: 1, read: 1, createdAt: -1 });
messageSchema.index({ loadId: 1, createdAt: -1 });
messageSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
