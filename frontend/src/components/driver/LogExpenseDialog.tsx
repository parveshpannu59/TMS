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
import { Close, PhotoCamera, LocalGasStation, Toll, Build } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

const CATEGORIES = [
  { value: 'fuel', label: 'Fuel', icon: <LocalGasStation fontSize="small" /> },
  { value: 'toll', label: 'Toll', icon: <Toll fontSize="small" /> },
  { value: 'scale', label: 'Scale' },
  { value: 'parking', label: 'Parking' },
  { value: 'lumper', label: 'Lumper' },
  { value: 'dock_fee', label: 'Dock Fee' },
  { value: 'other', label: 'Other', icon: <Build fontSize="small" /> },
];

interface LogExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
  defaultCategory?: string;
}

export const LogExpenseDialog: React.FC<LogExpenseDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
  defaultCategory = 'fuel',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [category, setCategory] = useState(defaultCategory);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let receiptUrl: string | undefined;
      if (receiptFile) {
        receiptUrl = await loadApi.uploadLoadDocument(load.id, receiptFile);
      }

      await loadApi.addExpense(load.id, {
        category,
        type: 'on_the_way',
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        description: description || undefined,
        location: location || undefined,
        receiptUrl,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to log expense');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategory(defaultCategory);
    setAmount('');
    setDescription('');
    setLocation('');
    setReceiptFile(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Log Expense</Typography>
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
            select
            fullWidth
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.icon && <Box component="span" sx={{ mr: 1, display: 'inline-flex' }}>{c.icon}</Box>}
                {c.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            required
          />

          <TextField
            fullWidth
            label="Location (Optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Fuel stop, Toll plaza"
          />

          <TextField
            fullWidth
            label="Notes (Optional)"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any details about this expense"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Receipt Photo (Optional)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCamera />}
                disabled={loading}
              >
                {receiptFile ? receiptFile.name : 'Capture Receipt'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </Button>
              {receiptFile && (
                <Typography variant="caption" color="text.secondary">
                  ({(receiptFile.size / 1024).toFixed(0)} KB)
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !amount}>
          {loading ? <CircularProgress size={16} /> : 'Log Expense'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
