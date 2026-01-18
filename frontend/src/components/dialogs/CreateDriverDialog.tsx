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
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { driverApi, userApi } from '@api/all.api';
import type { CreateDriverData } from '../../types/all.types';

interface CreateDriverDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateDriverDialog: React.FC<CreateDriverDialogProps> = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [formData, setFormData] = useState<CreateDriverData>({
    userId: '',
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContact: '',
    emergencyContactName: '',
    salary: 0,
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const allUsers = await userApi.getUsers();
      // Filter users with driver role who don't already have a driver profile
      const driverUsers = allUsers.filter((u: any) => u.role === 'driver');
      setUsers(driverUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (field: keyof CreateDriverData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setFormData((prev) => ({
        ...prev,
        userId: userId,
        name: selectedUser.name || prev.name,
        email: selectedUser.email || prev.email,
        phone: selectedUser.phone || prev.phone,
      }));
    } else {
      handleChange('userId', userId);
    }
  };

  const handleSubmit = async () => {
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

      await driverApi.createDriver(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create driver');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      userId: '',
      name: '',
      email: '',
      phone: '',
      licenseNumber: '',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      address: '',
      city: '',
      state: '',
      pincode: '',
      emergencyContact: '',
      emergencyContactName: '',
      salary: 0,
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Driver</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* User Account Selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Link to User Account
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Select User"
                value={formData.userId || ''}
                onChange={(e) => handleUserSelect(e.target.value)}
                helperText="Select the user account this driver will use to log in"
                disabled={loadingUsers}
              >
                <MenuItem value="">
                  <em>None (Create without user account)</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email}) - {user.role}
                  </MenuItem>
                ))}
              </TextField>
              {formData.userId && (
                <FormHelperText sx={{ color: 'success.main', mt: 1 }}>
                  ✓ Driver will be able to log in and see assigned loads
                </FormHelperText>
              )}
              {!formData.userId && (
                <FormHelperText sx={{ color: 'warning.main', mt: 1 }}>
                  ⚠ Without a user account, this driver won't be able to log in
                </FormHelperText>
              )}
            </Grid>

            {/* Personal Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Personal Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email (Optional)"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
                inputProps={{ maxLength: 10 }}
                helperText="10 digits"
              />
            </Grid>

            {/* License Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                License Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="License Number"
                value={formData.licenseNumber}
                onChange={(e) => handleChange('licenseNumber', e.target.value.toUpperCase())}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="License Expiry Date"
                value={new Date(formData.licenseExpiry)}
                onChange={(date: Date | null) => handleChange('licenseExpiry', date?.toISOString() || '')}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            {/* Address Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Address
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
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
                label="City"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                required
                inputProps={{ maxLength: 6 }}
                helperText="6 digits"
              />
            </Grid>

            {/* Emergency Contact */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Emergency Contact
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergencyContactName}
                onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.emergencyContact}
                onChange={(e) => handleChange('emergencyContact', e.target.value)}
                required
                inputProps={{ maxLength: 10 }}
                helperText="10 digits"
              />
            </Grid>

            {/* Salary (Optional) */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Compensation
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monthly Salary (₹) - Optional"
                type="number"
                value={formData.salary}
                onChange={(e) => handleChange('salary', parseFloat(e.target.value) || 0)}
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
          {loading ? <CircularProgress size={24} /> : 'Add Driver'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDriverDialog;