import React, { useState, useEffect } from 'react';
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
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Close,
  AttachMoney,
  MyLocation,
  LocationOn,
  Person,
} from '@mui/icons-material';
import { loadService } from '@/services/loadService';
import type { Load } from '@/api/load.api';

interface ConfirmRateDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load | null;
  onSuccess: () => void;
}

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
  const [rate, setRate] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [driverName, setDriverName] = useState('');

  useEffect(() => {
    if (open && load) {
      const l = load as unknown as Record<string, any>;
      // Rate
      setRate(String(l.rate || l.driverRate || ''));
      // From location
      const pickup = l.pickupLocation || l.origin;
      if (pickup) {
        const parts = [pickup.address || pickup.name, pickup.city, pickup.state].filter(Boolean);
        setFromLocation(parts.join(', '));
      } else { setFromLocation(''); }
      // To location
      const delivery = l.deliveryLocation || l.destination;
      if (delivery) {
        const parts = [delivery.address || delivery.name, delivery.city, delivery.state].filter(Boolean);
        setToLocation(parts.join(', '));
      } else { setToLocation(''); }
      // Driver
      if (l.driverId && typeof l.driverId === 'object' && l.driverId.name) {
        setDriverName(l.driverId.name);
      } else if (l.driver && typeof l.driver === 'object' && l.driver.name) {
        setDriverName(l.driver.name);
      } else { setDriverName(''); }
      setError(null);
    }
  }, [open, load]);

  const handleSubmit = async () => {
    if (!load) return;
    if (!rate || parseFloat(rate) <= 0) { setError('Please enter a valid rate'); return; }
    if (!fromLocation.trim()) { setError('From location is required'); return; }
    if (!toLocation.trim()) { setError('To location is required'); return; }

    try {
      setLoading(true);
      setError(null);
      await loadService.confirmRate(load._id, {
        trackingLink: '',
        pickupAddress: fromLocation.trim(),
        deliveryAddress: toLocation.trim(),
        miles: 0,
        rate: parseFloat(rate),
      } as any);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to confirm rate');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRate('');
    setFromLocation('');
    setToLocation('');
    setDriverName('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AttachMoney sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Confirm Rate</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

          {/* Rate */}
          <TextField
            fullWidth size="small"
            label="Rate ($) *"
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            required
            InputProps={{
              startAdornment: <AttachMoney sx={{ mr: 0.5, color: '#10b981', fontSize: 20 }} />,
            }}
          />

          {/* From Location */}
          <TextField
            fullWidth size="small"
            label="From Location *"
            value={fromLocation}
            onChange={(e) => setFromLocation(e.target.value)}
            required
            placeholder="Pickup address"
            InputProps={{
              startAdornment: <MyLocation sx={{ mr: 0.5, color: '#3b82f6', fontSize: 20 }} />,
            }}
          />

          {/* To Location */}
          <TextField
            fullWidth size="small"
            label="To Location *"
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            required
            placeholder="Delivery address"
            InputProps={{
              startAdornment: <LocationOn sx={{ mr: 0.5, color: '#ef4444', fontSize: 20 }} />,
            }}
          />

          {/* Driver (read-only display) */}
          {driverName && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: 1.5, borderRadius: 2,
              border: `1px solid ${alpha('#e2e8f0', 0.8)}`,
              background: alpha('#f8fafc', 0.5),
            }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Person sx={{ color: '#fff', fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Driver</Typography>
                <Typography variant="body2" fontWeight={600}>{driverName}</Typography>
              </Box>
            </Box>
          )}

          {!driverName && (
            <TextField
              fullWidth size="small"
              label="Driver"
              value="Not assigned yet"
              disabled
              InputProps={{
                startAdornment: <Person sx={{ mr: 0.5, color: '#94a3b8', fontSize: 20 }} />,
              }}
            />
          )}

          {/* Info banner when confirming rate for an assigned load */}
          {driverName && load && (load as any).status === 'assigned' && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Confirming the rate will notify <strong>{driverName}</strong> to accept or decline this load.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained" onClick={handleSubmit}
          disabled={loading || !rate || !fromLocation.trim() || !toLocation.trim()}
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            '&:hover': { background: 'linear-gradient(135deg, #059669, #047857)' },
          }}
        >
          {loading ? <CircularProgress size={16} /> : (load && (load as any).status === 'assigned' ? 'Confirm Rate & Notify Driver' : 'Confirm Rate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
