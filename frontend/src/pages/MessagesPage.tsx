import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Box, Typography, Avatar, IconButton, Badge, TextField, InputAdornment, Chip, CircularProgress, Tooltip, Checkbox, Button, AvatarGroup, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Search, Send, AttachFile, Image as ImageIcon, Close, ArrowBack, Add, Circle, InsertDriveFile, Download, Group as GroupIcon, PersonAdd } from '@mui/icons-material';
import { messageApi } from '@/api/message.api';
import { getApiOrigin } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { usePusherContext } from '@/contexts/PusherContext';
import type { Conversation, Message } from '@/types/message.types';

// ─── Helpers ──────────────────────────────────────────────
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

function formatDateSep(date: string) {
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const roleColors: Record<string, string> = {
  owner: '#7c3aed',
  dispatcher: '#ec4899',
  driver: '#0ea5e9',
  accountant: '#f59e0b',
};

const roleGradients: Record<string, string> = {
  owner: 'linear-gradient(135deg, #667eea, #764ba2)',
  dispatcher: 'linear-gradient(135deg, #f093fb, #f5576c)',
  driver: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  accountant: 'linear-gradient(135deg, #f6d365, #fda085)',
};

// ─── Chat Channel Hook ────────────────────────────────────
function useChatChannel(otherUserId: string | undefined) {
  const { pusherInstance, connected } = usePusherContext();
  const { user } = useAuth();
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<any>(null);
  const [readReceipt, setReadReceipt] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pusherInstance || !connected || !otherUserId || !user) return;

    const sorted = [user.id, otherUserId].sort();
    const channelName = `chat-${sorted[0]}-${sorted[1]}`;
    const channel = pusherInstance.subscribe(channelName);

    channel.bind('message-new', (data: any) => {
      if (data.fromUserId !== user.id) {
        setIncomingMessage({ ...data, _ts: Date.now() });
      }
    });

    channel.bind('typing', (data: any) => {
      if (data.fromUserId !== user.id) {
        setTypingUser(data.fromUserName);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
      }
    });

    channel.bind('read-receipt', (data: any) => {
      if (data.userId !== user.id) {
        setReadReceipt(data.readAt);
      }
    });

    return () => {
      try {
        channel.unbind_all();
        pusherInstance.unsubscribe(channelName);
      } catch { /* */ }
    };
  }, [pusherInstance, connected, otherUserId, user]);

  return { typingUser, incomingMessage, readReceipt };
}

// ─── Group Channel Hook ──────────────────────────────────
function useGroupChannel(groupId: string | undefined) {
  const { pusherInstance, connected } = usePusherContext();
  const { user } = useAuth();
  const [incomingGroupMessage, setIncomingGroupMessage] = useState<any>(null);

  useEffect(() => {
    if (!pusherInstance || !connected || !groupId || !user) return;

    const channelName = `group-${groupId}`;
    const channel = pusherInstance.subscribe(channelName);

    channel.bind('message-new', (data: any) => {
      if (data.fromUserId !== user.id) {
        setIncomingGroupMessage({ ...data, _ts: Date.now() });
      }
    });

    return () => {
      try {
        channel.unbind_all();
        pusherInstance.unsubscribe(channelName);
      } catch { /* */ }
    };
  }, [pusherInstance, connected, groupId, user]);

  return { incomingGroupMessage };
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
function MessagesPageContent() {
  const { user } = useAuth();
  const { connected: pusherConnected } = usePusherContext();
  const apiOrigin = getApiOrigin();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contactUsers, setContactUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedUserAvatar, setSelectedUserAvatar] = useState<string | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const [imageViewer, setImageViewer] = useState<string | null>(null);

  // ─── Group Chat State ────────────────────────────────────
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [chatTab, setChatTab] = useState<'chats' | 'groups'>('chats');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { typingUser, incomingMessage, readReceipt } = useChatChannel(selectedUserId);
  const { incomingGroupMessage } = useGroupChannel(selectedGroupId);

  // ─── Data Fetching ──────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageApi.getConversations();
      setConversations(data);
    } catch { setConversations([]); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      setMsgLoading(true);
      const data = await messageApi.getConversation(userId);
      setMessages(data);
      messageApi.markAsRead(userId).then(() => {
        window.dispatchEvent(new Event('messages-read'));
      }).catch(() => {});
    } catch { setMessages([]); }
    finally { setMsgLoading(false); }
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const users = await messageApi.getUsers();
      setContactUsers(users);
    } catch { setContactUsers([]); }
  }, []);

  // ─── Group Fetching ──────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    try {
      const data = await messageApi.getGroups();
      setGroups(data);
    } catch { setGroups([]); }
  }, []);

  const fetchGroupMessages = useCallback(async (groupId: string) => {
    try {
      setMsgLoading(true);
      const data = await messageApi.getGroupMessages(groupId);
      setMessages(data);
      messageApi.markGroupAsRead(groupId).then(() => {
        window.dispatchEvent(new Event('messages-read'));
      }).catch(() => {});
    } catch { setMessages([]); }
    finally { setMsgLoading(false); }
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    try {
      setCreatingGroup(true);
      await messageApi.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
        members: selectedMembers,
      });
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedMembers([]);
      fetchGroups();
    } catch { /* */ }
    finally { setCreatingGroup(false); }
  };

  const selectGroup = (group: any) => {
    setSelectedGroupId(group.id || group._id);
    setSelectedGroupName(group.name);
    setSelectedUserId(undefined); // Clear 1:1 selection
    setShowContacts(false);
  };

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
      clearAttachment();
      fetchGroups();
    } catch { /* */ }
    finally { setSending(false); }
  };

  useEffect(() => { fetchConversations(); fetchGroups(); }, [fetchConversations, fetchGroups]);

  useEffect(() => {
    if (selectedUserId) fetchMessages(selectedUserId);
  }, [selectedUserId, fetchMessages]);

  useEffect(() => {
    if (selectedGroupId) fetchGroupMessages(selectedGroupId);
  }, [selectedGroupId, fetchGroupMessages]);

  // Handle incoming messages
  useEffect(() => {
    if (incomingMessage && selectedUserId) {
      setMessages(prev => {
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
      messageApi.markAsRead(selectedUserId).then(() => {
        window.dispatchEvent(new Event('messages-read'));
      }).catch(() => {});
    }
  }, [incomingMessage, selectedUserId]);

  // Handle incoming group messages
  useEffect(() => {
    if (incomingGroupMessage && selectedGroupId) {
      setMessages(prev => {
        if (prev.some(m => m.id === incomingGroupMessage.messageId)) return prev;
        return [...prev, {
          id: incomingGroupMessage.messageId,
          fromUserId: incomingGroupMessage.fromUserId,
          toUserId: '',
          message: incomingGroupMessage.message,
          messageType: incomingGroupMessage.messageType || 'text',
          attachments: incomingGroupMessage.attachments || [],
          read: true,
          encrypted: false,
          createdAt: incomingGroupMessage.timestamp || new Date().toISOString(),
          updatedAt: incomingGroupMessage.timestamp || new Date().toISOString(),
        }];
      });
      messageApi.markGroupAsRead(selectedGroupId).catch(() => {});
    }
  }, [incomingGroupMessage, selectedGroupId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // ─── Actions ────────────────────────────────────────────
  const handleSend = async () => {
    // Route to group send if group is selected
    if (selectedGroupId) { await handleSendGroupMessage(); return; }
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
    } catch { /* */ }
    finally { setSending(false); }
  };

  const handleTyping = () => {
    if (!selectedUserId) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    messageApi.sendTyping(selectedUserId, true).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      messageApi.sendTyping(selectedUserId!, false).catch(() => {});
    }, 2000);
  };

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
    e.target.value = '';
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedUserId(conv.otherUserId);
    setSelectedUserName(conv.otherUserName || 'User');
    setSelectedUserAvatar(conv.otherUserAvatar || null);
    setSelectedUserRole(conv.otherUserRole || '');
    setSelectedGroupId(undefined); // Clear group selection
    setShowContacts(false);
  };

  const selectContact = (u: any) => {
    setSelectedUserId(u._id);
    setSelectedUserName(u.name || u.email);
    setSelectedUserAvatar(u.profilePicture || null);
    setSelectedUserRole(u.role || '');
    setShowContacts(false);
  };

  const getFileUrl = (url: string) => url.startsWith('http') ? url : `${apiOrigin}${url}`;

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      (c.otherUserName || '').toLowerCase().includes(q) ||
      (c.lastMessage?.message || '').toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // ─── Image Viewer ──────────────────────────────────────
  if (imageViewer) {
    return (
      <Box
        onClick={() => setImageViewer(null)}
        sx={{
          position: 'fixed', inset: 0, zIndex: 99999,
          bgcolor: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <IconButton
          onClick={() => setImageViewer(null)}
          sx={{ position: 'absolute', top: 16, right: 16, color: '#fff' }}
        >
          <Close />
        </IconButton>
        <img src={imageViewer} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex', height: 'calc(100vh - 64px)',
      bgcolor: 'background.default', overflow: 'hidden',
    }}>
      {/* ═══ LEFT PANEL - Conversations ═══ */}
      <Box sx={{
        width: { xs: 280, md: 340, lg: 360 }, minWidth: { xs: 280, md: 340, lg: 360 },
        borderRight: 1, borderColor: 'divider',
        display: 'flex', flexDirection: 'column',
        bgcolor: 'background.paper',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Header */}
        <Box sx={{
          p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: 1, borderColor: 'divider',
        }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Messages</Typography>
            {pusherConnected && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <Circle sx={{ fontSize: 8, color: 'success.main' }} />
                <Typography variant="caption" color="success.main" fontWeight={600}>Real-time</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="New Group">
              <IconButton
                onClick={() => { fetchContacts(); setShowCreateGroup(true); }}
                sx={{
                  bgcolor: 'action.hover', color: 'text.secondary',
                  '&:hover': { bgcolor: 'action.selected' },
                  width: 36, height: 36,
                }}
              >
                <GroupIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="New Chat">
              <IconButton
                onClick={() => { fetchContacts(); setShowContacts(true); }}
                sx={{
                  bgcolor: 'primary.main', color: '#fff',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: 36, height: 36,
                }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Tabs: Chats / Groups */}
        <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
          {(['chats', 'groups'] as const).map(tab => (
            <Box
              key={tab}
              onClick={() => setChatTab(tab)}
              sx={{
                flex: 1, textAlign: 'center', py: 1.2, cursor: 'pointer',
                fontWeight: chatTab === tab ? 700 : 500,
                fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5,
                color: chatTab === tab ? 'primary.main' : 'text.secondary',
                borderBottom: 2,
                borderColor: chatTab === tab ? 'primary.main' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {tab === 'chats' ? 'Chats' : `Groups${groups.length > 0 ? ` (${groups.length})` : ''}`}
            </Box>
          ))}
        </Box>

        {/* Search */}
        <Box sx={{ px: 2, py: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={chatTab === 'chats' ? 'Search conversations...' : 'Search groups...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
              sx: { borderRadius: 3, bgcolor: 'action.hover', '& fieldset': { border: 'none' } },
            }}
          />
        </Box>

        {/* Contact Picker */}
        {showContacts && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
            bgcolor: 'background.paper', zIndex: 10,
            display: 'flex', flexDirection: 'column',
          }}>
            <Box sx={{
              p: 2, display: 'flex', alignItems: 'center', gap: 1,
              borderBottom: 1, borderColor: 'divider',
            }}>
              <IconButton onClick={() => setShowContacts(false)} size="small"><ArrowBack /></IconButton>
              <Typography fontWeight={700} fontSize={18}>New Chat</Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {contactUsers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Typography>No contacts available</Typography>
                </Box>
              ) : (
                contactUsers.map(u => (
                  <Box
                    key={u._id}
                    onClick={() => selectContact(u)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      px: 2, py: 1.5, cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      borderBottom: 1, borderColor: 'divider',
                    }}
                  >
                    <Avatar
                      src={u.profilePicture ? getFileUrl(u.profilePicture) : undefined}
                      sx={{
                        width: 44, height: 44,
                        background: roleGradients[u.role] || roleGradients.driver,
                        fontWeight: 700, fontSize: 16,
                      }}
                    >
                      {getInitials(u.name || u.email || 'U')}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={600} fontSize={15}>{u.name || u.email}</Typography>
                      <Chip
                        label={u.role}
                        size="small"
                        sx={{
                          height: 20, fontSize: 11, fontWeight: 600,
                          textTransform: 'capitalize',
                          bgcolor: `${roleColors[u.role] || '#666'}20`,
                          color: roleColors[u.role] || '#666',
                        }}
                      />
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}

        {/* Conversations / Groups List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* ─── Groups Tab ─── */}
          {chatTab === 'groups' && (
            <>
              {groups.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, px: 3, color: 'text.secondary' }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: 3, mx: 'auto', mb: 2, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', fontSize: 28 }}>👥</Box>
                  <Typography fontWeight={600} fontSize={16} color="text.primary">No groups yet</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>Create a group to chat with multiple people</Typography>
                  <Button
                    variant="contained" size="small"
                    startIcon={<GroupIcon />}
                    onClick={() => { fetchContacts(); setShowCreateGroup(true); }}
                    sx={{ mt: 2, borderRadius: 3, textTransform: 'none' }}
                  >
                    Create Group
                  </Button>
                </Box>
              ) : (
                groups
                  .filter(g => !searchQuery.trim() || g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((group: any) => {
                    const isActive = (group.id || group._id) === selectedGroupId;
                    const hasUnread = (group.unreadCount || 0) > 0;
                    return (
                      <Box
                        key={group.id || group._id}
                        onClick={() => selectGroup(group)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          px: 2, py: 1.5, cursor: 'pointer',
                          bgcolor: isActive ? 'primary.main' : 'transparent',
                          color: isActive ? '#fff' : 'inherit',
                          '&:hover': { bgcolor: isActive ? 'primary.main' : 'action.hover' },
                          borderBottom: 1, borderColor: isActive ? 'transparent' : 'divider',
                        }}
                      >
                        <Avatar sx={{
                          width: 48, height: 48,
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          fontWeight: 700, fontSize: 18,
                        }}>
                          <GroupIcon />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography fontWeight={hasUnread ? 700 : 600} fontSize={14} noWrap>{group.name}</Typography>
                            <Typography variant="caption" sx={{ flexShrink: 0, ml: 1, color: isActive ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                              {group.lastMessage?.createdAt ? formatTime(group.lastMessage.createdAt) : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
                            <Typography variant="body2" noWrap sx={{
                              flex: 1, fontSize: 13,
                              color: isActive ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                            }}>
                              {group.memberDetails?.length || 0} members
                              {group.lastMessage ? ` · ${group.lastMessage.message?.slice(0, 30) || ''}` : ''}
                            </Typography>
                            {hasUnread && !isActive && (
                              <Box sx={{
                                minWidth: 20, height: 20, borderRadius: 10,
                                bgcolor: 'primary.main', color: '#fff',
                                display: 'grid', placeItems: 'center',
                                fontSize: 11, fontWeight: 700, px: 0.5, ml: 1,
                              }}>
                                {group.unreadCount}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
              )}
            </>
          )}

          {/* ─── Chats Tab ─── */}
          {chatTab === 'chats' && (loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={28} /></Box>
          ) : filteredConversations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 3, color: 'text.secondary' }}>
              <Box sx={{
                width: 64, height: 64, borderRadius: 3, mx: 'auto', mb: 2,
                bgcolor: 'action.hover', display: 'grid', placeItems: 'center',
                fontSize: 28,
              }}>💬</Box>
              <Typography fontWeight={600} fontSize={16} color="text.primary">No conversations</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Click the + button to start chatting
              </Typography>
            </Box>
          ) : (
            filteredConversations.map(conv => {
              const name = conv.otherUserName || 'User';
              const hasUnread = (conv.unreadCount || 0) > 0;
              const isActive = conv.otherUserId === selectedUserId;
              const lastMsg = conv.lastMessage;

              return (
                <Box
                  key={conv.otherUserId}
                  onClick={() => selectConversation(conv)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 2, py: 1.5, cursor: 'pointer',
                    bgcolor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? '#fff' : 'inherit',
                    '&:hover': { bgcolor: isActive ? 'primary.main' : 'action.hover' },
                    borderBottom: 1, borderColor: isActive ? 'transparent' : 'divider',
                    transition: 'background 0.15s',
                  }}
                >
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Box sx={{
                        width: 12, height: 12, borderRadius: '50%',
                        bgcolor: 'success.main', border: '2px solid',
                        borderColor: isActive ? 'primary.main' : 'background.paper',
                      }} />
                    }
                  >
                    <Avatar
                      src={conv.otherUserAvatar ? getFileUrl(conv.otherUserAvatar) : undefined}
                      sx={{
                        width: 48, height: 48,
                        background: roleGradients[conv.otherUserRole || 'driver'],
                        fontWeight: 700, fontSize: 17,
                      }}
                    >
                      {getInitials(name)}
                    </Avatar>
                  </Badge>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography
                        fontWeight={hasUnread ? 700 : 600}
                        fontSize={14}
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          flexShrink: 0, ml: 1,
                          color: isActive ? 'rgba(255,255,255,0.7)' : hasUnread ? 'primary.main' : 'text.secondary',
                          fontWeight: hasUnread ? 600 : 400,
                        }}
                      >
                        {lastMsg?.createdAt ? formatTime(lastMsg.createdAt) : ''}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                          color: isActive ? 'rgba(255,255,255,0.8)' : hasUnread ? 'text.primary' : 'text.secondary',
                          fontWeight: hasUnread ? 500 : 400,
                          fontSize: 13,
                        }}
                      >
                        {lastMsg?.fromUserId === user?.id && <span style={{ opacity: 0.7 }}>You: </span>}
                        {lastMsg?.messageType === 'image' ? '📷 Photo' :
                         lastMsg?.messageType === 'file' ? '📎 File' :
                         lastMsg?.message || 'Start chatting'}
                      </Typography>
                      {hasUnread && !isActive && (
                        <Box sx={{
                          minWidth: 20, height: 20, borderRadius: 10,
                          bgcolor: 'primary.main', color: '#fff',
                          display: 'grid', placeItems: 'center',
                          fontSize: 11, fontWeight: 700, px: 0.5, ml: 1,
                        }}>
                          {conv.unreadCount}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })
          ))}
        </Box>
      </Box>

      {/* ═══ Create Group Dialog ═══ */}
      <Dialog open={showCreateGroup} onClose={() => setShowCreateGroup(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Group Name" placeholder="e.g. Dispatch Team"
            value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth label="Description (optional)" placeholder="What's this group about?"
            value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography fontWeight={600} fontSize={14} sx={{ mb: 1 }}>
            Select Members ({selectedMembers.length} selected)
          </Typography>
          <Box sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
            {contactUsers.map(u => (
              <Box
                key={u._id}
                onClick={() => {
                  setSelectedMembers(prev =>
                    prev.includes(u._id)
                      ? prev.filter(id => id !== u._id)
                      : [...prev, u._id]
                  );
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
                  cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                  borderBottom: 1, borderColor: 'divider',
                  bgcolor: selectedMembers.includes(u._id) ? 'primary.50' : 'transparent',
                }}
              >
                <Checkbox checked={selectedMembers.includes(u._id)} size="small" />
                <Avatar
                  src={u.profilePicture ? getFileUrl(u.profilePicture) : undefined}
                  sx={{ width: 36, height: 36, background: roleGradients[u.role] || roleGradients.driver, fontSize: 14, fontWeight: 700 }}
                >
                  {getInitials(u.name || u.email || 'U')}
                </Avatar>
                <Box>
                  <Typography fontSize={14} fontWeight={600}>{u.name || u.email}</Typography>
                  <Chip label={u.role} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 600, textTransform: 'capitalize', bgcolor: `${roleColors[u.role] || '#666'}20`, color: roleColors[u.role] || '#666' }} />
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowCreateGroup(false)} color="inherit">Cancel</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!newGroupName.trim() || selectedMembers.length === 0 || creatingGroup}
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
          >
            {creatingGroup ? <CircularProgress size={20} /> : 'Create Group'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ RIGHT PANEL - Chat ═══ */}
      {(selectedUserId || selectedGroupId) ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
          {/* Chat Header */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 2,
            px: 3, py: 1.5,
            bgcolor: 'background.paper',
            borderBottom: 1, borderColor: 'divider',
          }}>
            {selectedGroupId ? (
              <>
                <Avatar sx={{ width: 42, height: 42, background: 'linear-gradient(135deg, #667eea, #764ba2)', fontWeight: 700 }}>
                  <GroupIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} fontSize={16}>{selectedGroupName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {groups.find(g => (g.id || g._id) === selectedGroupId)?.memberDetails?.map((m: any) => m.name).join(', ') || 'Group chat'}
                  </Typography>
                </Box>
                {groups.find(g => (g.id || g._id) === selectedGroupId)?.createdBy === user?.id && (
                  <Tooltip title="Delete Group">
                    <IconButton
                      onClick={async () => {
                        if (!window.confirm('Delete this group and all its messages? This cannot be undone.')) return;
                        try {
                          await messageApi.deleteGroup(selectedGroupId);
                          setSelectedGroupId(undefined);
                          setMessages([]);
                          fetchGroups();
                        } catch { alert('Failed to delete group'); }
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <Close />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            ) : (
              <>
                <Avatar
                  src={selectedUserAvatar ? getFileUrl(selectedUserAvatar) : undefined}
                  sx={{
                    width: 42, height: 42,
                    background: roleGradients[selectedUserRole || 'driver'],
                    fontWeight: 700,
                  }}
                >
                  {getInitials(selectedUserName)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} fontSize={16}>{selectedUserName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {typingUser ? (
                      <span style={{ color: '#007aff', fontStyle: 'italic' }}>typing...</span>
                    ) : (
                      <>
                        <Chip
                          label={selectedUserRole || 'user'}
                          size="small"
                          sx={{
                            height: 18, fontSize: 10, fontWeight: 700,
                            textTransform: 'capitalize',
                            bgcolor: `${roleColors[selectedUserRole] || '#666'}20`,
                            color: roleColors[selectedUserRole] || '#666',
                          }}
                        />
                        {pusherConnected && (
                          <span style={{ marginLeft: 8, color: '#34c759' }}>● online</span>
                        )}
                      </>
                    )}
                  </Typography>
                </Box>
              </>
            )}
          </Box>

          {/* Messages */}
          <Box sx={{
            flex: 1, overflow: 'auto', px: 3, py: 2,
            display: 'flex', flexDirection: 'column', gap: 0.5,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.02'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2l3 3-3 3z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}>
            {msgLoading && messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={24} /></Box>
            ) : messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <Typography fontSize={36} sx={{ mb: 1, opacity: 0.4 }}>💬</Typography>
                <Typography fontWeight={600}>Start a conversation</Typography>
                <Typography variant="body2">Send a message to {selectedUserName}</Typography>
              </Box>
            ) : (
              messages.map((msg, idx) => {
                const isOwn = msg.fromUserId === user?.id;
                const showDate = idx === 0 || new Date(messages[idx].createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();
                const hasImage = msg.attachments?.some(a => a.type?.startsWith('image/'));
                const hasFile = msg.attachments?.some(a => !a.type?.startsWith('image/'));
                const isLastOwn = isOwn && (idx === messages.length - 1 || messages[idx + 1]?.fromUserId !== user?.id);
                const showSender = selectedGroupId && !isOwn && (idx === 0 || messages[idx - 1].fromUserId !== msg.fromUserId);
                const senderName = selectedGroupId
                  ? groups.find(g => (g.id || g._id) === selectedGroupId)?.memberDetails?.find((m: any) => m.id === msg.fromUserId)?.name || 'Unknown'
                  : '';

                return (
                  <Box key={msg.id || idx}>
                    {showDate && (
                      <Box sx={{ textAlign: 'center', my: 1.5 }}>
                        <Chip
                          label={formatDateSep(msg.createdAt)}
                          size="small"
                          sx={{ fontSize: 11, fontWeight: 600, bgcolor: 'action.hover' }}
                        />
                      </Box>
                    )}

                    {/* Sender name for group messages */}
                    {showSender && (
                      <Typography fontSize={11} fontWeight={600} sx={{ ml: 1.5, mt: 1, color: roleColors[groups.find(g => (g.id || g._id) === selectedGroupId)?.memberDetails?.find((m: any) => m.id === msg.fromUserId)?.role || 'driver'] || 'text.secondary' }}>
                        {senderName}
                      </Typography>
                    )}

                    <Box sx={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      mb: 0.25,
                    }}>
                      <Box sx={{
                        maxWidth: '65%',
                        minWidth: hasImage ? 240 : 100,
                        p: hasImage ? 0.5 : '10px 14px',
                        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        bgcolor: isOwn ? 'primary.main' : 'background.paper',
                        color: isOwn ? '#fff' : 'text.primary',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}>
                        {/* Image */}
                        {hasImage && msg.attachments?.filter(a => a.type?.startsWith('image/')).map((att, i) => (
                          <Box
                            key={i}
                            onClick={() => setImageViewer(getFileUrl(att.url))}
                            sx={{
                              borderRadius: 2.5, overflow: 'hidden', cursor: 'pointer',
                              mb: msg.message && msg.message !== '📷 Photo' ? 1 : 0,
                              '&:hover': { opacity: 0.95 },
                            }}
                          >
                            <img
                              src={getFileUrl(att.url)} alt={att.name}
                              style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }}
                              loading="lazy"
                            />
                          </Box>
                        ))}

                        {/* File */}
                        {hasFile && msg.attachments?.filter(a => !a.type?.startsWith('image/')).map((att, i) => (
                          <Box
                            key={i}
                            component="a"
                            href={getFileUrl(att.url)}
                            target="_blank"
                            rel="noopener"
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.5,
                              p: hasImage ? '8px 8px 4px' : '4px 0',
                              textDecoration: 'none', color: 'inherit',
                            }}
                          >
                            <Box sx={{
                              width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                              bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'action.hover',
                              display: 'grid', placeItems: 'center',
                            }}>
                              <InsertDriveFile sx={{ fontSize: 20 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography fontSize={13} fontWeight={600} noWrap>{att.name}</Typography>
                              <Typography fontSize={11} sx={{ opacity: 0.7 }}>{formatFileSize(att.size)}</Typography>
                            </Box>
                            <Download sx={{ fontSize: 18, opacity: 0.6 }} />
                          </Box>
                        ))}

                        {/* Text */}
                        {msg.message && msg.message !== '📷 Photo' && (
                          <Typography
                            fontSize={14}
                            lineHeight={1.5}
                            sx={{
                              wordBreak: 'break-word',
                              p: hasImage ? '4px 8px 0' : 0,
                            }}
                          >
                            {msg.message}
                          </Typography>
                        )}

                        {/* Time + read */}
                        <Box sx={{
                          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                          gap: 0.5, mt: 0.5,
                          px: hasImage ? 1 : 0, pb: hasImage ? 0.5 : 0,
                        }}>
                          <Typography fontSize={10} sx={{ opacity: 0.6 }}>
                            {formatChatTime(msg.createdAt)}
                          </Typography>
                          {isOwn && (
                            <span style={{ fontSize: 12 }}>
                              {msg.read || (readReceipt && isLastOwn) ? (
                                <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                                  <path d="M1 5l3 3L10 2" stroke={isOwn ? '#7dd3fc' : '#34c759'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M5 5l3 3L14 2" stroke={isOwn ? '#7dd3fc' : '#34c759'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                  <path d="M1 5l3 3L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                                </svg>
                              )}
                            </span>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}

            {/* Typing indicator */}
            {typingUser && (
              <Box sx={{ display: 'flex' }}>
                <Box sx={{
                  px: 2, py: 1.5, borderRadius: '16px 16px 16px 4px',
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  display: 'flex', gap: 0.5,
                }}>
                  {[0, 1, 2].map(i => (
                    <Box
                      key={i}
                      sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: 'text.disabled',
                        animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                        '@keyframes dotBounce': {
                          '0%, 80%, 100%': { transform: 'scale(0)' },
                          '40%': { transform: 'scale(1)' },
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Attachment Preview */}
          {attachmentFile && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 3, py: 1, bgcolor: 'background.paper',
              borderTop: 1, borderColor: 'divider',
            }}>
              {attachmentPreview ? (
                <Box sx={{ width: 48, height: 48, borderRadius: 2, overflow: 'hidden' }}>
                  <img src={attachmentPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ) : (
                <Box sx={{
                  width: 48, height: 48, borderRadius: 2, bgcolor: 'action.hover',
                  display: 'grid', placeItems: 'center',
                }}>
                  <InsertDriveFile />
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontSize={13} fontWeight={600} noWrap>{attachmentFile.name}</Typography>
                <Typography fontSize={11} color="text.secondary">{formatFileSize(attachmentFile.size)}</Typography>
              </Box>
              <IconButton onClick={clearAttachment} size="small"><Close fontSize="small" /></IconButton>
            </Box>
          )}

          {/* Input Area */}
          <Box sx={{
            display: 'flex', alignItems: 'flex-end', gap: 1,
            px: 2, py: 1.5,
            bgcolor: 'background.paper',
            borderTop: 1, borderColor: 'divider',
          }}>
            <Tooltip title="Attach file">
              <IconButton onClick={() => fileInputRef.current?.click()} sx={{ color: 'text.secondary' }}>
                <AttachFile />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send image">
              <IconButton
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    const f = e.target?.files?.[0];
                    if (f) {
                      setAttachmentFile(f);
                      if (f.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = () => setAttachmentPreview(reader.result as string);
                        reader.readAsDataURL(f);
                      }
                    }
                  };
                  input.click();
                }}
                sx={{ color: 'text.secondary' }}
              >
                <ImageIcon />
              </IconButton>
            </Tooltip>

            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => { setMessageText(e.target.value); handleTyping(); }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              InputProps={{
                sx: { borderRadius: 6, bgcolor: 'action.hover', '& fieldset': { border: 'none' } },
              }}
            />

            <IconButton
              onClick={handleSend}
              disabled={sending || (!messageText.trim() && !attachmentFile)}
              sx={{
                bgcolor: (messageText.trim() || attachmentFile) ? 'primary.main' : 'transparent',
                color: (messageText.trim() || attachmentFile) ? '#fff' : 'text.disabled',
                '&:hover': { bgcolor: (messageText.trim() || attachmentFile) ? 'primary.dark' : 'transparent' },
                transition: 'all 0.2s',
                width: 40, height: 40,
              }}
            >
              {sending ? <CircularProgress size={20} color="inherit" /> : <Send />}
            </IconButton>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Box>
        </Box>
      ) : (
        /* No chat selected */
        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 2, color: 'text.secondary',
        }}>
          <Box sx={{
            width: 100, height: 100, borderRadius: 4,
            bgcolor: 'action.hover', display: 'grid', placeItems: 'center',
            fontSize: 44,
          }}>💬</Box>
          <Typography fontWeight={700} fontSize={20} color="text.primary">Your Messages</Typography>
          <Typography variant="body2" sx={{ maxWidth: 300, textAlign: 'center' }}>
            Select a conversation or start a new one to chat with your drivers and team members
          </Typography>
          <Box
            component="button"
            onClick={() => { fetchContacts(); setShowContacts(true); }}
            sx={{
              mt: 1, px: 3, py: 1.2, borderRadius: 3, border: 'none',
              bgcolor: 'primary.main', color: '#fff', fontWeight: 600,
              fontSize: 14, cursor: 'pointer',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            Start a New Chat
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function MessagesPage() {
  return (
    <>
      <MessagesPageContent />
    </>
  );
}
