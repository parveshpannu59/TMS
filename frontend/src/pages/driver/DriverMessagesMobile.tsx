import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { messageApi } from '@/api/message.api';
import { getApiOrigin } from '@/api/client';
import { getAuth } from '@/utils/mobileAuth';
import { usePusherContext } from '@/contexts/PusherContext';
import type { Conversation, Message } from '@/types/message.types';
import '../../layouts/mobile/mobile.css';

// ─── Helpers ──────────────────────────────────────────────────
function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatChatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function shouldShowDateSeparator(messages: Message[], index: number) {
  if (index === 0) return true;
  const curr = new Date(messages[index].createdAt).toDateString();
  const prev = new Date(messages[index - 1].createdAt).toDateString();
  return curr !== prev;
}

// ─── Styles ────────────────────────────────────────────────────
const STYLES = `
  @keyframes wa-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes wa-slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes wa-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  @keyframes wa-dot-bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  @keyframes wa-scale-in {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  .wa-msg-enter {
    animation: wa-fade-in 0.25s ease both;
  }
  .wa-conv-item {
    transition: background 0.15s ease;
  }
  .wa-conv-item:active {
    background: var(--dm-fill) !important;
  }
  .wa-input-area {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .wa-attachment-preview {
    animation: wa-scale-in 0.2s ease both;
  }
  .wa-img-bubble {
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  .wa-img-bubble:active {
    transform: scale(0.97);
  }
  /* Make the chat fill the available space properly on mobile */
  .wa-chat-root {
    position: fixed;
    top: calc(52px + env(safe-area-inset-top, 0px));
    left: 0;
    right: 0;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    background: var(--dm-bg);
    z-index: 50;
  }
  .wa-list-root {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
    margin-bottom: -100px;
    padding-bottom: 0 !important;
  }
`;

// ─── Chat Channel Hook ────────────────────────────────────────
function useChatChannel(otherUserId: string | undefined) {
  const { pusherInstance, connected } = usePusherContext();
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<any>(null);
  const [readReceipt, setReadReceipt] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const myUserId = getAuth()?.user?.id;

  useEffect(() => {
    if (!pusherInstance || !connected || !otherUserId || !myUserId) return;

    // Build deterministic channel name
    const sorted = [myUserId, otherUserId].sort();
    const channelName = `chat-${sorted[0]}-${sorted[1]}`;

    const channel = pusherInstance.subscribe(channelName);
    channelRef.current = channel;

    channel.bind('message-new', (data: any) => {
      if (data.fromUserId !== myUserId) {
        setIncomingMessage(data);
      }
    });

    channel.bind('typing', (data: any) => {
      if (data.fromUserId !== myUserId) {
        setTypingUser(data.fromUserName);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
      }
    });

    channel.bind('read-receipt', (data: any) => {
      if (data.userId !== myUserId) {
        setReadReceipt(data.readAt);
      }
    });

    return () => {
      try {
        channel.unbind_all();
        pusherInstance.unsubscribe(channelName);
      } catch { /* ignore */ }
      channelRef.current = null;
    };
  }, [pusherInstance, connected, otherUserId, myUserId]);

  return { typingUser, incomingMessage, readReceipt };
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function DriverMessagesMobile() {
  const { connected: pusherConnected } = usePusherContext();

  const [view, setView] = useState<'list' | 'chat' | 'contacts' | 'groupchat'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contactUsers, setContactUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedUserAvatar, setSelectedUserAvatar] = useState<string | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [imageViewer, setImageViewer] = useState<string | null>(null);
  const [_unreadTotal, setUnreadTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatTab, setChatTab] = useState<'chats' | 'groups'>('chats');

  // ─── Group State ──────────────────────────────────────────
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [selectedGroupName, setSelectedGroupName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myUserId = getAuth()?.user?.id;
  const apiOrigin = getApiOrigin();

  // Real-time chat channel
  const { typingUser, incomingMessage, readReceipt } = useChatChannel(selectedUserId);

  // ─── Group Pusher channel ─────────────────────────────────
  const { pusherInstance } = usePusherContext();
  const [incomingGroupMsg, setIncomingGroupMsg] = useState<any>(null);
  useEffect(() => {
    if (!pusherInstance || !selectedGroupId || !myUserId) return;
    const ch = pusherInstance.subscribe(`group-${selectedGroupId}`);
    ch.bind('message-new', (data: any) => {
      if (data.fromUserId !== myUserId) setIncomingGroupMsg({ ...data, _ts: Date.now() });
    });
    return () => { try { ch.unbind_all(); pusherInstance.unsubscribe(`group-${selectedGroupId}`); } catch {} };
  }, [pusherInstance, selectedGroupId, myUserId]);

  // Handle incoming group message
  useEffect(() => {
    if (incomingGroupMsg && selectedGroupId) {
      setMessages(prev => {
        if (prev.some(m => m.id === incomingGroupMsg.messageId)) return prev;
        return [...prev, {
          id: incomingGroupMsg.messageId,
          fromUserId: incomingGroupMsg.fromUserId,
          toUserId: '',
          message: incomingGroupMsg.message,
          messageType: incomingGroupMsg.messageType || 'text',
          attachments: incomingGroupMsg.attachments || [],
          read: true,
          encrypted: false,
          createdAt: incomingGroupMsg.timestamp || new Date().toISOString(),
          updatedAt: incomingGroupMsg.timestamp || new Date().toISOString(),
        }];
      });
      messageApi.markGroupAsRead(selectedGroupId).catch(() => {});
    }
  }, [incomingGroupMsg, selectedGroupId]);

  // ─── Fetch Groups ─────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    try { const data = await messageApi.getGroups(); setGroups(data); } catch { setGroups([]); }
  }, []);

  // ─── Fetch Conversations ──────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageApi.getConversations();
      setConversations(data);
      const total = data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadTotal(total);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const data = await messageApi.getConversation(userId);
      setMessages(data);
      // Mark as read and notify shell to refresh badge + conversation list
      messageApi.markAsRead(userId).then(() => {
        window.dispatchEvent(new Event('messages-read'));
        fetchConversations(); // refresh unread counts in conversation list
      }).catch(() => {});
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [fetchConversations]);

  useEffect(() => { fetchConversations(); fetchGroups(); }, [fetchConversations, fetchGroups]);

  useEffect(() => {
    if (selectedUserId && view === 'chat') fetchMessages(selectedUserId);
  }, [selectedUserId, view, fetchMessages]);

  // Handle incoming real-time message
  useEffect(() => {
    if (incomingMessage && selectedUserId) {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === incomingMessage.messageId)) return prev;
        return [...prev, {
          id: incomingMessage.messageId,
          fromUserId: incomingMessage.fromUserId,
          toUserId: incomingMessage.toUserId,
          message: incomingMessage.message,
          messageType: incomingMessage.messageType || 'text',
          attachments: incomingMessage.attachments || [],
          read: true,
          encrypted: false,
          createdAt: incomingMessage.timestamp || new Date().toISOString(),
          updatedAt: incomingMessage.timestamp || new Date().toISOString(),
        }];
      });
      // Mark as read immediately and notify shell
      messageApi.markAsRead(selectedUserId).then(() => {
        window.dispatchEvent(new Event('messages-read'));
      }).catch(() => {});
    }
  }, [incomingMessage, selectedUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // ─── Send Message ─────────────────────────────────────────
  const handleSend = async () => {
    if (!selectedUserId || (!messageText.trim() && !attachmentFile)) return;
    try {
      setSending(true);
      let newMsg: Message;

      if (attachmentFile) {
        newMsg = await messageApi.sendMessageWithFile({
          toUserId: selectedUserId,
          message: messageText.trim() || undefined,
          file: attachmentFile,
        });
      } else {
        newMsg = await messageApi.sendMessage({
          toUserId: selectedUserId,
          message: messageText.trim(),
          messageType: 'text',
        });
      }

      setMessages(prev => [...prev, newMsg]);
      setMessageText('');
      clearAttachment();
      fetchConversations();
    } catch {
      /* show error */
    } finally {
      setSending(false);
    }
  };

  // ─── Typing Indicator ─────────────────────────────────────
  const handleTyping = () => {
    if (!selectedUserId) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    messageApi.sendTyping(selectedUserId, true).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      messageApi.sendTyping(selectedUserId!, false).catch(() => {});
    }, 2000);
  };

  // ─── File Attachment ──────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setAttachmentPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
    // Reset file input
    e.target.value = '';
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  // ─── Open Chat ────────────────────────────────────────────
  const openChat = (userId: string, name: string, avatar?: string | null, role?: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(name);
    setSelectedUserAvatar(avatar || null);
    setSelectedUserRole(role || '');
    setView('chat');
  };

  const goBack = () => {
    setView('list');
    setSelectedUserId(undefined);
    setSelectedGroupId(undefined);
    setMessages([]);
    fetchConversations();
    fetchGroups();
    // Notify shell to refresh badge immediately
    window.dispatchEvent(new Event('messages-read'));
  };

  // ─── Open Group Chat ────────────────────────────────────────
  const openGroupChat = (group: any) => {
    setSelectedGroupId(group.id || group._id);
    setSelectedGroupName(group.name);
    setSelectedUserId(undefined);
    setView('groupchat');
  };

  // ─── Fetch Group Messages ─────────────────────────────────
  useEffect(() => {
    if (view === 'groupchat' && selectedGroupId) {
      setLoading(true);
      messageApi.getGroupMessages(selectedGroupId).then(data => {
        setMessages(data);
        messageApi.markGroupAsRead(selectedGroupId).catch(() => {});
      }).catch(() => setMessages([])).finally(() => setLoading(false));
    }
  }, [view, selectedGroupId]);

  // ─── Send Group Message ───────────────────────────────────
  const handleSendGroupMessage = async () => {
    if (!selectedGroupId || (!messageText.trim() && !attachmentFile)) return;
    try {
      setSending(true);
      let newMsg: any;
      if (attachmentFile) {
        newMsg = await messageApi.sendGroupMessageWithFile(selectedGroupId, attachmentFile, messageText.trim() || undefined);
      } else {
        newMsg = await messageApi.sendGroupMessage(selectedGroupId, { message: messageText.trim() });
      }
      setMessages(prev => [...prev, newMsg]);
      setMessageText('');
      setAttachmentFile(null);
      setAttachmentPreview(null);
    } catch { /* */ }
    finally { setSending(false); }
  };

  // ─── New Chat ─────────────────────────────────────────────
  const openNewChat = async () => {
    try {
      const users = await messageApi.getUsers();
      setContactUsers(users);
      setView('contacts');
    } catch {
      setContactUsers([]);
      setView('contacts');
    }
  };

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      (c.otherUserName || '').toLowerCase().includes(q) ||
      (c.lastMessage?.message || '').toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // ─── Get image URL for attachments ─────────────────────────
  const getFileUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${apiOrigin}${url}`;
  };

  // ═══════════════════════════════════════════════════════════════
  // IMAGE VIEWER (Full screen)
  // ═══════════════════════════════════════════════════════════════
  if (imageViewer) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'wa-fade-in 0.2s ease',
        }}
        onClick={() => setImageViewer(null)}
      >
        <button
          onClick={() => setImageViewer(null)}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20,
            width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}
        >
          ×
        </button>
        <img
          src={imageViewer}
          alt="Preview"
          style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTACTS LIST (New Chat)
  // ═══════════════════════════════════════════════════════════════
  if (view === 'contacts') {
    return (
      <>
        <style>{STYLES}</style>
        <div className="wa-chat-root">
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            borderBottom: '0.5px solid var(--dm-separator)', flexShrink: 0,
            background: 'var(--dm-surface)',
          }}>
            <button onClick={() => setView('list')} style={{
              background: 'none', border: 'none', color: 'var(--dm-accent)',
              fontSize: 16, cursor: 'pointer', padding: 4, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
            <span style={{ fontWeight: 700, fontSize: 18, flex: 1, textAlign: 'center' }}>New Chat</span>
            <div style={{ width: 60 }} />
          </div>

          {/* Contact List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
            {contactUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--dm-muted)' }}>
                <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.5 }}>👤</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>No contacts available</div>
              </div>
            ) : (
              contactUsers.map(user => (
                <div
                  key={user._id}
                  className="wa-conv-item"
                  onClick={() => openChat(user._id, user.name || user.email, user.profilePicture, user.role)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', cursor: 'pointer',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 16, fontWeight: 700, color: '#fff',
                    overflow: 'hidden',
                  }}>
                    {user.profilePicture ? (
                      <img src={getFileUrl(user.profilePicture)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : getInitials(user.name || user.email || 'U')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{user.name || user.email}</div>
                    <div style={{ fontSize: 13, color: 'var(--dm-muted)', textTransform: 'capitalize' }}>
                      {user.role === 'owner' ? '🏢 Owner' : user.role === 'dispatcher' ? '📋 Dispatcher' : '🚛 Driver'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CHAT VIEW
  // ═══════════════════════════════════════════════════════════════
  if (view === 'chat' && selectedUserId) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="wa-chat-root">
          {/* ─── Chat Header ─── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px',
            background: 'var(--dm-surface)',
            borderBottom: '0.5px solid var(--dm-separator)',
            flexShrink: 0,
          }}>
            <button onClick={goBack} style={{
              background: 'none', border: 'none', color: 'var(--dm-accent)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'grid', placeItems: 'center',
              fontSize: 15, fontWeight: 700, color: '#fff',
            }}>
              {selectedUserAvatar ? (
                <img src={getFileUrl(selectedUserAvatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : getInitials(selectedUserName || 'U')}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.2 }}>{selectedUserName}</div>
              <div style={{ fontSize: 12, color: 'var(--dm-muted)', lineHeight: 1.3 }}>
                {typingUser ? (
                  <span style={{ color: 'var(--dm-accent)', fontStyle: 'italic' }}>typing...</span>
                ) : pusherConnected ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#34c759', display: 'inline-block',
                    }} />
                    online
                  </span>
                ) : (
                  <span style={{ textTransform: 'capitalize' }}>
                    {selectedUserRole === 'owner' ? '🏢 Owner' : selectedUserRole === 'dispatcher' ? '📋 Dispatch' : '🚛 Driver'}
                  </span>
                )}
              </div>
            </div>

            {/* Call button */}
            <button style={{
              background: 'none', border: 'none', color: 'var(--dm-accent)',
              cursor: 'pointer', padding: 8,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
          </div>

          {/* ─── Chat Background Pattern ─── */}
          <div style={{
            flex: 1, overflow: 'auto', padding: '8px 12px',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {loading && messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--dm-muted)' }}>
                <div style={{ fontSize: 13 }}>Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--dm-muted)' }}>
                <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.4 }}>💬</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Start a conversation</div>
                <div style={{ fontSize: 13 }}>Say hello to {selectedUserName}!</div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwn = msg.fromUserId === myUserId;
                const showDate = shouldShowDateSeparator(messages, idx);
                const hasImage = msg.attachments?.some(a => a.type?.startsWith('image/'));
                const hasFile = msg.attachments?.some(a => !a.type?.startsWith('image/'));
                const isLastOwn = isOwn && (idx === messages.length - 1 || messages[idx + 1]?.fromUserId !== myUserId);

                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div style={{
                        textAlign: 'center', margin: '12px 0 8px',
                      }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 14px',
                          borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: 'rgba(0,0,0,0.06)', color: 'var(--dm-muted)',
                        }}>
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className="wa-msg-enter"
                      style={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        marginBottom: 2,
                        animationDelay: `${Math.min(idx * 0.02, 0.3)}s`,
                      }}
                    >
                      <div style={{
                        maxWidth: '80%',
                        minWidth: hasImage ? 220 : 80,
                        padding: hasImage ? 4 : '8px 12px',
                        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isOwn
                          ? 'linear-gradient(135deg, #007aff, #0056d6)'
                          : 'var(--dm-surface)',
                        color: isOwn ? '#fff' : 'var(--dm-text)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        position: 'relative',
                      }}>
                        {/* Image attachment */}
                        {hasImage && msg.attachments?.filter(a => a.type?.startsWith('image/')).map((att, i) => (
                          <div
                            key={i}
                            className="wa-img-bubble"
                            onClick={() => setImageViewer(getFileUrl(att.url))}
                            style={{ marginBottom: msg.message && msg.message !== '📷 Photo' ? 6 : 0 }}
                          >
                            <img
                              src={getFileUrl(att.url)}
                              alt={att.name}
                              style={{
                                width: '100%', maxWidth: 280, minHeight: 120,
                                maxHeight: 300, objectFit: 'cover', display: 'block',
                                borderRadius: 12,
                              }}
                              loading="lazy"
                            />
                          </div>
                        ))}

                        {/* File attachment */}
                        {hasFile && msg.attachments?.filter(a => !a.type?.startsWith('image/')).map((att, i) => (
                          <a
                            key={i}
                            href={getFileUrl(att.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: hasImage ? '8px 8px 4px' : '4px 0',
                              textDecoration: 'none', color: 'inherit',
                            }}
                          >
                            <div style={{
                              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                              background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--dm-fill)',
                              display: 'grid', placeItems: 'center', fontSize: 18,
                            }}>
                              {att.type?.includes('pdf') ? '📄' : att.type?.includes('word') ? '📝' : att.type?.includes('excel') || att.type?.includes('sheet') ? '📊' : '📎'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 13, fontWeight: 600,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{att.name}</div>
                              <div style={{ fontSize: 11, opacity: 0.7 }}>{formatFileSize(att.size)}</div>
                            </div>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.6 }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </a>
                        ))}

                        {/* Text message */}
                        {msg.message && msg.message !== '📷 Photo' && (
                          <div style={{
                            fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word',
                            padding: hasImage ? '4px 8px 0' : 0,
                          }}>
                            {msg.message}
                          </div>
                        )}

                        {/* Time + read receipts */}
                        <div style={{
                          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                          gap: 3, marginTop: 3,
                          padding: hasImage && (!msg.message || msg.message === '📷 Photo') ? '0 8px 4px' : 0,
                        }}>
                          <span style={{ fontSize: 10, opacity: 0.6 }}>
                            {formatChatTime(msg.createdAt)}
                          </span>
                          {isOwn && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {msg.read || (readReceipt && isLastOwn) ? (
                                <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                                  <path d="M1 5l3 3L10 2" stroke={isOwn ? '#7dd3fc' : '#34c759'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M5 5l3 3L14 2" stroke={isOwn ? '#7dd3fc' : '#34c759'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                  <path d="M1 5l3 3L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {typingUser && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                <div style={{
                  padding: '10px 16px', borderRadius: '16px 16px 16px 4px',
                  background: 'var(--dm-surface)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--dm-muted)',
                        animation: `wa-dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── Attachment Preview ─── */}
          {attachmentFile && (
            <div className="wa-attachment-preview" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: 'var(--dm-surface)',
              borderTop: '0.5px solid var(--dm-separator)',
              flexShrink: 0,
            }}>
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="" style={{
                  width: 48, height: 48, borderRadius: 8, objectFit: 'cover',
                }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 8,
                  background: 'var(--dm-fill)',
                  display: 'grid', placeItems: 'center', fontSize: 22,
                }}>
                  📎
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {attachmentFile.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>
                  {formatFileSize(attachmentFile.size)}
                </div>
              </div>
              <button onClick={clearAttachment} style={{
                background: 'var(--dm-fill)', border: 'none', borderRadius: 12,
                width: 32, height: 32, cursor: 'pointer', display: 'grid', placeItems: 'center',
                fontSize: 16, color: 'var(--dm-muted)',
              }}>×</button>
            </div>
          )}

          {/* ─── Input Area ─── */}
          <div className="wa-input-area" style={{
            display: 'flex', alignItems: 'flex-end', gap: 6,
            padding: '6px 8px',
            background: 'var(--dm-surface)',
            borderTop: '0.5px solid var(--dm-separator)',
            flexShrink: 0,
          }}>
            {/* Attachment button */}
            <button onClick={() => fileInputRef.current?.click()} style={{
              background: 'none', border: 'none', color: 'var(--dm-muted)',
              cursor: 'pointer', padding: 6, flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            {/* Camera button */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e: any) => {
                  const file = e.target?.files?.[0];
                  if (file) {
                    setAttachmentFile(file);
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = () => setAttachmentPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }
                };
                input.click();
              }}
              style={{
                background: 'none', border: 'none', color: 'var(--dm-muted)',
                cursor: 'pointer', padding: 6, flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            {/* Text Input */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'var(--dm-fill)', borderRadius: 20,
              padding: '0 4px 0 12px', minHeight: 38,
            }}>
              <input
                ref={textInputRef}
                type="text"
                placeholder="Message"
                value={messageText}
                onChange={(e) => { setMessageText(e.target.value); handleTyping(); }}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 16, color: 'var(--dm-text)', padding: '8px 0',
                  lineHeight: 1.3,
                }}
              />
            </div>

            {/* Send button */}
            {(messageText.trim() || attachmentFile) ? (
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: 'var(--dm-accent)', color: '#fff',
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                  flexShrink: 0, transition: 'transform 0.15s, opacity 0.15s',
                  opacity: sending ? 0.6 : 1,
                  transform: sending ? 'scale(0.9)' : 'scale(1)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            ) : (
              <button style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: 'var(--dm-fill)', color: 'var(--dm-muted)',
                display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GROUP CHAT VIEW
  // ═══════════════════════════════════════════════════════════════
  if (view === 'groupchat' && selectedGroupId) {
    const currentGroup = groups.find(g => (g.id || g._id) === selectedGroupId);
    const memberDetails: any[] = currentGroup?.memberDetails || currentGroup?.members || [];
    const memberCount = memberDetails.length;

    return (
      <>
        <style>{STYLES}</style>
        <div className="wa-chat-root">
          {/* ─── Group Chat Header ─── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px',
            background: 'var(--dm-surface)',
            borderBottom: '0.5px solid var(--dm-separator)',
            flexShrink: 0,
          }}>
            <button onClick={goBack} style={{
              background: 'none', border: 'none', color: 'var(--dm-accent)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            {/* Group Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: 'linear-gradient(135deg, #f093fb, #f5576c)',
              display: 'grid', placeItems: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff',
            }}>
              👥
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedGroupName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--dm-muted)', lineHeight: 1.3 }}>
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* ─── Group Messages ─── */}
          <div style={{
            flex: 1, overflow: 'auto', padding: '8px 12px',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {loading && messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--dm-muted)' }}>
                <div style={{ fontSize: 13 }}>Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--dm-muted)' }}>
                <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.4 }}>👥</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Group created</div>
                <div style={{ fontSize: 13 }}>Send the first message in {selectedGroupName}!</div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwn = msg.fromUserId === myUserId;
                const showDate = shouldShowDateSeparator(messages, idx);
                const hasImage = msg.attachments?.some(a => a.type?.startsWith('image/'));
                const hasFile = msg.attachments?.some(a => !a.type?.startsWith('image/'));
                // Find sender name from group memberDetails
                const senderMember = memberDetails.find((m: any) => (m._id || m.id) === msg.fromUserId);
                const senderName = senderMember?.name || senderMember?.email || (isOwn ? 'You' : 'Unknown');

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 14px',
                          borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: 'rgba(0,0,0,0.06)', color: 'var(--dm-muted)',
                        }}>
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div
                      className="wa-msg-enter"
                      style={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        marginBottom: 2,
                      }}
                    >
                      <div style={{
                        maxWidth: '80%',
                        minWidth: hasImage ? 220 : 80,
                        padding: hasImage ? 4 : '8px 12px',
                        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isOwn
                          ? 'linear-gradient(135deg, #007aff, #0056d6)'
                          : 'var(--dm-surface)',
                        color: isOwn ? '#fff' : 'var(--dm-text)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        position: 'relative',
                      }}>
                        {/* Sender name for group */}
                        {!isOwn && (
                          <div style={{
                            fontSize: 12, fontWeight: 700, marginBottom: 2,
                            color: '#f093fb',
                            padding: hasImage ? '4px 8px 0' : 0,
                          }}>
                            {senderName}
                          </div>
                        )}

                        {/* Image attachment */}
                        {hasImage && msg.attachments?.filter(a => a.type?.startsWith('image/')).map((att, i) => (
                          <div
                            key={i}
                            className="wa-img-bubble"
                            onClick={() => setImageViewer(getFileUrl(att.url))}
                            style={{ marginBottom: msg.message && msg.message !== '📷 Photo' ? 6 : 0 }}
                          >
                            <img
                              src={getFileUrl(att.url)}
                              alt={att.name}
                              style={{
                                width: '100%', maxWidth: 280, minHeight: 120,
                                maxHeight: 300, objectFit: 'cover', display: 'block',
                                borderRadius: 12,
                              }}
                              loading="lazy"
                            />
                          </div>
                        ))}

                        {/* File attachment */}
                        {hasFile && msg.attachments?.filter(a => !a.type?.startsWith('image/')).map((att, i) => (
                          <a
                            key={i}
                            href={getFileUrl(att.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: hasImage ? '8px 8px 4px' : '4px 0',
                              textDecoration: 'none', color: 'inherit',
                            }}
                          >
                            <div style={{
                              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                              background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--dm-fill)',
                              display: 'grid', placeItems: 'center', fontSize: 18,
                            }}>
                              {att.type?.includes('pdf') ? '📄' : att.type?.includes('word') ? '📝' : att.type?.includes('excel') || att.type?.includes('sheet') ? '📊' : '📎'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 13, fontWeight: 600,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{att.name}</div>
                              <div style={{ fontSize: 11, opacity: 0.7 }}>{formatFileSize(att.size)}</div>
                            </div>
                          </a>
                        ))}

                        {/* Text message */}
                        {msg.message && msg.message !== '📷 Photo' && (
                          <div style={{
                            fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word',
                            padding: hasImage ? '4px 8px 0' : 0,
                          }}>
                            {msg.message}
                          </div>
                        )}

                        {/* Time */}
                        <div style={{
                          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                          gap: 3, marginTop: 3,
                          padding: hasImage && (!msg.message || msg.message === '📷 Photo') ? '0 8px 4px' : 0,
                        }}>
                          <span style={{ fontSize: 10, opacity: 0.6 }}>
                            {formatChatTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── Attachment Preview ─── */}
          {attachmentFile && (
            <div className="wa-attachment-preview" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: 'var(--dm-surface)',
              borderTop: '0.5px solid var(--dm-separator)',
              flexShrink: 0,
            }}>
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="" style={{
                  width: 48, height: 48, borderRadius: 8, objectFit: 'cover',
                }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 8,
                  background: 'var(--dm-fill)',
                  display: 'grid', placeItems: 'center', fontSize: 22,
                }}>
                  📎
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {attachmentFile.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>
                  {formatFileSize(attachmentFile.size)}
                </div>
              </div>
              <button onClick={clearAttachment} style={{
                background: 'var(--dm-fill)', border: 'none', borderRadius: 12,
                width: 32, height: 32, cursor: 'pointer', display: 'grid', placeItems: 'center',
                fontSize: 16, color: 'var(--dm-muted)',
              }}>×</button>
            </div>
          )}

          {/* ─── Input Area ─── */}
          <div className="wa-input-area" style={{
            display: 'flex', alignItems: 'flex-end', gap: 6,
            padding: '6px 8px',
            background: 'var(--dm-surface)',
            borderTop: '0.5px solid var(--dm-separator)',
            flexShrink: 0,
          }}>
            <button onClick={() => fileInputRef.current?.click()} style={{
              background: 'none', border: 'none', color: 'var(--dm-muted)',
              cursor: 'pointer', padding: 6, flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'var(--dm-fill)', borderRadius: 20,
              padding: '0 4px 0 12px', minHeight: 38,
            }}>
              <input
                ref={textInputRef}
                type="text"
                placeholder="Message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendGroupMessage()}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 16, color: 'var(--dm-text)', padding: '8px 0',
                  lineHeight: 1.3,
                }}
              />
            </div>

            {(messageText.trim() || attachmentFile) ? (
              <button
                onClick={handleSendGroupMessage}
                disabled={sending}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: 'var(--dm-accent)', color: '#fff',
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                  flexShrink: 0, transition: 'transform 0.15s, opacity 0.15s',
                  opacity: sending ? 0.6 : 1,
                  transform: sending ? 'scale(0.9)' : 'scale(1)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            ) : (
              <button style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: 'var(--dm-fill)', color: 'var(--dm-muted)',
                display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSATIONS LIST (WhatsApp Home)
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <style>{STYLES}</style>
      <div className="wa-list-root">
        {/* ─── Header ─── */}
        <div style={{
          padding: '14px 16px 10px', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: -0.5 }}>Chats</div>
            {pusherConnected && (
              <div style={{
                fontSize: 11, color: 'var(--dm-success)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--dm-success)', display: 'inline-block',
                }} />
                Real-time connected
              </div>
            )}
          </div>
          <button
            onClick={openNewChat}
            style={{
              width: 38, height: 38, borderRadius: 12, border: 'none',
              background: 'var(--dm-accent)', color: '#fff',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,122,255,0.3)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              <line x1="9" y1="10" x2="15" y2="10"/>
              <line x1="12" y1="7" x2="12" y2="13"/>
            </svg>
          </button>
        </div>

        {/* ─── Search Bar ─── */}
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--dm-fill)', borderRadius: 12,
            padding: '0 12px', height: 38,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dm-muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 15, color: 'var(--dm-text)', padding: '8px 0',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{
                background: 'none', border: 'none', color: 'var(--dm-muted)',
                cursor: 'pointer', padding: 2,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ─── Chats / Groups Tabs ─── */}
        <div style={{
          display: 'flex', padding: '0 16px 8px', gap: 0,
          borderBottom: '0.5px solid var(--dm-separator)',
        }}>
          {(['chats', 'groups'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setChatTab(tab)}
              style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                background: 'none', fontWeight: 700, fontSize: 14,
                textTransform: 'uppercase', letterSpacing: 0.5,
                color: chatTab === tab ? 'var(--dm-accent)' : 'var(--dm-muted)',
                borderBottom: chatTab === tab ? '2px solid var(--dm-accent)' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'chats' ? 'Chats' : 'Groups'}
              {tab === 'groups' && groups.length > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 11, padding: '1px 6px',
                  borderRadius: 10, background: chatTab === 'groups' ? 'var(--dm-accent)' : 'var(--dm-fill)',
                  color: chatTab === 'groups' ? '#fff' : 'var(--dm-muted)', fontWeight: 700,
                }}>{groups.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Content ─── */}
        <div style={{ flex: 1, overflow: 'auto' }}>

        {/* ─── Groups Tab ─── */}
        {chatTab === 'groups' && (
          <div>
            {groups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--dm-muted)' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 24, margin: '0 auto 16px',
                  background: 'var(--dm-fill)',
                  display: 'grid', placeItems: 'center', fontSize: 38,
                }}>👥</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: 'var(--dm-text)' }}>
                  No Groups Yet
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
                  Groups will appear here when created
                </div>
              </div>
            ) : (
              groups.map((group: any) => {
                const memberCount = group.memberDetails?.length || group.members?.length || 0;
                const lastMsg = group.lastMessage || group.description || '';
                return (
                  <div
                    key={group.id || group._id}
                    className="wa-conv-item"
                    onClick={() => openGroupChat(group)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', cursor: 'pointer',
                      borderBottom: '0.5px solid var(--dm-separator)',
                    }}
                  >
                    {/* Group Avatar */}
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 22, fontWeight: 700, color: '#fff',
                    }}>
                      👥
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 2,
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {group.name}
                        </div>
                        {group.lastMessageAt && (
                          <span style={{ fontSize: 12, color: 'var(--dm-muted)', flexShrink: 0 }}>
                            {formatChatTime(group.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--dm-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {memberCount} member{memberCount !== 1 ? 's' : ''}{lastMsg ? ` · ${lastMsg}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Conversations (Chats Tab) ─── */}
        {chatTab === 'chats' && (
        <div>
          {loading && conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--dm-muted)' }}>
              <div style={{ fontSize: 15 }}>Loading chats...</div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--dm-muted)' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 24, margin: '0 auto 16px',
                background: 'var(--dm-fill)',
                display: 'grid', placeItems: 'center', fontSize: 38,
              }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: 'var(--dm-text)' }}>
                {searchQuery ? 'No results' : 'No Conversations Yet'}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
                {searchQuery ? 'Try a different search' : 'Tap the + button above to start chatting with your team'}
              </div>
              {!searchQuery && (
                <button
                  onClick={openNewChat}
                  style={{
                    marginTop: 20, padding: '12px 28px', borderRadius: 22,
                    background: 'var(--dm-accent)', color: '#fff', border: 'none',
                    fontWeight: 600, fontSize: 15, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,122,255,0.3)',
                  }}
                >
                  Start a Chat
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((conv, idx) => {
              const name = conv.otherUserName || `User ${conv.otherUserId.slice(0, 8)}`;
              const lastMsg = conv.lastMessage;
              const hasUnread = (conv.unreadCount || 0) > 0;
              const isImage = lastMsg?.messageType === 'image';
              const isFile = lastMsg?.messageType === 'file';

              return (
                <div
                  key={conv.otherUserId}
                  className="wa-conv-item"
                  onClick={() => openChat(conv.otherUserId, name, conv.otherUserAvatar, conv.otherUserRole)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', cursor: 'pointer',
                    animation: `wa-fade-in 0.3s ease ${idx * 0.04}s both`,
                    borderBottom: '0.5px solid var(--dm-separator)',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    position: 'relative', flexShrink: 0,
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                      background: `linear-gradient(135deg, ${
                        conv.otherUserRole === 'owner' ? '#667eea, #764ba2'
                        : conv.otherUserRole === 'dispatcher' ? '#f093fb, #f5576c'
                        : '#4facfe, #00f2fe'
                      })`,
                      display: 'grid', placeItems: 'center',
                      fontSize: 18, fontWeight: 700, color: '#fff',
                    }}>
                      {conv.otherUserAvatar ? (
                        <img src={getFileUrl(conv.otherUserAvatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : getInitials(name)}
                    </div>
                    {/* Online dot */}
                    <div style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: 14, height: 14, borderRadius: '50%',
                      background: '#34c759', border: '2.5px solid var(--dm-surface)',
                    }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{
                        fontWeight: hasUnread ? 700 : 600, fontSize: 16,
                        color: 'var(--dm-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </span>
                      <span style={{
                        fontSize: 12, flexShrink: 0, marginLeft: 8,
                        color: hasUnread ? 'var(--dm-accent)' : 'var(--dm-muted)',
                        fontWeight: hasUnread ? 600 : 400,
                      }}>
                        {lastMsg?.createdAt ? formatTime(lastMsg.createdAt) : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 14, lineHeight: 1.4,
                        color: hasUnread ? 'var(--dm-text)' : 'var(--dm-muted)',
                        fontWeight: hasUnread ? 500 : 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {lastMsg?.fromUserId === myUserId && (
                          <span style={{ opacity: 0.7 }}>You: </span>
                        )}
                        {isImage ? '📷 Photo' : isFile ? '📎 Document' : lastMsg?.message || 'Start chatting'}
                      </span>
                      {hasUnread && (
                        <span style={{
                          background: 'var(--dm-accent)', color: '#fff',
                          fontSize: 11, fontWeight: 700,
                          minWidth: 20, height: 20, padding: '0 6px',
                          borderRadius: 10, display: 'grid', placeItems: 'center',
                          flexShrink: 0, marginLeft: 8,
                        }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}
        </div>
      </div>
    </>
  );
}
