import React from 'react';
import { Typography, Paper, Button } from '@mui/material';
import { LocationOff, Map as MapIcon } from '@mui/icons-material';

interface GPSPlaceholderProps {
  onActivateClick?: () => void;
}

const GPSPlaceholder: React.FC<GPSPlaceholderProps> = ({ onActivateClick }) => {
  const gpsEnabled = (import.meta as any).env?.VITE_GPS_ENABLED === 'true';

  return (
    <Paper
      elevation={2}
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: 'background.default',
        borderRadius: 2,
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LocationOff sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        GPS Tracking Not Enabled
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        Live location tracking will appear here when GPS is activated. Enable GPS tracking to see
        real-time truck locations, routes, and ETAs.
      </Typography>
      {!gpsEnabled && onActivateClick && (
        <Button
          variant="outlined"
          startIcon={<MapIcon />}
          onClick={onActivateClick}
          sx={{ mt: 2 }}
        >
          View Activation Guide
        </Button>
      )}
      {gpsEnabled && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          GPS is enabled but no location data available yet
        </Typography>
      )}
    </Paper>
  );
};

export default GPSPlaceholder;
