import React, { useState, useRef } from 'react';
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
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { 
  PhotoCamera, 
  Close, 
  CloudUpload, 
  DirectionsCar,
  AttachMoney,
  Route,
} from '@mui/icons-material';
import type { Load } from '@/types/all.types';
import type { StartTripData } from '@/types/trip.types';

interface EnhancedStartTripDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  assignmentId: string;
  onSubmit: (data: StartTripData) => Promise<void>;
}

export const EnhancedStartTripDialog: React.FC<EnhancedStartTripDialogProps> = ({
  open,
  onClose,
  load,
  assignmentId,
  onSubmit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [startingMileage, setStartingMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Photo size should be less than 10MB');
        return;
      }
      
      // Validate image type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!startingMileage || !photo) {
      setError('Please enter starting mileage and upload odometer photo');
      return;
    }

    const mileage = parseInt(startingMileage);
    if (isNaN(mileage) || mileage < 0) {
      setError('Please enter a valid mileage value');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tripData: StartTripData = {
        loadId: load.id,
        assignmentId,
        startingMileage: mileage,
        odometerStartPhoto: photo,
        notes: notes.trim() || undefined,
      };

      await onSubmit(tripData);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStartingMileage('');
      setNotes('');
      setPhoto(null);
      setPhotoPreview(null);
      setError(null);
      onClose();
    }
  };

  // Calculate estimated earnings
  const estimatedEarnings = load.rate && (load.distance || (load as any).miles)
    ? (load.rate * (load.distance || (load as any).miles)).toFixed(2)
    : 'N/A';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <DirectionsCar color="primary" />
            <Typography variant="h6">Start Trip</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={loading}>
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

        {/* Trip Summary Card */}
        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'primary.light', borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="subtitle2" color="primary.dark" gutterBottom>
              Trip Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Load Number
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {load.loadNumber || `LOAD-${load.id?.substring(0, 8)}`}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Distance
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {load.distance || (load as any).miles || 'N/A'} miles
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Rate/Mile
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ${load.rate || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Est. Earnings
                </Typography>
                <Typography variant="body2" fontWeight={600} color="success.dark">
                  ${estimatedEarnings}
                </Typography>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 1.5 }} />
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                Route
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Route fontSize="small" />
                <Typography variant="body2">
                  {typeof load.pickupLocation === 'string' 
                    ? load.pickupLocation 
                    : (load.pickupLocation as any)?.address || 'N/A'} → {typeof load.deliveryLocation === 'string'
                    ? load.deliveryLocation
                    : (load.deliveryLocation as any)?.address || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Trip Start Form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Starting Mileage */}
          <TextField
            fullWidth
            label="Starting Odometer Mileage *"
            type="number"
            value={startingMileage}
            onChange={(e) => setStartingMileage(e.target.value)}
            placeholder="Enter current odometer reading"
            required
            disabled={loading}
            inputProps={{ min: 0, step: 1 }}
            helperText="Enter the exact mileage shown on your odometer"
          />

          {/* Odometer Photo Upload */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Upload Odometer Photo * <Typography component="span" variant="caption" color="error">(Required)</Typography>
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
              disabled={loading}
            />
            <Box
              sx={{
                border: `2px dashed ${photoPreview ? theme.palette.success.main : theme.palette.divider}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
                bgcolor: photoPreview ? 'success.light' : 'background.default',
                '&:hover': {
                  bgcolor: loading ? undefined : (photoPreview ? 'success.light' : 'action.hover'),
                },
              }}
              onClick={() => !loading && fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <Box>
                  <img
                    src={photoPreview}
                    alt="Odometer"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  />
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                    {photo?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {((photo?.size || 0) / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhoto(null);
                        setPhotoPreview(null);
                      }}
                      disabled={loading}
                    >
                      Change Photo
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <PhotoCamera sx={{ fontSize: 64, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    Take or Upload Odometer Photo
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Make sure the mileage is clearly visible
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max size: 10MB • Supported formats: JPG, PNG
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Notes/Special Instructions */}
          <TextField
            fullWidth
            label="Notes (Optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or observations before starting the trip..."
            disabled={loading}
          />

          {/* Important Notice */}
          <Alert severity="info" icon={<AttachMoney />}>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Pay-Per-Mile System
            </Typography>
            <Typography variant="caption">
              You will be paid <strong>${load.rate || 'N/A'} per mile</strong>. 
              Make sure to enter accurate mileage and keep all receipts for expenses.
            </Typography>
          </Alert>

          <Alert severity="warning">
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Before Starting Trip:
            </Typography>
            <Typography variant="caption" component="div">
              ✓ Verify the odometer reading is correct<br />
              ✓ Ensure the photo clearly shows the mileage<br />
              ✓ Check that you have all necessary documents<br />
              ✓ Confirm vehicle inspection is complete
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !startingMileage || !photo}
          startIcon={loading ? <CircularProgress size={20} /> : <DirectionsCar />}
        >
          {loading ? 'Starting Trip...' : 'Start Trip'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
