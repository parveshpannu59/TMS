export interface MessageAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  loadId?: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'location' | 'emergency';
  attachments?: MessageAttachment[];
  read: boolean;
  readAt?: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  otherUserId: string;
  otherUserName?: string;
  otherUserRole?: string;
  otherUserAvatar?: string;
  loadId?: string;
  lastMessage: Message;
  unreadCount: number;
  messageCount?: number;
}

export interface SendMessageData {
  toUserId: string;
  loadId?: string;
  message: string;
  messageType?: 'text' | 'image' | 'file' | 'location' | 'emergency';
  attachments?: MessageAttachment[];
}
