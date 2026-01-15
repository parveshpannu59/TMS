import React, { useState, useEffect } from 'react';
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
  Box,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { loadApi, driverApi, truckApi } from '@api/all.api';
import type { CreateLoadData } from '../../types/all.types';
import { LoadType } from '../../types/all.types';

interface CreateLoadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateLoadDialog: React.FC<CreateLoadDialogProps> = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [availableTrucks, setAvailableTrucks] = useState<any[]>([]);

  const [formData, setFormData] = useState<CreateLoadData>({
    customerName: '',
    customerContact: '',
    customerEmail: '',
    pickupLocation: {
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    deliveryLocation: {
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    pickupDate: new Date().toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    driverId: '',
    truckId: '',
    cargoType: '',
    cargoDescription: '',
    weight: 0,
    loadType: LoadType.FTL,
    rate: 0,
    advancePaid: 0,
    fuelAdvance: 0,
    distance: 0,
    specialInstructions: '',
  });

  useEffect(() => {
    if (open) {
      fetchAvailableResources();
    }
  }, [open]);

  const fetchAvailableResources = async () => {
    try {
      const [drivers, trucks] = await Promise.all([
        driverApi.getAvailableDrivers(),
        truckApi.getAvailableTrucks(),
      ]);
      setAvailableDrivers(drivers);
      setAvailableTrucks(trucks);
    } catch (err) {
      console.error('Error fetching resources:', err);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationChange = (locationType: 'pickupLocation' | 'deliveryLocation', field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [locationType]: {
        ...prev[locationType],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      setLoading(true);
      setError(null);

      console.log('Submitting load data:', formData);

      // Validation
      if (!formData.customerName.trim()) {
        throw new Error('Customer name is required');
      }
      if (formData.customerContact.length !== 10) {
        throw new Error('Customer contact must be exactly 10 digits');
      }
      if (!formData.pickupLocation.city || !formData.deliveryLocation.city) {
        throw new Error('Pickup and delivery locations are required');
      }
      // Validate pincodes
      const pickupPincode = formData.pickupLocation.pincode?.trim() || '';
      const deliveryPincode = formData.deliveryLocation.pincode?.trim() || '';
      if (!pickupPincode || !/^[0-9]{6}$/.test(pickupPincode)) {
        throw new Error('Pickup pincode must be exactly 6 digits');
      }
      if (!deliveryPincode || !/^[0-9]{6}$/.test(deliveryPincode)) {
        throw new Error('Delivery pincode must be exactly 6 digits');
      }
      if (formData.weight <= 0) {
        throw new Error('Weight must be greater than 0');
      }
      if (formData.rate <= 0) {
        throw new Error('Rate must be greater than 0');
      }
      if (formData.distance <= 0) {
        throw new Error('Distance must be greater than 0');
      }

      // Ensure pincodes are strings with exactly 6 digits
      // Also convert empty strings to undefined for driverId and truckId
      const submitData = {
        ...formData,
        driverId: formData.driverId && formData.driverId.trim() !== '' ? formData.driverId : undefined,
        truckId: formData.truckId && formData.truckId.trim() !== '' ? formData.truckId : undefined,
        pickupLocation: {
          ...formData.pickupLocation,
          pincode: pickupPincode,
        },
        deliveryLocation: {
          ...formData.deliveryLocation,
          pincode: deliveryPincode,
        },
      };

      console.log('Submitting with data:', submitData);
      await loadApi.createLoad(submitData);
      console.log('Load created successfully');
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error creating load:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create load';
      setError(errorMessage);
      console.error('Error message:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      customerName: '',
      customerContact: '',
      customerEmail: '',
      pickupLocation: { address: '', city: '', state: '', pincode: '' },
      deliveryLocation: { address: '', city: '', state: '', pincode: '' },
      pickupDate: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
      driverId: '',
      truckId: '',
      cargoType: '',
      cargoDescription: '',
      weight: 0,
      loadType: LoadType.FTL,
      rate: 0,
      advancePaid: 0,
      fuelAdvance: 0,
      distance: 0,
      specialInstructions: '',
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          m: { xs: 0, sm: 2 },
          height: { xs: '100%', sm: 'auto' },
          maxHeight: { xs: '100%', sm: '90vh' },
        }
      }}
    >
      <DialogTitle>Create New Load</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: 1 }}>
            {/* Customer Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Customer Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Name"
                value={formData.customerName}
                onChange={(e) => handleChange('customerName', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Contact"
                value={formData.customerContact}
                onChange={(e) => handleChange('customerContact', e.target.value)}
                required
                inputProps={{ maxLength: 10 }}
                helperText="10 digits"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Email (Optional)"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleChange('customerEmail', e.target.value)}
              />
            </Grid>

            {/* Pickup Location */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Pickup Location
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pickup Address"
                value={formData.pickupLocation.address}
                onChange={(e) => handleLocationChange('pickupLocation', 'address', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.pickupLocation.city}
                onChange={(e) => handleLocationChange('pickupLocation', 'city', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={formData.pickupLocation.state}
                onChange={(e) => handleLocationChange('pickupLocation', 'state', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={formData.pickupLocation.pincode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
                  handleLocationChange('pickupLocation', 'pincode', value);
                }}
                required
                inputProps={{ maxLength: 6 }}
                helperText="6 digit pincode"
              />
            </Grid>

            {/* Delivery Location */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Delivery Location
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Delivery Address"
                value={formData.deliveryLocation.address}
                onChange={(e) => handleLocationChange('deliveryLocation', 'address', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.deliveryLocation.city}
                onChange={(e) => handleLocationChange('deliveryLocation', 'city', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={formData.deliveryLocation.state}
                onChange={(e) => handleLocationChange('deliveryLocation', 'state', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={formData.deliveryLocation.pincode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
                  handleLocationChange('deliveryLocation', 'pincode', value);
                }}
                required
                inputProps={{ maxLength: 6 }}
                helperText="6 digit pincode"
              />
            </Grid>

            {/* Dates & Assignment */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Schedule & Assignment
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Pickup Date"
                value={new Date(formData.pickupDate)}
                onChange={(date: Date | null) => handleChange('pickupDate', date?.toISOString() || '')}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Expected Delivery Date"
                value={new Date(formData.expectedDeliveryDate)}
                onChange={(date: Date | null) => handleChange('expectedDeliveryDate', date?.toISOString() || '')}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Driver (Optional)"
                value={formData.driverId}
                onChange={(e) => handleChange('driverId', e.target.value)}
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {availableDrivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.id}>
                    {driver.name} - {driver.phone}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Truck (Optional)"
                value={formData.truckId}
                onChange={(e) => handleChange('truckId', e.target.value)}
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {availableTrucks.map((truck) => (
                  <MenuItem key={truck.id} value={truck.id}>
                    {truck.truckNumber} - {truck.capacity} tons
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Cargo Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Cargo Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cargo Type"
                value={formData.cargoType}
                onChange={(e) => handleChange('cargoType', e.target.value)}
                required
                placeholder="e.g., Electronics, Food, Steel"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Load Type"
                value={formData.loadType}
                onChange={(e) => handleChange('loadType', e.target.value)}
                required
              >
                <MenuItem value={LoadType.FTL}>FTL (Full Truck Load)</MenuItem>
                <MenuItem value={LoadType.LTL}>LTL (Less Than Truck Load)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cargo Description"
                value={formData.cargoDescription}
                onChange={(e) => handleChange('cargoDescription', e.target.value)}
                required
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Weight (kg)"
                type="number"
                value={formData.weight}
                onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Distance (km)"
                type="number"
                value={formData.distance}
                onChange={(e) => handleChange('distance', parseFloat(e.target.value) || 0)}
                required
              />
            </Grid>

            {/* Financial Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Financial Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Rate (₹)"
                type="number"
                value={formData.rate}
                onChange={(e) => handleChange('rate', parseFloat(e.target.value) || 0)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Advance Paid (₹)"
                type="number"
                value={formData.advancePaid}
                onChange={(e) => handleChange('advancePaid', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Fuel Advance (₹)"
                type="number"
                value={formData.fuelAdvance}
                onChange={(e) => handleChange('fuelAdvance', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Balance Due
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  ₹{(formData.rate - (formData.advancePaid || 0)).toLocaleString()}
                </Typography>
              </Box>
            </Grid>

            {/* Special Instructions */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Special Instructions (Optional)"
                value={formData.specialInstructions}
                onChange={(e) => handleChange('specialInstructions', e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(e);
          }} 
          variant="contained" 
          disabled={loading}
          type="button"
        >
          {loading ? <CircularProgress size={24} /> : 'Create Load'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateLoadDialog;