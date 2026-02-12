import React, { memo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

const GRADIENT_MAP: Record<string, string> = {
  '#3b82f6': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  '#6366f1': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  '#10b981': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  '#22c55e': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  '#f59e0b': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  '#ef4444': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  '#06b6d4': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  '#8b5cf6': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
};

function getGradient(color: string): string {
  return GRADIENT_MAP[color] || `linear-gradient(135deg, ${color} 0%, ${color} 100%)`;
}

export const StatsCard = memo<StatsCardProps>(function StatsCard({
  title,
  value,
  icon,
  color,
  subtitle,
}) {
  const theme = useTheme();
  const cardColor = color || theme.palette.primary.main;
  const grad = getGradient(cardColor);

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        p: 2.5,
        height: '100%',
        background: theme.palette.mode === 'dark'
          ? alpha(cardColor, 0.12)
          : `linear-gradient(135deg, ${alpha(cardColor, 0.06)} 0%, ${alpha(cardColor, 0.02)} 100%)`,
        border: `1px solid ${alpha(cardColor, 0.12)}`,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 12px 24px ${alpha(cardColor, 0.15)}`,
          border: `1px solid ${alpha(cardColor, 0.25)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: grad,
        },
      }}
    >
      {/* Decorative circle */}
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: alpha(cardColor, 0.05),
        }}
      />

      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1} sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: cardColor,
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
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.72rem',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            background: grad,
            borderRadius: 2.5,
            p: 1.2,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px ${alpha(cardColor, 0.35)}`,
            position: 'relative',
            zIndex: 1,
            '& svg': { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
      </Box>
    </Box>
  );
});
