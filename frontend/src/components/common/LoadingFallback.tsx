import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : 400,
        gap: 2,
      }}
    >
      <CircularProgress size={60} thickness={4} />
      <Typography variant="body1" color="text.secondary" fontWeight={500}>
        {message}
      </Typography>
    </Box>
  );
};
