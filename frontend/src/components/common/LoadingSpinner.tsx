import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(
  ({ message = 'Loading...', size = 40 }) => {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={size} />
        {message && (
          <Typography variant="body1" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';