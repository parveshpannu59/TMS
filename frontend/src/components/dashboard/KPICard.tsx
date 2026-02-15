import { memo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTranslation } from 'react-i18next';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: string;
  gradient?: string;
}

const COLOR_MAP: Record<string, { bg: string; grad: string }> = {
  'primary.main': { bg: '#3b82f6', grad: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
  'success.main': { bg: '#22c55e', grad: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
  'warning.main': { bg: '#f59e0b', grad: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  'error.main': { bg: '#ef4444', grad: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
  'info.main': { bg: '#06b6d4', grad: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  'secondary.main': { bg: '#8b5cf6', grad: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
};

export const KPICard = memo(({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'primary.main',
}: KPICardProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const mapped = COLOR_MAP[color] || COLOR_MAP['primary.main'];
  const bgColor = mapped.bg;

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        p: 2.5,
        height: '100%',
        background: theme.palette.mode === 'dark'
          ? alpha(bgColor, 0.15)
          : '#ffffff',
        border: `1px solid ${alpha(bgColor, 0.12)}`,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 12px 28px ${alpha(bgColor, 0.15)}`,
          border: `1px solid ${alpha(bgColor, 0.25)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: mapped.grad,
        },
      }}
    >
      {/* Decorative circle */}
      <Box
        sx={{
          position: 'absolute',
          top: -25,
          right: -25,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: alpha(bgColor, 0.04),
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -15,
          left: -15,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: alpha(bgColor, 0.03),
        }}
      />

      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1} sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: bgColor,
              fontSize: '0.7rem',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              mt: 0.5,
              mb: 0.5,
              lineHeight: 1.1,
              fontSize: { xs: '1.5rem', sm: '1.7rem' },
              color: 'text.primary',
            }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              background: mapped.grad,
              borderRadius: 2.5,
              p: 1.2,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${alpha(bgColor, 0.35)}`,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {trend !== undefined && (
        <Box display="flex" alignItems="center" mt={1.5} sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              bgcolor: trend >= 0 ? alpha('#22c55e', 0.1) : alpha('#ef4444', 0.1),
              borderRadius: 1.5,
              px: 0.8,
              py: 0.3,
            }}
          >
            {trend > 0 ? (
              <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} />
            ) : trend < 0 ? (
              <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />
            ) : null}
            <Typography
              variant="caption"
              sx={{
                color: trend >= 0 ? '#22c55e' : '#ef4444',
                fontWeight: 700,
                fontSize: '0.7rem',
              }}
            >
              {trend > 0 ? '+' : ''}{trend}%
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" ml={0.8} sx={{ fontSize: '0.65rem' }}>
            {t('dashboard.vsLastMonth')}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

KPICard.displayName = 'KPICard';
