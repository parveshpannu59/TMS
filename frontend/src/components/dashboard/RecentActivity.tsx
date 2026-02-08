import { memo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Activity } from '../../types/dashboard.types';
import { formatDistanceToNow } from 'date-fns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import HistoryIcon from '@mui/icons-material/History';

interface RecentActivityProps {
  activities: Activity[];
}

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

export const RecentActivity = memo(({ activities }: RecentActivityProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

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
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2.5}>
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

      {activities.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.noRecentActivity')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative' }}>
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

          {activities.slice(0, 8).map((activity, idx) => {
            const config = getActivityIcon(activity.type);
            return (
              <Box
                key={activity.id}
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
          })}
        </Box>
      )}
    </Box>
  );
});

RecentActivity.displayName = 'RecentActivity';
