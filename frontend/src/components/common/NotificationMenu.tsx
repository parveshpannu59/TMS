import React, { useState, useEffect, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Avatar,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Warning,
  Info,
  Assignment,
  LocalShipping,
  MarkEmailRead,
  Error as ErrorIcon,
  DirectionsCar,
  Inventory,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { notificationApi } from '@api/notification.api';
import { Notification, NotificationType } from '@/types/notification.types';

export const NotificationMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [notificationData, count] = await Promise.all([
        notificationApi.getNotifications({ page: 1, limit: 20 }),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(notificationData.data);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when menu opens
  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications(); // Refresh when opening
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case NotificationType.WARNING:
        return <Warning sx={{ color: 'warning.main' }} />;
      case NotificationType.INFO:
        return <Info sx={{ color: 'info.main' }} />;
      case NotificationType.ERROR:
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case NotificationType.LOAD:
        return <Assignment sx={{ color: 'primary.main' }} />;
      case NotificationType.DRIVER:
        return <LocalShipping sx={{ color: 'secondary.main' }} />;
      case NotificationType.TRUCK:
        return <DirectionsCar sx={{ color: 'primary.main' }} />;
      case NotificationType.TRAILER:
        return <Inventory sx={{ color: 'secondary.main' }} />;
      default:
        return <NotificationsIcon />;
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        sx={{
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 360,
            maxWidth: 400,
            maxHeight: 500,
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<MarkEmailRead />}
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={40} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <MenuItem
                key={notification._id}
                onClick={() => handleMarkAsRead(notification._id)}
                sx={{
                  py: 1.5,
                  px: 2,
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: notification.read ? 'action.hover' : 'action.selected',
                  },
                  borderLeft: notification.read ? 'none' : '3px solid',
                  borderColor: 'primary.main',
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'background.paper' }}>
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                      </Typography>
                    </>
                  }
                />
              </MenuItem>
            ))}
          </Box>
        )}

        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button fullWidth size="small" onClick={handleClose}>
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
};
