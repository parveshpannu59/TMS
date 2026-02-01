import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { loadService } from '@/services/loadService';
import type { Load } from '@/api/load.api';

interface ConfirmRateDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load | null;
  onSuccess: () => void;
}

const emptyLocation = {
  address: '',
  city: '',
  state: '',
  pincode: '',
};

export const ConfirmRateDialog: React.FC<ConfirmRateDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingLink, setTrackingLink] = useState('');
  const [pickupAddress, setPickupAddress] = useState(emptyLocation);
  const [deliveryAddress, setDeliveryAddress] = useState(emptyLocation);
  const [miles, setMiles] = useState<number>(0);

  useEffect(() => {
    if (open && load) {
      const l = load as Record<string, unknown>;
      const pickup = l.pickupLocation || l.origin;
      const delivery = l.deliveryLocation || l.destination;
      setTrackingLink((l.trackingLink as string) || '');
      setPickupAddress(pickup ? {
        address: pickup.address || pickup.name || '',
        city: pickup.city || '',
        state: pickup.state || '',
        pincode: pickup.pincode || pickup.zipCode || '',
      } : emptyLocation);
      setDeliveryAddress(delivery ? {
        address: delivery.address || delivery.name || '',
        city: delivery.city || '',
        state: delivery.state || '',
        pincode: delivery.pincode || delivery.zipCode || '',
      } : emptyLocation);
      setMiles((load.miles as number) || ((load as Record<string, unknown>).distance as number) || 0);
      setError(null);
    }
  }, [open, load]);

  const handleLocationChange = (
    type: 'pickup' | 'delivery',
    field: string,
    value: string | number
  ) => {
    if (type === 'pickup') {
      setPickupAddress((prev) => ({ ...prev, [field]: value }));
    } else {
      setDeliveryAddress((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!load) return;
    if (!trackingLink?.trim()) {
      setError('Tracking link is required');
      return;
    }
    if (!pickupAddress.address || !pickupAddress.city || !pickupAddress.state || !pickupAddress.pincode) {
      setError('Pickup address fields are required');
      return;
    }
    if (!deliveryAddress.address || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode) {
      setError('Delivery address fields are required');
      return;
    }
    if (!miles || miles < 0) {
      setError('Miles must be a positive number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loadService.confirmRate(load._id, {
        trackingLink: trackingLink.trim(),
        pickupAddress: {
          address: pickupAddress.address,
          city: pickupAddress.city,
          state: pickupAddress.state,
          pincode: pickupAddress.pincode,
        },
        deliveryAddress: {
          address: deliveryAddress.address,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          pincode: deliveryAddress.pincode,
        },
        miles: Number(miles),
      });
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to confirm rate');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTrackingLink('');
    setPickupAddress(emptyLocation);
    setDeliveryAddress(emptyLocation);
    setMiles(0);
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
          <Typography variant="h6">Confirm Rate (Broker)</Typography>
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

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter tracking link, pickup/delivery addresses, and miles as provided by the broker.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            fullWidth
            label="Tracking Link *"
            value={trackingLink}
            onChange={(e) => setTrackingLink(e.target.value)}
            placeholder="https://..."
            required
          />

          <Typography variant="subtitle2" color="primary">Pickup Address</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={pickupAddress.address}
                onChange={(e) => handleLocationChange('pickup', 'address', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={pickupAddress.city}
                onChange={(e) => handleLocationChange('pickup', 'city', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={pickupAddress.state}
                onChange={(e) => handleLocationChange('pickup', 'state', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={pickupAddress.pincode}
                onChange={(e) => handleLocationChange('pickup', 'pincode', e.target.value)}
                required
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" color="primary">Delivery Address</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={deliveryAddress.address}
                onChange={(e) => handleLocationChange('delivery', 'address', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={deliveryAddress.city}
                onChange={(e) => handleLocationChange('delivery', 'city', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={deliveryAddress.state}
                onChange={(e) => handleLocationChange('delivery', 'state', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={deliveryAddress.pincode}
                onChange={(e) => handleLocationChange('delivery', 'pincode', e.target.value)}
                required
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            type="number"
            label="Miles *"
            value={miles || ''}
            onChange={(e) => setMiles(Number(e.target.value) || 0)}
            inputProps={{ min: 0 }}
            required
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} /> : null}
        >
          {loading ? 'Confirming...' : 'Confirm Rate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
