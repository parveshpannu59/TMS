import { memo } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: string;
}

export const KPICard = memo(({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon, 
  color = 'primary.main' 
}: KPICardProps) => {
  const { t } = useTranslation();
  return (
    <Card 
      sx={{ 
        height: '100%', 
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              fontWeight="bold"
              sx={{ mb: 0.5 }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                bgcolor: color,
                borderRadius: 2,
                p: 1.5,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        {trend !== undefined && (
          <Box display="flex" alignItems="center" mt={2}>
            {trend > 0 ? (
              <TrendingUpIcon color="success" fontSize="small" />
            ) : trend < 0 ? (
              <TrendingDownIcon color="error" fontSize="small" />
            ) : null}
            <Typography
              variant="caption"
              color={trend > 0 ? 'success.main' : trend < 0 ? 'error.main' : 'text.secondary'}
              ml={0.5}
              fontWeight={600}
            >
              {trend > 0 ? '+' : ''}{trend}% {t('dashboard.vsLastMonth')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

KPICard.displayName = 'KPICard';