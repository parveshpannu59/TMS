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
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, Warning } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

const DELAY_REASONS = [
  { value: 'traffic', label: 'Traffic / Road congestion' },
  { value: 'breakdown', label: 'Vehicle breakdown' },
  { value: 'weather', label: 'Weather conditions' },
  { value: 'shipper_wait', label: 'Waiting at shipper' },
  { value: 'receiver_wait', label: 'Waiting at receiver' },
  { value: 'detour', label: 'Detour / Route change' },
  { value: 'rest_stop', label: 'Mandatory rest stop' },
  { value: 'other', label: 'Other' },
];

interface ReportDelayDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const ReportDelayDialog: React.FC<ReportDelayDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [reason, setReason] = useState('traffic');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const reasonLabel = DELAY_REASONS.find((r) => r.value === reason)?.label || reason;
      await loadApi.reportDelay(load.id, {
        reason: reasonLabel,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to report delay');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('traffic');
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            <Typography variant="h6">Report Delay</Typography>
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

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Load #{load.loadNumber} – Dispatcher will be notified.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            fullWidth
            label="Reason *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {DELAY_REASONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Additional details (Optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Estimated delay 2 hours, stuck at..."
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" color="warning" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={16} /> : 'Report Delay'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
