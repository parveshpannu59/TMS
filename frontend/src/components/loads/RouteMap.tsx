import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Route as RouteIcon } from '@mui/icons-material';
import type { Load } from '../../types/all.types';
import LiveTracker from './LiveTracker';
import GPSPlaceholder from './GPSPlaceholder';

interface RouteMapProps {
  load: Load;
  routeData?: any;
}

const RouteMap: React.FC<RouteMapProps> = ({ load, routeData }) => {
  if (!routeData) {
    return <GPSPlaceholder />;
  }

  return (
    <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <RouteIcon color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Route Information
        </Typography>
      </Box>
      <LiveTracker load={load} currentLocation={null} routeData={routeData} />
    </Paper>
  );
};

export default RouteMap;
