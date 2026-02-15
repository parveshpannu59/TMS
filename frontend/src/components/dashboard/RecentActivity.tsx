import { memo, useState, useCallback, useRef } from 'react';
import { Box, Typography, alpha, useTheme, Button, CircularProgress, Collapse } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Activity } from '../../types/dashboard.types';
import { activityLogApi } from '../../api/activityLog.api';
import { formatDistanceToNow } from 'date-fns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import HistoryIcon from '@mui/icons-material/History';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface RecentActivityProps {
  activities: Activity[];
}

const INITIAL_COUNT = 3;
const LOAD_MORE_SIZE = 5;

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'success':
      return { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: '#22c55e' };
    case 'info':
      return { icon: <LocalShippingIcon sx={{ fontSize: 16 }} />, color: '#3b82f6' };
    case 'warning':
      return { icon: <WarningIcon sx={{ fontSize: 16 }} />, color: '#f59e0b' };
    case 'error':
      return { icon: <AssignmentIcon sx={{ fontSize: 16 }} />, color: '#ef4444' };
    default:
      return { icon: <AssignmentIcon sx={{ fontSize: 16 }} />, color: '#94a3b8' };
  }
};

// Map activity log API data to the Activity type used by the component
function mapLogToActivity(log: any): Activity {
  let type: Activity['type'] = 'info';
  const action = (log.action || '').toLowerCase();
  if (action.includes('create') || action.includes('complete') || action.includes('deliver') || action.includes('approve')) type = 'success';
  else if (action.includes('delete') || action.includes('cancel') || action.includes('emergency')) type = 'error';
  else if (action.includes('update') || action.includes('assign') || action.includes('transit')) type = 'info';
  else if (action.includes('alert') || action.includes('warn')) type = 'warning';

  return {
    id: log._id || log.id || String(Math.random()),
    type,
    message: log.description || `${log.action} ${log.entityName || log.entity || ''}`.trim(),
    timestamp: log.createdAt || new Date().toISOString(),
  };
}

const ActivityItem = memo(({ activity, idx, theme }: { activity: Activity; idx: number; theme: any }) => {
  const config = getActivityIcon(activity.type);
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        py: 1.2,
        position: 'relative',
        transition: 'all 0.2s',
        '&:hover': {
          '& .activity-dot': {
            transform: 'scale(1.2)',
          },
        },
      }}
    >
      {/* Timeline dot */}
      <Box
        className="activity-dot"
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          bgcolor: alpha(config.color, 0.12),
          color: config.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          transition: 'transform 0.2s',
          border: `2px solid ${theme.palette.background.paper}`,
        }}
      >
        {config.icon}
      </Box>

      {/* Content */}
      <Box flex={1} minWidth={0}>
        <Typography
          variant="body2"
          fontWeight={idx === 0 ? 600 : 500}
          sx={{
            fontSize: '0.82rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activity.message}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
        </Typography>
      </Box>
    </Box>
  );
});
ActivityItem.displayName = 'ActivityItem';

export const RecentActivity = memo(({ activities }: RecentActivityProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // Show first INITIAL_COUNT from the dashboard-provided activities
  const [expanded, setExpanded] = useState(false);

  // Lazy-loaded extra activities (beyond what the dashboard provided)
  const [extraActivities, setExtraActivities] = useState<Activity[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreFromApi, setHasMoreFromApi] = useState(true);
  const apiPageRef = useRef(1);

  const hasMoreInProps = activities.length > INITIAL_COUNT;
  const visibleActivities = activities.slice(0, INITIAL_COUNT);
  const hiddenActivities = activities.slice(INITIAL_COUNT);

  // All activities to show (dashboard-provided + lazy-loaded from API)
  const allActivities = [...activities, ...extraActivities];
  const totalShown = expanded ? allActivities.length : INITIAL_COUNT;

  const loadMoreFromApi = useCallback(async () => {
    if (loadingMore || !hasMoreFromApi) return;
    setLoadingMore(true);
    try {
      const nextPage = apiPageRef.current + 1;
      apiPageRef.current = nextPage;
      // Skip the items we already have from the dashboard (typically 10)
      // Use the activity-logs API for additional items
      const resp = await activityLogApi.getActivityLogs({
        page: nextPage,
        limit: LOAD_MORE_SIZE,
      });
      const mapped = (resp.data || []).map(mapLogToActivity);
      // Filter out duplicates that might already be in the dashboard data
      const existingIds = new Set(allActivities.map(a => a.id));
      const newItems = mapped.filter(a => !existingIds.has(a.id));
      setExtraActivities(prev => [...prev, ...newItems]);
      setHasMoreFromApi(resp.pagination?.hasNextPage ?? false);
    } catch {
      setHasMoreFromApi(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreFromApi, allActivities]);

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 3,
        height: '100%',
        background: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.6)
          : '#fff',
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: 2,
              p: 0.8,
              display: 'flex',
              color: 'white',
            }}
          >
            <HistoryIcon sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('dashboard.recentActivity')}
          </Typography>
        </Box>
        {activities.length > 0 && (
          <Typography
            variant="caption"
            sx={{
              bgcolor: alpha('#3b82f6', 0.08),
              color: '#3b82f6',
              px: 1.2,
              py: 0.3,
              borderRadius: 1.5,
              fontWeight: 700,
              fontSize: '0.7rem',
            }}
          >
            {activities.length + extraActivities.length} total
          </Typography>
        )}
      </Box>

      {activities.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.noRecentActivity')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative', flex: 1 }}>
          {/* Timeline line */}
          <Box
            sx={{
              position: 'absolute',
              left: 15,
              top: 0,
              bottom: 0,
              width: 2,
              background: `linear-gradient(180deg, ${alpha('#3b82f6', 0.3)}, ${alpha('#3b82f6', 0.05)})`,
              borderRadius: 1,
            }}
          />

          {/* First INITIAL_COUNT items - always visible */}
          {visibleActivities.map((activity, idx) => (
            <ActivityItem key={activity.id} activity={activity} idx={idx} theme={theme} />
          ))}

          {/* Remaining dashboard items + extra API items - collapsible */}
          {(hasMoreInProps || extraActivities.length > 0) && (
            <Collapse in={expanded} timeout={400}>
              {hiddenActivities.map((activity, idx) => (
                <ActivityItem key={activity.id} activity={activity} idx={INITIAL_COUNT + idx} theme={theme} />
              ))}
              {extraActivities.map((activity, idx) => (
                <ActivityItem key={activity.id} activity={activity} idx={activities.length + idx} theme={theme} />
              ))}

              {/* Load More from API button (inside the expanded section) */}
              {expanded && hasMoreFromApi && (
                <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                  <Button
                    size="small"
                    onClick={loadMoreFromApi}
                    disabled={loadingMore}
                    endIcon={loadingMore ? <CircularProgress size={14} /> : <KeyboardArrowDownIcon />}
                    sx={{
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#8b5cf6',
                      bgcolor: alpha('#8b5cf6', 0.06),
                      px: 2,
                      py: 0.5,
                      '&:hover': { bgcolor: alpha('#8b5cf6', 0.12) },
                    }}
                  >
                    {loadingMore ? 'Loading...' : 'Load Older Activities'}
                  </Button>
                </Box>
              )}
            </Collapse>
          )}
        </Box>
      )}

      {/* Show More / Show Less button */}
      {(hasMoreInProps || extraActivities.length > 0) && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.78rem',
              color: '#3b82f6',
              bgcolor: alpha('#3b82f6', 0.06),
              px: 2.5,
              py: 0.6,
              '&:hover': {
                bgcolor: alpha('#3b82f6', 0.12),
              },
            }}
          >
            {expanded
              ? 'Show Less'
              : `Show ${hiddenActivities.length + extraActivities.length} More`}
          </Button>
        </Box>
      )}
    </Box>
  );
});

RecentActivity.displayName = 'RecentActivity';
