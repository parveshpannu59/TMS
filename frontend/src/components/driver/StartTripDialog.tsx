import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Chip,
} from '@mui/material';
import { PhotoCamera, Close, CloudUpload, LocationOn, GpsFixed, AutoFixHigh } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR, extractMileage } from '@/hooks/useDocumentOCR';
import type { Load } from '@/types/all.types';

interface StartTripDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const StartTripDialog: React.FC<StartTripDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [startingMileage, setStartingMileage] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrAutoFilled, setOcrAutoFilled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analyze, analyzing: ocrAnalyzing, ocrResult, reset: resetOCR } = useDocumentOCR();

  // Location state
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const watchRef = useRef<number | null>(null);

  // Request location on dialog open — uses watchPosition for progressive accuracy improvement
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationStatus('requesting');
    setLocationError(null);
    setGpsAccuracy(null);

    // Use watchPosition to keep improving accuracy until we get a good GPS fix
    const wId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        setGpsAccuracy(acc);
        // Always update with the best position we can get
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
        setLocationError(null);

        // Stop watching once we have good accuracy (under 100m)
        if (acc <= 100 && watchRef.current !== null) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
      },
      (err) => {
        setLocationStatus('denied');
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable. Please go outside or near a window for GPS signal.');
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out. Please ensure GPS is enabled and try again.');
            break;
          default:
            setLocationError('Failed to get location.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,     // Never use cached positions
        timeout: 30000,    // Wait up to 30s for GPS fix
      }
    );
    watchRef.current = wId;
  }, []);

  useEffect(() => {
    if (open) {
      requestLocation();
    }
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [open, requestLocation]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Photo size should be less than 10MB');
        return;
      }
      setPhoto(file);
      setOcrAutoFilled(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-analyze with OCR to extract mileage
      try {
        const result = await analyze(file);
        if (result) {
          // Try to extract mileage from OCR text
          const mileage = extractMileage(result.rawText);
          if (mileage && !startingMileage) {
            setStartingMileage(String(mileage));
            setOcrAutoFilled(true);
          }
        }
      } catch { /* OCR failure is non-critical */ }
    }
  };

  const handleSubmit = async () => {
    if (!startingMileage || !photo) {
      setError('Please enter starting mileage and upload odometer photo');
      return;
    }

    if (locationStatus !== 'granted') {
      setError('Location access is required to start the trip. Please enable location.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const photoUrl = await loadApi.uploadLoadDocument(load.id, photo);

      await loadApi.startTrip(load.id, {
        startingMileage: parseInt(startingMileage),
        startingPhoto: photoUrl,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStartingMileage('');
    setPhoto(null);
    setPhotoPreview(null);
    setError(null);
    setOcrAutoFilled(false);
    setLocationStatus('idle');
    setCoords(null);
    setLocationError(null);
    resetOCR();
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
          <Typography variant="h6">Start Trip - {load.loadNumber}</Typography>
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>

          {/* Step 1: Location Access */}
          <Box sx={{
            border: `2px solid ${locationStatus === 'granted' ? '#22c55e' : locationStatus === 'denied' ? '#ef4444' : theme.palette.divider}`,
            borderRadius: 2,
            p: 2,
            bgcolor: locationStatus === 'granted' ? 'rgba(34,197,94,0.06)' : locationStatus === 'denied' ? 'rgba(239,68,68,0.06)' : 'background.default',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <GpsFixed sx={{ color: locationStatus === 'granted' ? '#22c55e' : locationStatus === 'denied' ? '#ef4444' : 'text.secondary' }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Step 1: Enable Location Tracking
              </Typography>
              {locationStatus === 'granted' && (
                <Chip label="ENABLED" size="small" sx={{ bgcolor: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 10 }} />
              )}
            </Box>

            {locationStatus === 'requesting' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">Acquiring GPS signal — please wait...</Typography>
              </Box>
            )}

            {locationStatus === 'granted' && coords && (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOn sx={{ fontSize: 16, color: '#22c55e' }} />
                  <Typography variant="body2" color="text.secondary">
                    GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </Typography>
                </Box>
                {gpsAccuracy !== null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      bgcolor: gpsAccuracy <= 50 ? '#22c55e' : gpsAccuracy <= 150 ? '#f59e0b' : '#ef4444',
                    }} />
                    <Typography variant="caption" color={gpsAccuracy <= 50 ? 'success.main' : gpsAccuracy <= 150 ? 'warning.main' : 'error.main'}>
                      Accuracy: {gpsAccuracy.toFixed(0)}m — {gpsAccuracy <= 50 ? 'Excellent' : gpsAccuracy <= 150 ? 'Good' : 'Low (move to open area for GPS fix)'}
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5 }}>
                  Location will be tracked continuously during your trip.
                </Typography>
              </Box>
            )}

            {locationStatus === 'denied' && (
              <Box sx={{ mt: 1 }}>
                {locationError && (
                  <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                    {locationError}
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<GpsFixed />}
                  onClick={requestLocation}
                >
                  Retry Location Access
                </Button>
              </Box>
            )}

            {locationStatus === 'idle' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<GpsFixed />}
                onClick={requestLocation}
                sx={{ mt: 1 }}
              >
                Grant Location Access
              </Button>
            )}
          </Box>

          {/* Step 2: Odometer */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              Step 2: Enter Starting Mileage
            </Typography>
            <TextField
              fullWidth
              label="Starting Mileage *"
              type="number"
              value={startingMileage}
              onChange={(e) => { setStartingMileage(e.target.value); setOcrAutoFilled(false); }}
              placeholder="Enter odometer reading"
              required
              inputProps={{ min: 0 }}
              helperText={
                ocrAnalyzing ? '🔍 Scanning odometer photo...' :
                ocrAutoFilled ? '✅ Auto-filled from photo — verify and edit if needed' :
                photo && ocrResult && !ocrAutoFilled ? '⚠️ Could not read mileage from photo — enter manually' :
                'Take a clear photo of the odometer, or enter manually'
              }
              InputProps={{
                endAdornment: ocrAutoFilled ? (
                  <Chip label="OCR" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" sx={{ mr: -0.5 }} />
                ) : ocrAnalyzing ? (
                  <CircularProgress size={18} />
                ) : undefined,
              }}
            />
          </Box>

          {/* Step 3: Photo */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Step 3: Upload Odometer Photo
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            <Box
              sx={{
                border: `2px dashed ${photoPreview ? '#22c55e' : theme.palette.divider}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: photoPreview ? 'rgba(34,197,94,0.06)' : 'background.default',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <Box>
                  <img
                    src={photoPreview}
                    alt="Odometer"
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 8, marginBottom: 8 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {photo?.name} ({((photo?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                    sx={{ mt: 1, display: 'block', mx: 'auto' }}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Box>
                  <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Tap to take or upload odometer photo
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max size: 10MB
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Alert severity="info" icon={<LocationOn />}>
            <Typography variant="body2" fontWeight={600}>Location tracking will start automatically</Typography>
            <Typography variant="caption">
              Your location will be tracked throughout the trip and shared with the dispatcher for real-time updates.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !startingMileage || !photo || locationStatus !== 'granted'}
          startIcon={loading ? <CircularProgress size={16} /> : <CloudUpload />}
          sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
        >
          {loading ? 'Starting Trip...' : 'Start Trip & Begin Tracking'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
