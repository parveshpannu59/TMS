import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { driverApi } from '@api/all.api';
import type { Driver, CreateDriverData } from '../../types/all.types';
import { useTranslation } from 'react-i18next';

interface EditDriverDialogProps {
  open: boolean;
  driver: Driver | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditDriverDialog: React.FC<EditDriverDialogProps> = ({ open, driver, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateDriverData & { notes?: string }>({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: new Date().toISOString(),
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContact: '',
    emergencyContactName: '',
    salary: 0,
    notes: '',
  });

  useEffect(() => {
    if (open && driver) {
      setFormData({
        name: driver.name,
        email: driver.email || '',
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        licenseExpiry: driver.licenseExpiry,
        address: driver.address,
        city: driver.city,
        state: driver.state,
        pincode: driver.pincode,
        emergencyContact: driver.emergencyContact,
        emergencyContactName: driver.emergencyContactName,
        salary: driver.salary || 0,
        notes: (driver as any).notes || '',
      });
    }
  }, [open, driver]);

  const handleChange = (field: keyof CreateDriverData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!driver) return;

    try {
      setLoading(true);
      setError(null);

      // Validation
      if (!formData.name.trim()) {
        throw new Error('Driver name is required');
      }
      if (formData.phone.length !== 10) {
        throw new Error('Phone must be 10 digits');
      }
      if (!formData.licenseNumber.trim()) {
        throw new Error('License number is required');
      }
      if (formData.pincode.length !== 6) {
        throw new Error('Pincode must be 6 digits');
      }
      if (formData.emergencyContact.length !== 10) {
        throw new Error('Emergency contact must be 10 digits');
      }
      if (!formData.emergencyContactName.trim()) {
        throw new Error('Emergency contact name is required');
      }

      await driverApi.updateDriver(driver.id, formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update driver');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('drivers.editDriver')} - {driver.name}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Personal Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                {t('drivers.personalInformation', { defaultValue: 'Personal Information' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('users.fullName', { defaultValue: 'Full Name' })}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('drivers.emailOptional', { defaultValue: 'Email (Optional)' })}
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('common.phone')}
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
                inputProps={{ maxLength: 10 }}
                helperText={t('drivers.tenDigits', { defaultValue: '10 digits' })}
              />
            </Grid>

            {/* License Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                {t('drivers.licenseInformation', { defaultValue: 'License Information' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('drivers.licenseNumber')}
                value={formData.licenseNumber}
                onChange={(e) => handleChange('licenseNumber', e.target.value.toUpperCase())}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label={t('drivers.licenseExpiry')}
                value={new Date(formData.licenseExpiry)}
                onChange={(date: Date | null) => handleChange('licenseExpiry', date?.toISOString() || '')}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            {/* Address Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                {t('common.address')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('common.address')}
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                required
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label={t('common.city')}
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label={t('common.state')}
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label={t('drivers.pincode', { defaultValue: 'Pincode' })}
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                required
                inputProps={{ maxLength: 6 }}
                helperText={t('drivers.sixDigits', { defaultValue: '6 digits' })}
              />
            </Grid>

            {/* Emergency Contact */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                {t('drivers.emergencyContact', { defaultValue: 'Emergency Contact' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('drivers.emergencyContactName', { defaultValue: 'Emergency Contact Name' })}
                value={formData.emergencyContactName}
                onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('drivers.emergencyContactPhone', { defaultValue: 'Emergency Contact Phone' })}
                value={formData.emergencyContact}
                onChange={(e) => handleChange('emergencyContact', e.target.value)}
                required
                inputProps={{ maxLength: 10 }}
                helperText={t('drivers.tenDigits', { defaultValue: '10 digits' })}
              />
            </Grid>

            {/* Salary (Optional) */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                {t('drivers.compensation', { defaultValue: 'Compensation' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('drivers.monthlySalaryOptional', { defaultValue: 'Monthly Salary (₹) - Optional' })}
                type="number"
                value={formData.salary}
                onChange={(e) => handleChange('salary', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                {t('drivers.additionalNotes', { defaultValue: 'Additional Notes' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('common.notes')}
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                multiline
                rows={4}
                placeholder={t('drivers.notesPlaceholder', { defaultValue: 'Add any additional notes, performance records, training information, or important information about this driver...' })}
                helperText={t('drivers.notesHelper', { defaultValue: 'Use this field to record performance notes, training history, certifications, or any other relevant information' })}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : t('drivers.updateDriver', { defaultValue: 'Update Driver' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDriverDialog;