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
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import { Close, Assignment, LocationOn, CalendarToday } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

interface DriverFormDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const DriverFormDialog: React.FC<DriverFormDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [loadNumber, setLoadNumber] = useState(load.loadNumber || '');
  const [pickupReferenceNumber, setPickupReferenceNumber] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupPlace, setPickupPlace] = useState(load.pickupLocation?.address || '');
  const [pickupDate, setPickupDate] = useState(
    load.pickupDate ? new Date(load.pickupDate).toISOString().split('T')[0] : ''
  );
  const [pickupLocation, setPickupLocation] = useState(
    `${load.pickupLocation?.city || ''}, ${load.pickupLocation?.state || ''}`
  );
  const [dropoffReferenceNumber, setDropoffReferenceNumber] = useState('');
  const [dropoffTime, setDropoffTime] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState(
    `${load.deliveryLocation?.city || ''}, ${load.deliveryLocation?.state || ''}`
  );
  const [dropoffDate, setDropoffDate] = useState(
    load.expectedDeliveryDate ? new Date(load.expectedDeliveryDate).toISOString().split('T')[0] : ''
  );

  const handleSubmit = async () => {
    if (
      !loadNumber ||
      !pickupReferenceNumber ||
      !pickupTime ||
      !pickupPlace ||
      !pickupDate ||
      !pickupLocation ||
      !dropoffReferenceNumber ||
      !dropoffTime ||
      !dropoffLocation ||
      !dropoffDate
    ) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await loadApi.submitDriverForm(load.id, {
        loadNumber,
        pickupReferenceNumber,
        pickupTime,
        pickupPlace,
        pickupDate,
        pickupLocation,
        dropoffReferenceNumber,
        dropoffTime,
        dropoffLocation,
        dropoffDate,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit driver form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoadNumber(load.loadNumber || '');
    setPickupReferenceNumber('');
    setPickupTime('');
    setPickupPlace(load.pickupLocation?.address || '');
    setPickupDate(
      load.pickupDate ? new Date(load.pickupDate).toISOString().split('T')[0] : ''
    );
    setPickupLocation(
      `${load.pickupLocation?.city || ''}, ${load.pickupLocation?.state || ''}`
    );
    setDropoffReferenceNumber('');
    setDropoffTime('');
    setDropoffLocation(
      `${load.deliveryLocation?.city || ''}, ${load.deliveryLocation?.state || ''}`
    );
    setDropoffDate(
      load.expectedDeliveryDate ? new Date(load.expectedDeliveryDate).toISOString().split('T')[0] : ''
    );
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment color="primary" />
            <Typography variant="h6">Trip Details Form</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {/* Pickup Details Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocationOn color="primary" />
              <Typography variant="h6">Pickup Details</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Load Number *"
                  value={loadNumber}
                  onChange={(e) => setLoadNumber(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: <Assignment sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reference Number *"
                  value={pickupReferenceNumber}
                  onChange={(e) => setPickupReferenceNumber(e.target.value)}
                  placeholder="Pickup reference number"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Pickup Time *"
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Pickup Date *"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pickup Place *"
                  value={pickupPlace}
                  onChange={(e) => setPickupPlace(e.target.value)}
                  placeholder="Enter pickup address/place"
                  required
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pickup Location *"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="City, State"
                  required
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Drop-off Details Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocationOn color="success" />
              <Typography variant="h6">Drop-off Details</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reference Number *"
                  value={dropoffReferenceNumber}
                  onChange={(e) => setDropoffReferenceNumber(e.target.value)}
                  placeholder="Drop-off reference number"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Drop-off Time *"
                  type="time"
                  value={dropoffTime}
                  onChange={(e) => setDropoffTime(e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Drop-off Date *"
                  type="date"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Drop-off Location *"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  placeholder="City, State"
                  required
                />
              </Grid>
            </Grid>
          </Box>

          <Alert severity="info">
            Please fill in all trip details accurately. This information will be sent back to the dispatcher.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            loading ||
            !loadNumber ||
            !pickupReferenceNumber ||
            !pickupTime ||
            !pickupPlace ||
            !pickupDate ||
            !pickupLocation ||
            !dropoffReferenceNumber ||
            !dropoffTime ||
            !dropoffLocation ||
            !dropoffDate
          }
        >
          {loading ? <CircularProgress size={16} /> : 'Submit Form'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
