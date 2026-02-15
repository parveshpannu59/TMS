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

  // Only Pickup fields — Drop-off is filled when ending the trip
  const [loadNumber] = useState(load.loadNumber || '');
  const [pickupReferenceNumber, setPickupReferenceNumber] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupPlace, setPickupPlace] = useState(
    load.pickupLocation?.address || (load.pickupLocation as any)?.name || ''
  );
  const [pickupDate, setPickupDate] = useState(
    load.pickupDate ? new Date(load.pickupDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [pickupLocation, setPickupLocation] = useState(() => {
    const loc = load.pickupLocation;
    if (!loc) return '';
    if (loc.city && loc.city.trim()) return `${loc.city}, ${loc.state || ''}`.replace(/,\s*$/, '');
    if (loc.address && loc.address.trim()) return loc.address;
    return '';
  });

  const handleSubmit = async () => {
    if (!loadNumber || !pickupReferenceNumber || !pickupTime || !pickupPlace || !pickupDate || !pickupLocation) {
      setError('Please fill in all pickup details');
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
        // Drop-off details will be filled when ending the trip
        dropoffReferenceNumber: '',
        dropoffTime: '',
        dropoffLocation: '',
        dropoffDate: '',
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit pickup details');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPickupReferenceNumber('');
    setPickupTime('');
    setPickupPlace(load.pickupLocation?.address || (load.pickupLocation as any)?.name || '');
    setPickupDate(
      load.pickupDate ? new Date(load.pickupDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );
    setError(null);
    onClose();
  };

  const canSubmit = !loading && !!loadNumber && !!pickupReferenceNumber && !!pickupTime && !!pickupPlace && !!pickupDate && !!pickupLocation;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LocationOn sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Pickup Details</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
        )}

        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          Fill in pickup details now. Drop-off details will be collected when you end the trip.
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Load Number — read-only */}
          <TextField
            fullWidth size="small"
            label="Load Number"
            value={loadNumber}
            disabled
            InputProps={{ startAdornment: <Assignment sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
          />

          {/* Reference Number */}
          <TextField
            fullWidth size="small"
            label="Reference Number *"
            value={pickupReferenceNumber}
            onChange={(e) => setPickupReferenceNumber(e.target.value)}
            placeholder="Pickup reference / PO number"
            required
          />

          {/* Date + Time row */}
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small"
                label="Pickup Date *"
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <CalendarToday sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} /> }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small"
                label="Pickup Time *"
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Pickup Place */}
          <TextField
            fullWidth size="small"
            label="Pickup Place *"
            value={pickupPlace}
            onChange={(e) => setPickupPlace(e.target.value)}
            placeholder="Shipper name or address"
            required
          />

          {/* Pickup Location */}
          <TextField
            fullWidth size="small"
            label="Pickup Location (City, State) *"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            placeholder="City, State"
            required
            InputProps={{ startAdornment: <LocationOn sx={{ mr: 0.5, color: '#3b82f6', fontSize: 20 }} /> }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            '&:hover': { background: 'linear-gradient(135deg, #2563eb, #4f46e5)' },
          }}
        >
          {loading ? <CircularProgress size={16} /> : 'Submit Pickup Details'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
