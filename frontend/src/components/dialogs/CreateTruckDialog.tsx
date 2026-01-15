import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { truckApi } from '@api/all.api';
import type { CreateTruckData } from '../../types/all.types';
import { TruckType } from '../../types/all.types';

interface CreateTruckDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTruckDialog: React.FC<CreateTruckDialogProps> = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateTruckData>({
    truckNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    truckType: TruckType.CLOSED_CONTAINER,
    capacity: 0,
    registrationNumber: '',
    registrationExpiry: new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 years
    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
  });

  const handleChange = (field: keyof CreateTruckData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validation
      if (!formData.truckNumber.trim()) {
        throw new Error('Truck number is required');
      }
      if (!formData.make.trim()) {
        throw new Error('Make is required');
      }
      if (!formData.model.trim()) {
        throw new Error('Model is required');
      }
      if (formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
        throw new Error('Invalid year');
      }
      if (formData.capacity <= 0) {
        throw new Error('Capacity must be greater than 0');
      }
      if (!formData.registrationNumber.trim()) {
        throw new Error('Registration number is required');
      }

      await truckApi.createTruck(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create truck');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      truckNumber: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      truckType: TruckType.CLOSED_CONTAINER,
      capacity: 0,
      registrationNumber: '',
      registrationExpiry: new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000).toISOString(),
      insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Truck</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Truck Number"
                value={formData.truckNumber}
                onChange={(e) => handleChange('truckNumber', e.target.value.toUpperCase())}
                required
                placeholder="e.g., TN01AB1234"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Registration Number"
                value={formData.registrationNumber}
                onChange={(e) => handleChange('registrationNumber', e.target.value.toUpperCase())}
                required
                placeholder="e.g., TN01AB1234"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Make"
                value={formData.make}
                onChange={(e) => handleChange('make', e.target.value)}
                required
                placeholder="e.g., Tata, Ashok Leyland"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Model"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                required
                placeholder="e.g., LPT 1918"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Year"
                type="number"
                value={formData.year}
                onChange={(e) => handleChange('year', parseInt(e.target.value) || new Date().getFullYear())}
                required
                inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Truck Type"
                value={formData.truckType}
                onChange={(e) => handleChange('truckType', e.target.value)}
                required
              >
                <MenuItem value={TruckType.OPEN_BODY}>Open Body</MenuItem>
                <MenuItem value={TruckType.CLOSED_CONTAINER}>Closed Container</MenuItem>
                <MenuItem value={TruckType.FLATBED}>Flatbed</MenuItem>
                <MenuItem value={TruckType.TANKER}>Tanker</MenuItem>
                <MenuItem value={TruckType.REFRIGERATED}>Refrigerated</MenuItem>
                <MenuItem value={TruckType.TRAILER}>Trailer</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Capacity (tons)"
                type="number"
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', parseFloat(e.target.value) || 0)}
                required
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>

            {/* Registration & Insurance */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Registration & Insurance
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Registration Expiry Date"
                value={new Date(formData.registrationExpiry)}
                onChange={(date: Date | null) => handleChange('registrationExpiry', date?.toISOString() || '')}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Insurance Expiry Date (Optional)"
                value={formData.insuranceExpiry ? new Date(formData.insuranceExpiry) : null}
                onChange={(date: Date | null) => handleChange('insuranceExpiry', date?.toISOString() || '')}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Add Truck'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTruckDialog;