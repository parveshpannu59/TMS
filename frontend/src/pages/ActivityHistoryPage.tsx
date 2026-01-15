import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  Typography,
  Avatar,
  Chip,
  TextField,
  MenuItem,
  InputAdornment,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  History,
  Search,
  Add,
  Edit,
  Delete,
  Assignment,
  LocalShipping,
  Person,
  CheckCircle,
  Cancel,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { format } from 'date-fns';
import { activityLogApi } from '@api/activityLog.api';
import { ActivityLog, ActivityAction, ActivityEntity } from '@/types/activityLog.types';

const ActivityHistoryPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch activity logs
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activityLogApi.getActivityLogs({
        page,
        limit: 50,
        entity: filterEntity !== 'all' ? filterEntity as ActivityEntity : undefined,
        action: filterAction !== 'all' ? filterAction as ActivityAction : undefined,
        search: searchTerm || undefined,
      });
      setActivities(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch activity logs:', err);
      setError(err.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [page, filterEntity, filterAction, searchTerm]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchActivities();
      } else {
        setPage(1); // Reset to page 1 when searching
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getActionIcon = (action: ActivityAction) => {
    switch (action) {
      case ActivityAction.CREATE:
        return <Add />;
      case ActivityAction.UPDATE:
        return <Edit />;
      case ActivityAction.DELETE:
        return <Delete />;
      case ActivityAction.ASSIGN:
        return <Assignment />;
      case ActivityAction.COMPLETE:
        return <CheckCircle />;
      case ActivityAction.CANCEL:
        return <Cancel />;
      case ActivityAction.START:
        return <PlayArrow />;
      case ActivityAction.PAUSE:
        return <Pause />;
      default:
        return <History />;
    }
  };

  const getActionColor = (action: ActivityAction): any => {
    switch (action) {
      case ActivityAction.CREATE:
        return 'success';
      case ActivityAction.UPDATE:
        return 'info';
      case ActivityAction.DELETE:
        return 'error';
      case ActivityAction.ASSIGN:
        return 'primary';
      case ActivityAction.COMPLETE:
        return 'success';
      case ActivityAction.CANCEL:
        return 'error';
      case ActivityAction.START:
        return 'success';
      case ActivityAction.PAUSE:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getEntityIcon = (entity: ActivityEntity) => {
    switch (entity) {
      case ActivityEntity.LOAD:
        return <Assignment />;
      case ActivityEntity.DRIVER:
        return <Person />;
      case ActivityEntity.TRUCK:
      case ActivityEntity.TRAILER:
        return <LocalShipping />;
      case ActivityEntity.USER:
        return <Person />;
      default:
        return <History />;
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <History sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Activity History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track all changes and actions in your TMS
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 250 }}
              size="small"
            />
            
            <TextField
              select
              label="Entity"
              value={filterEntity}
              onChange={(e) => {
                setFilterEntity(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="all">All Entities</MenuItem>
              <MenuItem value="load">Loads</MenuItem>
              <MenuItem value="driver">Drivers</MenuItem>
              <MenuItem value="truck">Trucks</MenuItem>
              <MenuItem value="trailer">Trailers</MenuItem>
              <MenuItem value="user">Users</MenuItem>
              <MenuItem value="company">Company</MenuItem>
            </TextField>
            
            <TextField
              select
              label="Action"
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value="create">Create</MenuItem>
              <MenuItem value="update">Update</MenuItem>
              <MenuItem value="delete">Delete</MenuItem>
              <MenuItem value="assign">Assign</MenuItem>
              <MenuItem value="complete">Complete</MenuItem>
              <MenuItem value="cancel">Cancel</MenuItem>
              <MenuItem value="start">Start</MenuItem>
              <MenuItem value="pause">Pause</MenuItem>
            </TextField>
          </Box>
        </Card>

        <Card sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : activities.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
              }}
            >
              <History sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No activities found
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Try adjusting your filters or search term
              </Typography>
            </Box>
          ) : (
            <Timeline position="alternate">
              {activities.map((activity, index) => (
                <TimelineItem key={activity._id}>
                  <TimelineOppositeContent sx={{ py: 2, px: 2 }} color="text.secondary">
                    <Typography variant="body2">
                      {format(new Date(activity.createdAt), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption">
                      {format(new Date(activity.createdAt), 'HH:mm:ss')}
                    </Typography>
                  </TimelineOppositeContent>

                  <TimelineSeparator>
                    <TimelineDot color={getActionColor(activity.action)}>
                      {getActionIcon(activity.action)}
                    </TimelineDot>
                    {index < activities.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>

                  <TimelineContent sx={{ py: 2, px: 2 }}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {activity.userName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{activity.userName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.userRole}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography variant="body1" fontWeight={600} gutterBottom>
                        {activity.description}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip
                          icon={getEntityIcon(activity.entity)}
                          label={activity.entityName}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={activity.action.toUpperCase()}
                          size="small"
                          color={getActionColor(activity.action)}
                        />
                      </Box>

                      {activity.changes && activity.changes.length > 0 && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                            Changes:
                          </Typography>
                          {activity.changes.map((change, idx) => (
                            <Typography key={idx} variant="caption" display="block">
                              <strong>{change.field}:</strong> {String(change.oldValue)} → {String(change.newValue)}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </Card>
      </Box>
    </DashboardLayout>
  );
};

export default ActivityHistoryPage;
