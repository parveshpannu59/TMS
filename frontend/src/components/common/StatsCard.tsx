import React from 'react';
import { Card, CardContent, Box, Typography, alpha, useTheme } from '@mui/material';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
}) => {
  const theme = useTheme();
  const cardColor = color || theme.palette.primary.main;

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(cardColor, 0.1)} 0%, ${alpha(cardColor, 0.05)} 100%)`,
        borderLeft: `4px solid ${cardColor}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover': {
            transform: 'none',
          },
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(cardColor, 0.15),
              color: cardColor,
              '& svg': {
                fontSize: 28,
              },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
