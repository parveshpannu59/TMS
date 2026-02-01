import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Chip,
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
import assignmentApi from '@api/assignment.api';
import { loadApi } from '@api/all.api';
import { Notification, NotificationType } from '@/types/notification.types';
import { AcceptRejectAssignmentDialog } from '@/components/driver/AcceptRejectAssignmentDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { Load } from '@/types/all.types';

export const NotificationMenu: React.FC = () => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Assignment dialog state
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);

  // Fetch notifications - single in-flight guard prevents duplicate concurrent calls
  const fetchNotifications = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
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
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    fetchNotifications();
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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    try {
      await notificationApi.markAsRead(notification._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }

    // Handle load assignment notifications
    if (notification.type === NotificationType.LOAD) {
      try {
        let load: Load | undefined;
        
        // Try to get load by ID first (new notifications)
        if (notification.metadata?.loadId) {
          try {
            load = await loadApi.getLoadById(notification.metadata.loadId);
          } catch (err: any) {
            // If not found by ID, try loadNumber fallback if available
            if (err.statusCode === 404 || err.response?.status === 404) {
              // Fall through to loadNumber search
              load = undefined;
            } else {
              throw err;
            }
          }
        }
        
        // Fallback: search by loadNumber if ID fetch failed or not available
        if (!load && notification.metadata?.loadNumber) {
          // Try driver-specific endpoint first, fallback to all loads
          let allLoads: Load[] = [];
          try {
            allLoads = await loadApi.getMyAssignedLoads();
          } catch (err) {
            // If driver endpoint fails, try general endpoint
            try {
              allLoads = await loadApi.getAllLoads({ limit: 1000 });
            } catch (err2) {
              setError('Unable to fetch loads. Please try again later.');
              return;
            }
          }
          
          const searchNumber = notification.metadata.loadNumber;
          
          // Try multiple search patterns
          const foundLoad = allLoads.find((l: Load) => {
            // Exact match
            if (l.loadNumber === searchNumber) return true;
            // Without # prefix
            if (l.loadNumber === searchNumber.replace('#', '')) return true;
            // With # prefix
            if (l.loadNumber === `#${searchNumber}`) return true;
            // Case insensitive
            if (l.loadNumber.toLowerCase() === searchNumber.toLowerCase()) return true;
            return false;
          });
          
          if (!foundLoad) {
            console.error('Load not found. Searched for:', searchNumber, 'in', allLoads.length, 'loads');
            setError(`Load ${searchNumber} is no longer available. It may have been completed or cancelled.`);
            return;
          }
          load = foundLoad;
        }
        
        // If still no load found, show error
        if (!load) {
          setError('This load assignment has expired or been deleted.');
          return;
        }
        
        // Only open dialog for drivers with pending assignments
        if (user?.role === 'driver' && notification.metadata?.assignmentId) {
          setSelectedLoad(load);
          setSelectedAssignmentId(notification.metadata?.assignmentId || null);
          setAssignmentDialogOpen(true);
          handleClose(); // Close notification menu
        } else {
          // For owners/dispatchers, just mark as read - assignment already handled by driver
          handleClose();
        }
      } catch (err: any) {
        console.error('Failed to fetch load details:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load assignment details');
      }
    }
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

  const handleAcceptAssignment = async (assignmentId: string) => {
    await assignmentApi.acceptAssignment(assignmentId);
    // Refresh notifications
    await fetchNotifications();
  };

  const handleRejectAssignment = async (assignmentId: string, reason: string) => {
    await assignmentApi.rejectAssignment(assignmentId, reason);
    // Refresh notifications
    await fetchNotifications();
  };

  const getStatusColor = (metadata: any): { color: any; label: string } => {
    const status = metadata?.status;
    if (status === 'unassigned') {
      return { color: 'warning', label: 'UNASSIGNED' };
    }
    if (status === 'accepted') {
      return { color: 'success', label: 'ACCEPTED' };
    }
    if (status === 'rejected') {
      return { color: 'error', label: 'REJECTED' };
    }
    // Pending or new assignments
    return { color: 'info', label: 'PENDING' };
  };

  const renderNotificationRow = (notification: Notification) => {
    const statusInfo = getStatusColor(notification.metadata);
    return (
      <MenuItem
        key={notification._id}
        onClick={() => handleNotificationClick(notification)}
        sx={{
          py: 1.5,
          px: 2,
          bgcolor: notification.read ? 'transparent' : 'action.hover',
          '&:hover': {
            bgcolor: notification.read ? 'action.hover' : 'action.selected',
          },
          borderLeft: notification.read ? 'none' : '3px solid',
          borderColor: 'primary.main',
          cursor: 'pointer',
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'background.paper' }}>
            {getNotificationIcon(notification.type)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                {notification.title}
              </Typography>
              <Chip
                label={statusInfo.label}
                size="small"
                color={statusInfo.color}
                variant="outlined"
              />
            </Box>
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
    );
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
            {notifications.map((notification) => renderNotificationRow(notification))}
          </Box>
        )}

        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button fullWidth size="small" onClick={handleClose}>
            View All Notifications
          </Button>
        </Box>
      </Menu>

      {/* Assignment Accept/Reject Dialog */}
      <AcceptRejectAssignmentDialog
        open={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false);
          setSelectedLoad(null);
          setSelectedAssignmentId(null);
        }}
        load={selectedLoad}
        assignmentId={selectedAssignmentId}
        onAccept={handleAcceptAssignment}
        onReject={handleRejectAssignment}
      />
    </>
  );
};
