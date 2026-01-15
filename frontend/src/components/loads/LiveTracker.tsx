import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { LocationOn, LocalShipping, Flag } from '@mui/icons-material';
import type { Load, GPSLocation } from '../../types/all.types';
import GPSPlaceholder from './GPSPlaceholder';

interface LiveTrackerProps {
  load: Load;
  currentLocation: GPSLocation | null;
  routeData: any;
  showRoute?: boolean;
  showGeofence?: boolean; // Reserved for future geofencing features
}

const LiveTracker: React.FC<LiveTrackerProps> = ({
  load,
  currentLocation,
  routeData,
  showRoute = true,
  showGeofence: _showGeofence = true, // Reserved for future use
}) => {
  if (!currentLocation && !routeData) {
    return <GPSPlaceholder />;
  }

  const googleMapsApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
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
        <LocationOn sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Google Maps API Key Required
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400 }}>
          To enable live map tracking, please add your Google Maps API key to the environment
          variables.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Set VITE_GOOGLE_MAPS_API_KEY in your .env file
        </Typography>
      </Paper>
    );
  }

  // Build Google Maps URL with route
  const buildMapUrl = () => {
    const baseUrl = 'https://www.google.com/maps/embed/v1/directions';
    const origin = `${load.pickupLocation.lat || load.pickupLocation.city},${
      load.pickupLocation.lng || ''
    }`;
    const destination = `${load.deliveryLocation.lat || load.deliveryLocation.city},${
      load.deliveryLocation.lng || ''
    }`;
    const waypoint = currentLocation
      ? `${currentLocation.lat},${currentLocation.lng}`
      : undefined;

    let url = `${baseUrl}?key=${googleMapsApiKey}&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}`;
    if (waypoint) {
      url += `&waypoints=${encodeURIComponent(waypoint)}`;
    }

    return url;
  };

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
      <Box sx={{ position: 'relative', height: 500, width: '100%' }}>
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0 }}
          src={buildMapUrl()}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {currentLocation && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'background.paper',
              p: 1.5,
              borderRadius: 1,
              boxShadow: 2,
            }}
          >
            <Chip
              icon={<LocalShipping />}
              label="Live Tracking"
              color="success"
              size="small"
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" display="block" color="text.secondary">
              Last updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
            </Typography>
          </Box>
        )}
      </Box>
      {showRoute && routeData && (
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOn color="primary" />
              <Typography variant="body2">
                <strong>Pickup:</strong> {load.pickupLocation.city}
              </Typography>
            </Box>
            {currentLocation && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalShipping color="success" />
                <Typography variant="body2">
                  <strong>Current:</strong> {routeData.distanceTraveled?.toFixed(1) || 0} km
                  traveled
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Flag color="error" />
              <Typography variant="body2">
                <strong>Delivery:</strong> {load.deliveryLocation.city}
              </Typography>
            </Box>
            {routeData.remainingDistance && (
              <Typography variant="body2" color="text.secondary">
                {routeData.remainingDistance.toFixed(1)} km remaining
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default LiveTracker;
