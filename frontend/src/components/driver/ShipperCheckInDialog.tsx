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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

interface ShipperCheckInDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const ShipperCheckInDialog: React.FC<ShipperCheckInDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [poNumber, setPoNumber] = useState('');
  const [loadNumber, setLoadNumber] = useState(load.loadNumber || '');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!poNumber || !loadNumber || !referenceNumber) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await loadApi.shipperCheckIn(load.id, {
        poNumber,
        loadNumber,
        referenceNumber,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to check in at shipper');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPoNumber('');
    setLoadNumber(load.loadNumber || '');
    setReferenceNumber('');
    setError(null);
    onClose();
  };

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
          <Typography variant="h6">Shipper Check-in</Typography>
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="PO Number *"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="Enter Purchase Order number"
            required
          />

          <TextField
            fullWidth
            label="Load Number *"
            value={loadNumber}
            onChange={(e) => setLoadNumber(e.target.value)}
            placeholder="Enter load number"
            required
          />

          <TextField
            fullWidth
            label="Reference Number *"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Enter reference number"
            required
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !poNumber || !loadNumber || !referenceNumber}
        >
          {loading ? <CircularProgress size={16} /> : 'Check In'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
