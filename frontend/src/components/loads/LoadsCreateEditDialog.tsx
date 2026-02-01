import React, { memo, useEffect, useState } from 'react';
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
  Divider,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { CircularProgress } from '@mui/material';
import type { Load, LoadFormData } from '@/api/load.api';

const loadSchema = yup.object({
  origin: yup.object({
    name: yup.string().required('Origin name is required'),
    address: yup.string().required('Origin address is required'),
    city: yup.string().required('City is required'),
    state: yup.string().required('State is required'),
    zipCode: yup.string().required('Zip code is required'),
  }),
  destination: yup.object({
    name: yup.string().required('Destination name is required'),
    address: yup.string().required('Destination address is required'),
    city: yup.string().required('City is required'),
    state: yup.string().required('State is required'),
    zipCode: yup.string().required('Zip code is required'),
  }),
  pickupDate: yup.mixed<Date | string>().required('Pickup date is required'),
  deliveryDate: yup.mixed<Date | string>().required('Delivery date is required'),
  miles: yup.number().required('Miles is required').min(0),
  rate: yup.number().required('Rate is required').min(0),
  broker: yup.string().required('Broker is required'),
  weight: yup.number().optional(),
  commodity: yup.string().optional(),
  notes: yup.string().optional(),
});

type LoadsCreateEditDialogProps = {
  open: boolean;
  onClose: () => void;
  editingLoad: Load | null;
  onCreateLoad: (data: Record<string, unknown>) => Promise<void>;
  onUpdateLoad: (id: string, data: Record<string, unknown>) => Promise<void>;
  onSuccess: (mode: 'create' | 'update') => void;
};

export const LoadsCreateEditDialog = memo<LoadsCreateEditDialogProps>(function LoadsCreateEditDialog({
  open,
  onClose,
  editingLoad,
  onCreateLoad,
  onUpdateLoad,
  onSuccess,
}) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoadFormData>({ resolver: yupResolver(loadSchema) });

  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [cargoType, setCargoType] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [loadType, setLoadType] = useState<'FTL' | 'LTL'>('FTL');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingLoad) {
      const load = editingLoad as Record<string, unknown>;
      const pickup = load.pickupLocation ?? load.origin ?? {};
      const delivery = load.deliveryLocation ?? load.destination ?? {};
      const p = pickup as Record<string, unknown>;
      const d = delivery as Record<string, unknown>;
      setCustomerName((load.customerName as string) || '');
      setCustomerContact((load.customerContact as string) || '');
      setCargoType((load.cargoType as string) || '');
      setCargoDescription((load.cargoDescription as string) || '');
      setLoadType(((load.loadType as string) || 'FTL') as 'FTL' | 'LTL');
      setNotes((load.notes as string) || (load.internalNotes as string) || '');
      reset({
        origin: {
          name: (p.address as string) || '',
          address: (p.address as string) || '',
          city: (p.city as string) || '',
          state: (p.state as string) || '',
          zipCode: (p.pincode as string) || (p.zipCode as string) || '',
        },
        destination: {
          name: (d.address as string) || '',
          address: (d.address as string) || '',
          city: (d.city as string) || '',
          state: (d.state as string) || '',
          zipCode: (d.pincode as string) || (d.zipCode as string) || '',
        },
        pickupDate: new Date((load.pickupDate as string) || Date.now()),
        deliveryDate: new Date((load.expectedDeliveryDate as string) || (load.deliveryDate as string) || Date.now()),
        miles: (load.distance as number) || 0,
        rate: (load.rate as number) || 0,
        broker: '',
        weight: (load.weight as number) || 0,
        commodity: (load.cargoType as string) || '',
      } as LoadFormData);
    } else {
      setCustomerName('');
      setCustomerContact('');
      setCargoType('');
      setCargoDescription('');
      setLoadType('FTL');
      setNotes('');
      reset({
        origin: { name: '', address: '', city: '', state: '', zipCode: '' },
        destination: { name: '', address: '', city: '', state: '', zipCode: '' },
        pickupDate: new Date(),
        deliveryDate: new Date(Date.now() + 86400000),
        miles: 0,
        rate: 0,
        broker: '',
        weight: 0,
        commodity: '',
      } as LoadFormData);
    }
  }, [open, editingLoad, reset]);

  const onSubmit = async (data: LoadFormData) => {
    const loadData: Record<string, unknown> = {
      customerName,
      customerContact,
      customerEmail: '',
      pickupLocation: {
        address: data.origin.address,
        city: data.origin.city,
        state: data.origin.state,
        pincode: data.origin.zipCode,
      },
      deliveryLocation: {
        address: data.destination.address,
        city: data.destination.city,
        state: data.destination.state,
        pincode: data.destination.zipCode,
      },
      pickupDate: data.pickupDate instanceof Date ? data.pickupDate.toISOString() : new Date(data.pickupDate as string).toISOString(),
      expectedDeliveryDate: data.deliveryDate instanceof Date ? data.deliveryDate.toISOString() : new Date(data.deliveryDate as string).toISOString(),
      cargoType: cargoType || data.commodity || 'General',
      cargoDescription: cargoDescription || data.commodity || 'General cargo',
      weight: data.weight || 0,
      loadType: loadType,
      rate: data.rate || 0,
      distance: data.miles || 0,
      advancePaid: 0,
      fuelAdvance: 0,
      specialInstructions: '',
      notes: notes || '',
    };

    if (editingLoad) {
      await onUpdateLoad(editingLoad._id, loadData);
      onSuccess('update');
    } else {
      await onCreateLoad(loadData);
      onSuccess('create');
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editingLoad ? 'Edit Load' : 'Create New Load'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <LoadFormFields
            control={control}
            errors={errors}
            isSubmitting={isSubmitting}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerContact={customerContact}
            setCustomerContact={setCustomerContact}
            cargoType={cargoType}
            setCargoType={setCargoType}
            cargoDescription={cargoDescription}
            setCargoDescription={setCargoDescription}
            loadType={loadType}
            setLoadType={setLoadType}
            notes={notes}
            setNotes={setNotes}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting} startIcon={isSubmitting ? <CircularProgress size={16} /> : null}>
            {editingLoad ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
});

// Separate component - form fields
import type { Control, FieldErrors } from 'react-hook-form';

type LoadFormFieldsProps = {
  control: Control<LoadFormData>;
  errors: FieldErrors<LoadFormData>;
  isSubmitting: boolean;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerContact: string;
  setCustomerContact: (v: string) => void;
  cargoType: string;
  setCargoType: (v: string) => void;
  cargoDescription: string;
  setCargoDescription: (v: string) => void;
  loadType: 'FTL' | 'LTL';
  setLoadType: (v: 'FTL' | 'LTL') => void;
  notes: string;
  setNotes: (v: string) => void;
};

function LoadFormFields({
  control,
  errors,
  isSubmitting,
  customerName,
  setCustomerName,
  customerContact,
  setCustomerContact,
  cargoType,
  setCargoType,
  cargoDescription,
  setCargoDescription,
  loadType,
  setLoadType,
  notes,
  setNotes,
}: LoadFormFieldsProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Customer Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Customer Name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required fullWidth disabled={isSubmitting} error={!customerName && isSubmitting} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Customer Contact *" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} required fullWidth disabled={isSubmitting} placeholder="10 digits" inputProps={{ maxLength: 10 }} error={!customerContact && isSubmitting} />
          </Grid>
        </Grid>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Pickup Location (Origin)</Typography>
        <Grid container spacing={2}>
          {['name', 'address', 'city', 'state', 'zipCode'].map((f, i) => (
            <Grid item xs={f === 'name' || f === 'address' ? 12 : 6} sm={['city', 'state', 'zipCode'].includes(f) ? 4 : 12} key={f}>
              <Controller name={`origin.${f}` as const} control={control} render={({ field }) => (
                <TextField {...field} label={f === 'name' ? 'Shipper Name *' : f === 'zipCode' ? 'Zip *' : `${f.charAt(0).toUpperCase() + f.slice(1)} *`} error={!!(errors.origin as Record<string, { message?: string }>)?.[f]} helperText={(errors.origin as Record<string, { message?: string }>)?.[f]?.message} disabled={isSubmitting} fullWidth />
              )} />
            </Grid>
          ))}
        </Grid>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Delivery Location (Destination)</Typography>
        <Grid container spacing={2}>
          {['name', 'address', 'city', 'state', 'zipCode'].map((f) => (
            <Grid item xs={f === 'name' || f === 'address' ? 12 : 6} sm={['city', 'state', 'zipCode'].includes(f) ? 4 : 12} key={f}>
              <Controller name={`destination.${f}` as const} control={control} render={({ field }) => (
                <TextField {...field} label={f === 'name' ? 'Receiver Name *' : f === 'zipCode' ? 'Zip *' : `${f.charAt(0).toUpperCase() + f.slice(1)} *`} error={!!(errors.destination as Record<string, { message?: string }>)?.[f]} helperText={(errors.destination as Record<string, { message?: string }>)?.[f]?.message} disabled={isSubmitting} fullWidth />
              )} />
            </Grid>
          ))}
        </Grid>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Load Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller name="pickupDate" control={control} render={({ field }) => (
              <TextField {...field} label="Pickup Date *" type="date" error={!!errors.pickupDate} helperText={errors.pickupDate?.message} disabled={isSubmitting} InputLabelProps={{ shrink: true }} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value} fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller name="deliveryDate" control={control} render={({ field }) => (
              <TextField {...field} label="Delivery Date *" type="date" error={!!errors.deliveryDate} helperText={errors.deliveryDate?.message} disabled={isSubmitting} InputLabelProps={{ shrink: true }} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value} fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Controller name="miles" control={control} render={({ field }) => (
              <TextField {...field} label="Miles *" type="number" error={!!errors.miles} helperText={errors.miles?.message} disabled={isSubmitting} fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Controller name="rate" control={control} render={({ field }) => (
              <TextField {...field} label="Rate ($) *" type="number" error={!!errors.rate} helperText={errors.rate?.message} disabled={isSubmitting} fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Controller name="weight" control={control} render={({ field }) => (
              <TextField {...field} label="Weight (lbs)" type="number" disabled={isSubmitting} fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller name="broker" control={control} render={({ field }) => (
              <TextField {...field} label="Broker *" error={!!errors.broker} helperText={errors.broker?.message} disabled={isSubmitting} fullWidth />
            )} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Cargo Type *" value={cargoType} onChange={(e) => setCargoType(e.target.value)} required disabled={isSubmitting} fullWidth placeholder="e.g., Electronics, Food, Steel" error={!cargoType && isSubmitting} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField id="load-form-load-type" label="Load Type *" select value={loadType} onChange={(e) => setLoadType(e.target.value as 'FTL' | 'LTL')} required disabled={isSubmitting} fullWidth error={!loadType && isSubmitting} SelectProps={{ native: true }}>
              <option value="FTL">FTL (Full Truck Load)</option>
              <option value="LTL">LTL (Less Than Truck Load)</option>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Cargo Description *" value={cargoDescription} onChange={(e) => setCargoDescription(e.target.value)} required multiline rows={2} disabled={isSubmitting} fullWidth placeholder="Detailed description of the cargo" error={!cargoDescription && isSubmitting} />
          </Grid>
        </Grid>
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Additional Notes</Typography>
        <Divider sx={{ mb: 2 }} />
        <TextField label="Notes (Optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={4} disabled={isSubmitting} fullWidth placeholder="Add any additional notes..." helperText="Use this field to record customer communication or special requirements" />
      </Box>
    </Box>
  );
}
