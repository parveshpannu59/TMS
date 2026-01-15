import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          mb: 3,
          '& svg': {
            fontSize: 60,
          },
        }}
      >
        {icon}
      </Box>
      
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 400, mb: 3 }}
      >
        {description}
      </Typography>
      
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a4196 100%)',
            },
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};
