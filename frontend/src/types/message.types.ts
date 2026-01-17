export interface Message {
  id: string;
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
  readAt?: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  otherUserId: string;
  loadId?: string;
  lastMessage: Message;
  unreadCount: number;
}

export interface SendMessageData {
  toUserId: string;
  loadId?: string;
  message: string;
  messageType?: 'text' | 'image' | 'file' | 'location' | 'emergency';
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
  }>;
}
