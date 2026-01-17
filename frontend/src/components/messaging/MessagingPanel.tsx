import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Paper,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
  Fab,
  Badge,
} from '@mui/material';
import { Close, Menu as MenuIcon, Message as MessageIcon } from '@mui/icons-material';
import { MessageList } from './MessageList';
import { MessageThread } from './MessageThread';
import { MessageComposer } from './MessageComposer';
import { messageApi } from '@/api/message.api';
import type { Conversation, Message } from '@/types/message.types';
import { useAuth } from '@hooks/useAuth';

interface MessagingPanelProps {
  open: boolean;
  onClose: () => void;
  loadId?: string;
  defaultUserId?: string;
  allowEmergency?: boolean;
}

export const MessagingPanel: React.FC<MessagingPanelProps> = ({
  open,
  onClose,
  loadId,
  defaultUserId,
  allowEmergency = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(defaultUserId);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageApi.getConversations();
      setConversations(data);
      
      // Calculate total unread
      const total = data.reduce((sum, conv) => sum + conv.unreadCount, 0);
      setUnreadCount(total);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    }
  }, []);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (userId: string, loadId?: string) => {
    try {
      setLoading(true);
      const data = await messageApi.getConversation(userId, loadId);
      setMessages(data);
      
      // Mark as read
      await messageApi.markAsRead(userId);
      fetchConversations(); // Refresh unread count
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [fetchConversations]);

  // Send message
  const handleSendMessage = useCallback(async (
    messageText: string,
    type: 'text' | 'emergency' = 'text',
    attachments?: File[]
  ) => {
    if (!selectedUserId || !messageText.trim()) return;

    try {
      setSending(true);
      setError(null);
      
      // TODO: Handle file uploads if needed
      await messageApi.sendMessage({
        toUserId: selectedUserId,
        loadId,
        message: messageText,
        messageType: type,
      });
      
      // Refresh messages
      await fetchMessages(selectedUserId, loadId);
      fetchConversations(); // Refresh unread count
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [selectedUserId, loadId, fetchMessages, fetchConversations]);

  // Select conversation
  const handleSelectConversation = useCallback((userId: string, loadId?: string) => {
    setSelectedUserId(userId);
    fetchMessages(userId, loadId);
  }, [fetchMessages]);

  // Initial load
  useEffect(() => {
    if (open) {
      fetchConversations();
      if (defaultUserId) {
        handleSelectConversation(defaultUserId, loadId);
      }
    }
  }, [open, defaultUserId, loadId, fetchConversations, handleSelectConversation]);

  // Auto-refresh conversations every 30 seconds
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedUserId) {
        fetchMessages(selectedUserId, loadId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [open, selectedUserId, loadId, fetchConversations, fetchMessages]);

  const drawerWidth = isMobile ? '100%' : 400;
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: '56px', sm: '64px' } }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Messages
          </Typography>
          {!isMobile && (
            <IconButton edge="end" color="inherit" onClick={onClose}>
              <Close />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {isMobile && !selectedUserId ? (
          <Box sx={{ width: '100%', overflow: 'auto' }}>
            <MessageList
              conversations={conversations}
              selectedUserId={selectedUserId}
              onSelectConversation={handleSelectConversation}
              loading={loading}
            />
          </Box>
        ) : (
          <>
            {!isMobile && (
              <Box sx={{ width: drawerWidth, borderRight: `1px solid ${theme.palette.divider}`, overflow: 'auto' }}>
                <MessageList
                  conversations={conversations}
                  selectedUserId={selectedUserId}
                  onSelectConversation={handleSelectConversation}
                  loading={loading}
                />
              </Box>
            )}
            {selectedUserId && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {isMobile && (
                  <Toolbar sx={{ minHeight: '56px !important', borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <IconButton onClick={() => setSelectedUserId(undefined)}>
                      <Close />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
                      Conversation
                    </Typography>
                  </Toolbar>
                )}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <MessageThread
                    messages={messages}
                    loading={loading}
                    otherUserName={selectedUserId}
                  />
                </Box>
                <MessageComposer
                  onSendMessage={handleSendMessage}
                  disabled={sending}
                  allowEmergency={allowEmergency}
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={onClose}
          PaperProps={{
            sx: {
              height: '100%',
              maxHeight: '100%',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          anchor="right"
          open={open}
          onClose={onClose}
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: '800px',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

// Floating action button for mobile
interface MessageFABProps {
  onClick: () => void;
  unreadCount?: number;
}

export const MessageFAB: React.FC<MessageFABProps> = ({ onClick, unreadCount = 0 }) => {
  const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));

  if (!isMobile) return null;

  return (
    <Fab
      color="primary"
      aria-label="messages"
      onClick={onClick}
      sx={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 1000,
      }}
    >
      <Badge badgeContent={unreadCount} color="error">
        <MessageIcon />
      </Badge>
    </Fab>
  );
};
