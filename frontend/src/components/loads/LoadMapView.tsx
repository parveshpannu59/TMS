import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, Alert } from '@mui/material';
import { LocationOn, Speed, AccessTime } from '@mui/icons-material';
import type { Load, GPSLocation } from '../../types/all.types';
import { gpsApi } from '@api/all.api';
import GPSPlaceholder from './GPSPlaceholder';
import LiveTracker from './LiveTracker';

interface LoadMapViewProps {
  load: Load;
  showRoute?: boolean;
  showGeofence?: boolean;
  updateInterval?: number;
}

const LoadMapView: React.FC<LoadMapViewProps> = ({
  load,
  showRoute = true,
  showGeofence = true,
  updateInterval = 30000,
}) => {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkGPSStatus();
  }, []);

  useEffect(() => {
    if (gpsEnabled && load.id) {
      fetchLocationData();
      const interval = setInterval(fetchLocationData, updateInterval);
      return () => clearInterval(interval);
    }
  }, [gpsEnabled, load.id, updateInterval]);

  const checkGPSStatus = async () => {
    try {
      const status = await gpsApi.checkGPSStatus();
      setGpsEnabled(status.enabled);
    } catch (err: any) {
      console.error('Error checking GPS status:', err);
      setGpsEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationData = async () => {
    try {
      const [location, route] = await Promise.all([
        gpsApi.getCurrentLocation(load.id),
        gpsApi.getRouteData(load.id),
      ]);
      setCurrentLocation(location);
      setRouteData(route);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching location data:', err);
      setError('Failed to fetch location data');
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Checking GPS status...
        </Typography>
      </Paper>
    );
  }

  if (!gpsEnabled) {
    return <GPSPlaceholder />;
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Box>
      <LiveTracker
        load={load}
        currentLocation={currentLocation}
        routeData={routeData}
        showRoute={showRoute}
        showGeofence={showGeofence}
      />
      {currentLocation && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {currentLocation.speed !== undefined && (
            <Chip
              icon={<Speed />}
              label={`Speed: ${currentLocation.speed} km/h`}
              color="primary"
              variant="outlined"
            />
          )}
          {routeData?.eta && (
            <Chip
              icon={<AccessTime />}
              label={`ETA: ${routeData.eta}`}
              color="secondary"
              variant="outlined"
            />
          )}
          {routeData?.remainingDistance && (
            <Chip
              icon={<LocationOn />}
              label={`Remaining: ${routeData.remainingDistance.toFixed(1)} km`}
              color="info"
              variant="outlined"
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default LoadMapView;
