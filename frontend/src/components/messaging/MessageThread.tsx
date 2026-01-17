import React, { useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import type { Message } from '@/types/message.types';
import { format } from 'date-fns';
import { useAuth } from '@hooks/useAuth';

interface MessageThreadProps {
  messages: Message[];
  loading?: boolean;
  otherUserName?: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  loading = false,
  otherUserName,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Loading messages...
        </Typography>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          No messages yet. Start the conversation!
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        p: { xs: 1, sm: 2 },
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={2}>
        {messages.map((message) => {
          const isOwn = message.fromUserId === user?.id;
          const isEmergency = message.messageType === 'emergency';

          return (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 1,
              }}
            >
              {!isOwn && (
                <Avatar
                  sx={{
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 },
                    bgcolor: 'primary.main',
                  }}
                >
                  <AccountCircle />
                </Avatar>
              )}
              <Box
                sx={{
                  maxWidth: { xs: '75%', sm: '60%' },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    bgcolor: isEmergency
                      ? 'error.light'
                      : isOwn
                      ? 'primary.main'
                      : 'background.paper',
                    color: isEmergency
                      ? 'error.contrastText'
                      : isOwn
                      ? 'primary.contrastText'
                      : 'text.primary',
                    borderRadius: 2,
                    borderTopRightRadius: isOwn ? 0 : 2,
                    borderTopLeftRadius: !isOwn ? 0 : 2,
                  }}
                >
                  {isEmergency && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 700,
                        mb: 0.5,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      }}
                    >
                      🚨 EMERGENCY
                    </Typography>
                  )}
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.message}
                  </Typography>
                  {message.attachments && message.attachments.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {message.attachments.map((att, idx) => (
                        <Typography
                          key={idx}
                          variant="caption"
                          sx={{ display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        >
                          📎 {att.name}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Paper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    px: 1,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  }}
                >
                  {format(new Date(message.createdAt), isMobile ? 'HH:mm' : 'MMM dd, HH:mm')}
                </Typography>
              </Box>
              {isOwn && (
                <Avatar
                  sx={{
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 },
                    bgcolor: 'success.main',
                  }}
                >
                  <AccountCircle />
                </Avatar>
              )}
            </Box>
          );
        })}
      </Stack>
      <div ref={messagesEndRef} />
    </Box>
  );
};
