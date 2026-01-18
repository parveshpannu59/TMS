import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Button,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import {
  LocationOn,
  Route,
  Speed,
  Update,
  NavigationOutlined,
} from '@mui/icons-material';
import type { Trip, UpdateTripLocationData } from '@/types/trip.types';

interface TripProgressTrackerProps {
  trip: Trip;
  onUpdateLocation: (data: UpdateTripLocationData) => Promise<void>;
}

export const TripProgressTracker: React.FC<TripProgressTrackerProps> = ({
  trip,
  onUpdateLocation,
}) => {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);

  // Get current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentPosition(position);
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  const handleUpdateLocation = async () => {
    if (!currentPosition) {
      setError('Location not available. Please enable location services.');
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      // Reverse geocode to get address (simplified - in production use Google Maps API)
      const address = `${currentPosition.coords.latitude.toFixed(4)}, ${currentPosition.coords.longitude.toFixed(4)}`;

      const updateData: UpdateTripLocationData = {
        tripId: trip._id,
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        address,
      };

      await onUpdateLocation(updateData);
    } catch (err: any) {
      setError(err.message || 'Failed to update location');
    } finally {
      setUpdating(false);
    }
  };

  // Calculate progress percentage
  const totalDistance = trip.distanceTraveled && trip.distanceRemaining
    ? trip.distanceTraveled + trip.distanceRemaining
    : 0;
  
  const progressPercent = totalDistance > 0 && trip.distanceTraveled
    ? (trip.distanceTraveled / totalDistance) * 100
    : 0;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Trip Progress</Typography>
          <Chip
            icon={<NavigationOutlined />}
            label={trip.status.replace('_', ' ').toUpperCase()}
            color="primary"
            size="small"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Distance Progress
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {progressPercent.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Grid container spacing={2}>
          {/* Distance Traveled */}
          <Grid item xs={6}>
            <Box>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <Route fontSize="small" color="success" />
                <Typography variant="caption" color="text.secondary">
                  Traveled
                </Typography>
              </Box>
              <Typography variant="h6" color="success.main">
                {trip.distanceTraveled || 0} mi
              </Typography>
            </Box>
          </Grid>

          {/* Distance Remaining */}
          <Grid item xs={6}>
            <Box>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <Speed fontSize="small" color="warning" />
                <Typography variant="caption" color="text.secondary">
                  Remaining
                </Typography>
              </Box>
              <Typography variant="h6" color="warning.main">
                {trip.distanceRemaining || '--'} mi
              </Typography>
            </Box>
          </Grid>

          {/* Current Location */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="start" gap={1} p={1.5} bgcolor="action.hover" borderRadius={1}>
              <LocationOn color="primary" sx={{ mt: 0.5 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Current Location
                </Typography>
                <Typography variant="body2">
                  {trip.currentLocation?.address || 'Location not updated'}
                </Typography>
                {trip.currentLocation?.timestamp && (
                  <Typography variant="caption" color="text.secondary">
                    Updated: {new Date(trip.currentLocation.timestamp).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Mileage Info */}
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Starting Mileage
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {trip.startingMileage || '--'}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Est. Total Miles
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {totalDistance || '--'}
            </Typography>
          </Grid>

          {/* Earnings Info */}
          <Grid item xs={12}>
            <Box p={1.5} bgcolor="success.light" borderRadius={1}>
              <Typography variant="caption" color="success.dark">
                Current Earnings (${trip.ratePerMile}/mile)
              </Typography>
              <Typography variant="h6" color="success.dark">
                ${trip.distanceTraveled ? (trip.distanceTraveled * trip.ratePerMile).toFixed(2) : '0.00'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Update Location Button */}
        <Button
          fullWidth
          variant="contained"
          startIcon={updating ? <Update /> : <LocationOn />}
          onClick={handleUpdateLocation}
          disabled={updating || !currentPosition}
          sx={{ mt: 2 }}
        >
          {updating ? 'Updating Location...' : 'Update Current Location'}
        </Button>

        {!currentPosition && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Enable location services to track your trip progress
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
