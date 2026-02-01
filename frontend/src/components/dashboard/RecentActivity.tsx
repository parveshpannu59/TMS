import { memo } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText,
  Chip 
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Activity } from '../../types/dashboard.types';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  activities: Activity[];
}

export const RecentActivity = memo(({ activities }: RecentActivityProps) => {
  const { t } = useTranslation();
  const getColorByType = (type: Activity['type']) => {
    const colors = {
      success: 'success',
      warning: 'warning',
      error: 'error',
      info: 'info',
    } as const;
    return colors[type];
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          {t('dashboard.recentActivity')}
        </Typography>
        
        <List sx={{ pt: 2 }}>
          {activities.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              {t('dashboard.noRecentActivity')}
            </Typography>
          ) : (
            activities.map((activity) => (
              <ListItem 
                key={activity.id}
                sx={{ 
                  px: 0,
                  py: 1.5,
                  position: 'relative',
                  '&:not(:last-child)': {
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 20,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: `${getColorByType(activity.type)}.main`,
                  }
                }}
              >
                <ListItemText
                  primary={activity.message}
                  secondary={formatDistanceToNow(new Date(activity.timestamp), { 
                    addSuffix: true 
                  })}
                  sx={{ ml: 2 }}
                  primaryTypographyProps={{
                    fontWeight: 500,
                    fontSize: '0.875rem',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                  }}
                />
              </ListItem>
            ))
          )}
        </List>
      </CardContent>
    </Card>
  );
});

RecentActivity.displayName = 'RecentActivity';