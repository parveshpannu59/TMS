import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Badge,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { AccountCircle, Circle } from '@mui/icons-material';
import type { Conversation } from '@/types/message.types';
import { formatDistanceToNow } from 'date-fns';

interface MessageListProps {
  conversations: Conversation[];
  selectedUserId?: string;
  onSelectConversation: (userId: string, loadId?: string) => void;
  loading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  conversations,
  selectedUserId,
  onSelectConversation,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Loading conversations...
        </Typography>
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No conversations yet
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
      {conversations.map((conv) => {
        const isSelected = conv.otherUserId === selectedUserId;
        const lastMessage = conv.lastMessage;
        const timeAgo = formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true });

        return (
          <ListItem
            key={`${conv.otherUserId}-${conv.loadId || 'default'}`}
            disablePadding
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: isSelected ? 'action.selected' : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemButton
              onClick={() => onSelectConversation(conv.otherUserId, conv.loadId)}
              sx={{
                py: { xs: 1.5, sm: 2 },
                px: { xs: 1, sm: 2 },
              }}
            >
              <ListItemAvatar>
                <Badge
                  badgeContent={conv.unreadCount > 0 ? conv.unreadCount : undefined}
                  color="error"
                  invisible={conv.unreadCount === 0}
                >
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <AccountCircle />
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      variant="body1"
                      fontWeight={conv.unreadCount > 0 ? 600 : 400}
                      sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: { xs: '150px', sm: '200px' },
                      }}
                    >
                      User {conv.otherUserId.slice(0, 8)}
                    </Typography>
                    {conv.unreadCount > 0 && (
                      <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: { xs: '200px', sm: '300px' },
                        fontWeight: conv.unreadCount > 0 ? 500 : 400,
                      }}
                    >
                      {lastMessage.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      {timeAgo}
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};
