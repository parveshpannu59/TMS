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
  MenuItem,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  Divider,
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
  { value: 'repair', label: 'Maintenance & Repair', icon: <Build fontSize="small" /> },
  { value: 'other', label: 'Other' },
];

const PAYER_OPTIONS = [
  { value: 'driver', label: 'Driver (I paid)' },
  { value: 'dispatcher', label: 'Dispatcher / Owner' },
  { value: 'broker', label: 'Broker / Shipper' },
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

  // Fuel-specific fields
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [odometerBefore, setOdometerBefore] = useState('');
  const [odometerAfter, setOdometerAfter] = useState('');
  const [odometerBeforePhoto, setOdometerBeforePhoto] = useState<File | null>(null);
  const [odometerAfterPhoto, setOdometerAfterPhoto] = useState<File | null>(null);

  // Maintenance-specific fields
  const [repairStartTime, setRepairStartTime] = useState('');
  const [repairEndTime, setRepairEndTime] = useState('');
  const [repairDescription, setRepairDescription] = useState('');

  // Payer
  const [paidBy, setPaidBy] = useState('driver');

  useEffect(() => {
    if (open) setCategory(defaultCategory);
  }, [open, defaultCategory]);

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

      // Upload odometer photos if fuel
      let odometerBeforeUrl: string | undefined;
      let odometerAfterUrl: string | undefined;
      if (category === 'fuel') {
        if (odometerBeforePhoto) {
          odometerBeforeUrl = await loadApi.uploadLoadDocument(load.id, odometerBeforePhoto);
        }
        if (odometerAfterPhoto) {
          odometerAfterUrl = await loadApi.uploadLoadDocument(load.id, odometerAfterPhoto);
        }
      }

      // Build description with all extra info
      let fullDescription = description;
      if (category === 'fuel') {
        const parts = [];
        if (fuelStation) parts.push(`Station: ${fuelStation}`);
        if (fuelQuantity) parts.push(`Qty: ${fuelQuantity} gal`);
        if (odometerBefore) parts.push(`Odometer Before: ${odometerBefore}`);
        if (odometerAfter) parts.push(`Odometer After: ${odometerAfter}`);
        if (odometerBeforeUrl) parts.push(`Odometer Before Photo: ${odometerBeforeUrl}`);
        if (odometerAfterUrl) parts.push(`Odometer After Photo: ${odometerAfterUrl}`);
        if (parts.length) fullDescription = `${parts.join(' | ')}${description ? ` | Notes: ${description}` : ''}`;
      }
      if (category === 'repair') {
        const parts = [];
        if (repairStartTime) parts.push(`Start: ${repairStartTime}`);
        if (repairEndTime) parts.push(`End: ${repairEndTime}`);
        if (repairStartTime && repairEndTime) {
          const start = new Date(repairStartTime);
          const end = new Date(repairEndTime);
          const hours = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);
          parts.push(`Downtime: ${hours}h`);
        }
        if (repairDescription) parts.push(`Repair: ${repairDescription}`);
        if (parts.length) fullDescription = `${parts.join(' | ')}${description ? ` | Notes: ${description}` : ''}`;
      }
      fullDescription = `${fullDescription || ''} | Paid by: ${paidBy}`.trim();

      await loadApi.addExpense(load.id, {
        category,
        type: 'on_the_way',
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        description: fullDescription || undefined,
        location: (category === 'fuel' ? fuelStation : location) || undefined,
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
    setFuelQuantity('');
    setFuelStation('');
    setOdometerBefore('');
    setOdometerAfter('');
    setOdometerBeforePhoto(null);
    setOdometerAfterPhoto(null);
    setRepairStartTime('');
    setRepairEndTime('');
    setRepairDescription('');
    setPaidBy('driver');
    setError(null);
    onClose();
  };

  const getCategoryTitle = () => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? `Log ${cat.label}` : 'Log Expense';
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{getCategoryTitle()}</Typography>
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
            label="Amount ($)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            required
          />

          {/* Fuel-specific fields */}
          {category === 'fuel' && (
            <>
              <Divider sx={{ my: 0.5 }}><Typography variant="caption" color="text.secondary">Fuel Details</Typography></Divider>
              <TextField
                fullWidth
                label="Fuel Station / Location"
                value={fuelStation}
                onChange={(e) => setFuelStation(e.target.value)}
                placeholder="e.g. Pilot Travel Center, Exit 42"
              />
              <TextField
                fullWidth
                label="Fuel Quantity (gallons)"
                type="number"
                value={fuelQuantity}
                onChange={(e) => setFuelQuantity(e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Odometer Before"
                  type="number"
                  value={odometerBefore}
                  onChange={(e) => setOdometerBefore(e.target.value)}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  fullWidth
                  label="Odometer After"
                  type="number"
                  value={odometerAfter}
                  onChange={(e) => setOdometerAfter(e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" component="label" startIcon={<PhotoCamera />} size="small">
                  {odometerBeforePhoto ? 'Before ✓' : 'Odometer Before Photo'}
                  <input type="file" hidden accept="image/*" capture="environment" onChange={(e) => setOdometerBeforePhoto(e.target.files?.[0] || null)} />
                </Button>
                <Button variant="outlined" component="label" startIcon={<PhotoCamera />} size="small">
                  {odometerAfterPhoto ? 'After ✓' : 'Odometer After Photo'}
                  <input type="file" hidden accept="image/*" capture="environment" onChange={(e) => setOdometerAfterPhoto(e.target.files?.[0] || null)} />
                </Button>
              </Box>
            </>
          )}

          {/* Maintenance-specific fields */}
          {category === 'repair' && (
            <>
              <Divider sx={{ my: 0.5 }}><Typography variant="caption" color="text.secondary">Repair Details</Typography></Divider>
              <TextField
                fullWidth
                label="Repair Description"
                multiline
                rows={2}
                value={repairDescription}
                onChange={(e) => setRepairDescription(e.target.value)}
                placeholder="e.g. Tire blowout, brake repair"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Repair Start Time"
                  type="datetime-local"
                  value={repairStartTime}
                  onChange={(e) => setRepairStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Repair End Time"
                  type="datetime-local"
                  value={repairEndTime}
                  onChange={(e) => setRepairEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              {repairStartTime && repairEndTime && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Downtime: {((new Date(repairEndTime).getTime() - new Date(repairStartTime).getTime()) / 3600000).toFixed(1)} hours
                </Alert>
              )}
            </>
          )}

          {/* Generic location for non-fuel */}
          {category !== 'fuel' && (
            <TextField
              fullWidth
              label="Location (Optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Toll plaza, Repair shop"
            />
          )}

          {/* Who paid */}
          <FormControl fullWidth>
            <InputLabel>Who Paid?</InputLabel>
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} label="Who Paid?">
              {PAYER_OPTIONS.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {paidBy === 'driver' && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              This expense will be marked for reimbursement.
            </Alert>
          )}

          <TextField
            fullWidth
            label="Additional Notes (Optional)"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any additional details"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Receipt Photo / Scan
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
                  accept="image/*,application/pdf"
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
