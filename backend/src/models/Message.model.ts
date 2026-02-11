import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  fromUserId: string;
  toUserId: string;
  groupId?: string;      // Group conversation ID (if group message)
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
  readBy?: string[];      // For group messages: array of userIds who read it
  readAt?: Date;
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Group Conversation Model ────────────────────────────────
export interface IGroup extends Document {
  name: string;
  description?: string;
  avatar?: string;
  createdBy: string;
  members: string[];       // Array of user IDs
  admins: string[];        // Array of admin user IDs
  companyId?: string;
  isActive: boolean;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    avatar: { type: String },
    createdBy: { type: String, required: true },
    members: [{ type: String, required: true }],
    admins: [{ type: String, required: true }],
    companyId: { type: String },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date },
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

groupSchema.index({ members: 1 });
groupSchema.index({ companyId: 1 });

export const Group = mongoose.model<IGroup>('Group', groupSchema);

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
      default: '',  // Empty for group messages
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
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
    readBy: {
      type: [String],
      default: [],
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
messageSchema.index({ groupId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
