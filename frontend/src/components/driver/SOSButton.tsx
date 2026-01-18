import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Fab,
  useTheme,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Warning,
  Close,
  LocationOn,
  Send,
} from '@mui/icons-material';
import type { CreateSOSData } from '@/types/trip.types';

interface SOSButtonProps {
  tripId?: string;
  loadId?: string;
  onSendSOS: (data: CreateSOSData) => Promise<void>;
  emergencyContacts?: { name: string; role: string }[];
}

export const SOSButton: React.FC<SOSButtonProps> = ({
  tripId,
  loadId,
  onSendSOS,
  emergencyContacts = [
    { name: 'Fleet Owner', role: 'Owner' },
    { name: 'Dispatcher', role: 'Dispatch' },
  ],
}) => {
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
    getCurrentLocation();
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    setError(null);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Simplified address (in production, use reverse geocoding API)
          const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setLocation({
            lat: latitude,
            lng: longitude,
            address,
          });
          setGettingLocation(false);
        },
        (error) => {
          setError('Unable to get location. Please enable location services.');
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setGettingLocation(false);
    }
  };

  const handleSendSOS = async () => {
    if (!message.trim()) {
      setError('Please describe the emergency');
      return;
    }

    if (!location) {
      setError('Location not available. Please enable location services.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const sosData: CreateSOSData = {
        message: message.trim(),
        location: {
          latitude: location.lat,
          longitude: location.lng,
          address: location.address,
        },
        tripId,
        loadId,
      };

      await onSendSOS(sosData);
      
      setSosActive(true);
      setDialogOpen(false);
      setMessage('');
      
      // Auto-disable SOS button after 5 minutes (prevents accidental multiple clicks)
      setTimeout(() => {
        setSosActive(false);
      }, 5 * 60 * 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send SOS');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setDialogOpen(false);
      setMessage('');
      setError(null);
    }
  };

  return (
    <>
      {/* SOS Floating Action Button */}
      <Fab
        color="error"
        aria-label="sos"
        onClick={handleOpenDialog}
        disabled={sosActive}
        sx={{
          position: 'fixed',
          bottom: isMobile => (isMobile ? 80 : 24),
          right: 24,
          animation: sosActive ? 'none' : 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              transform: 'scale(1)',
              boxShadow: `0 0 0 0 ${theme.palette.error.main}`,
            },
            '50%': {
              transform: 'scale(1.05)',
              boxShadow: `0 0 0 10px ${theme.palette.error.main}00`,
            },
          },
        }}
      >
        {sosActive ? <CircularProgress size={24} color="inherit" /> : <Warning />}
      </Fab>

      {/* SOS Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="error" />
            <Typography variant="h6" color="error">
              Emergency SOS
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Emergency contacts will be notified immediately!
            </Typography>
            <Typography variant="caption">
              Use this only for genuine emergencies
            </Typography>
          </Alert>

          {error && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Emergency Contacts */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              The following contacts will be notified:
            </Typography>
            <List dense>
              {emergencyContacts.map((contact, idx) => (
                <ListItem key={idx}>
                  <ListItemText
                    primary={contact.name}
                    secondary={contact.role}
                  />
                  <Chip label="Will be notified" size="small" color="error" />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Location */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LocationOn color="primary" />
              <Typography variant="body2" fontWeight={600}>
                Your Current Location
              </Typography>
            </Box>
            {gettingLocation ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} />
                <Typography variant="caption">Getting location...</Typography>
              </Box>
            ) : location ? (
              <Typography variant="caption" color="text.secondary">
                📍 {location.address}
              </Typography>
            ) : (
              <Typography variant="caption" color="error">
                Location unavailable
              </Typography>
            )}
          </Box>

          {/* Emergency Message */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Describe the Emergency *"
            placeholder="Please describe what happened and what assistance you need..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            required
            autoFocus
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              Your current location, trip details, and message will be sent to all emergency contacts.
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendSOS}
            variant="contained"
            color="error"
            disabled={loading || !message.trim() || !location}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? 'Sending SOS...' : 'Send Emergency SOS'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
