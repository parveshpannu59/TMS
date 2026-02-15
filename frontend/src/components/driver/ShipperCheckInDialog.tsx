import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
} from '@mui/material';
import { Close, LocationOn, GpsFixed, CheckCircle, PhotoCamera, AutoFixHigh } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR, extractAmount } from '@/hooks/useDocumentOCR';
import type { Load } from '@/types/all.types';

interface ShipperCheckInDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const ShipperCheckInDialog: React.FC<ShipperCheckInDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Step tracking: 0 = Confirm Arrival (GPS), 1 = Late Pass Details, 2 = Checked In
  const [activeStep, setActiveStep] = useState(0);

  // Late pass fields
  const [latePassAmount, setLatePassAmount] = useState('');
  const [latePassPhoto, setLatePassPhoto] = useState<File | null>(null);
  const [latePassPreview, setLatePassPreview] = useState<string | null>(null);
  const [hasLatePass, setHasLatePass] = useState<boolean | null>(null); // null = not yet decided

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrAutoFilled, setOcrAutoFilled] = useState(false);
  const { analyze, analyzing: ocrAnalyzing, reset: resetOCR } = useDocumentOCR();
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Location state
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const watchRef = useRef<number | null>(null);

  // Request location on dialog open
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setLocationError('Geolocation not supported');
      return;
    }

    setLocationStatus('requesting');
    setLocationError(null);
    setGpsAccuracy(null);

    const wId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        setGpsAccuracy(acc);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
        setLocationError(null);

        if (acc <= 100 && watchRef.current !== null) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
      },
      (err) => {
        setLocationStatus('denied');
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable it.');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable. Go outside for GPS signal.');
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out. Ensure GPS is enabled.');
            break;
          default:
            setLocationError('Failed to get location.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
    watchRef.current = wId;
  }, []);

  useEffect(() => {
    if (open) {
      requestLocation();
      setActiveStep(0);
      setCheckInTime(null);
      setHasLatePass(null);
    }
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [open, requestLocation]);

  const handleConfirmArrival = () => {
    if (locationStatus !== 'granted') {
      setError('Please enable location to confirm arrival');
      return;
    }
    setCheckInTime(new Date());
    setActiveStep(1);
  };

  const handleSubmit = async () => {
    // If late pass, amount is required
    if (hasLatePass && (!latePassAmount || parseFloat(latePassAmount) <= 0)) {
      setError('Please enter the late pass amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload late pass photo if provided
      let latePassPhotoUrl: string | undefined;
      if (latePassPhoto) {
        try {
          latePassPhotoUrl = await loadApi.uploadLoadDocument(load.id, latePassPhoto);
        } catch { /* non-critical */ }
      }

      await loadApi.shipperCheckIn(load.id, {
        latitude: coords?.lat,
        longitude: coords?.lng,
        latePassAmount: hasLatePass ? parseFloat(latePassAmount) || 0 : 0,
        latePassPhoto: latePassPhotoUrl,
        hasLatePass: !!hasLatePass,
      } as any);

      setActiveStep(2);

      // Auto-close after success
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to check in at shipper');
    } finally {
      setLoading(false);
    }
  };

  const handleScanLatePass = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setOcrAutoFilled(false);
    setLatePassPhoto(file);

    // Preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setLatePassPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLatePassPreview(null);
    }

    // OCR to extract amount
    try {
      const result = await analyze(file);
      if (result) {
        const amt = extractAmount(result.rawText);
        if (amt && amt > 0) {
          setLatePassAmount(String(amt));
          setOcrAutoFilled(true);
        }
      }
    } catch { /* OCR failure is non-critical */ }
  };

  const handleClose = () => {
    setLatePassAmount('');
    setLatePassPhoto(null);
    setLatePassPreview(null);
    setHasLatePass(null);
    setError(null);
    setActiveStep(0);
    setLocationStatus('idle');
    setCoords(null);
    setLocationError(null);
    setCheckInTime(null);
    setOcrAutoFilled(false);
    resetOCR();
    onClose();
  };

  const pickup = (load as any)?.pickupLocation;

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
          <Typography variant="h6" fontWeight={700}>
            {activeStep === 2 ? 'Checked In!' : 'Arrive at Pickup'}
          </Typography>
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

        {/* Progress Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          <Step><StepLabel>Confirm Arrival</StepLabel></Step>
          <Step><StepLabel>Late Pass</StepLabel></Step>
          <Step><StepLabel>Checked In</StepLabel></Step>
        </Stepper>

        {/* Step 0: Confirm Arrival with GPS */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pickup && (
              <Box sx={{ bgcolor: 'rgba(239,68,68,0.06)', borderRadius: 2, p: 2 }}>
                <Typography variant="caption" fontWeight={700} color="error">PICKUP LOCATION</Typography>
                <Typography variant="body1" fontWeight={700}>{pickup.city || 'Pickup'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {pickup.address || [pickup.city, pickup.state].filter(Boolean).join(', ') || '—'}
                </Typography>
              </Box>
            )}

            {/* GPS Location Card */}
            <Box sx={{
              border: `2px solid ${locationStatus === 'granted' ? '#22c55e' : locationStatus === 'denied' ? '#ef4444' : theme.palette.divider}`,
              borderRadius: 2, p: 2,
              bgcolor: locationStatus === 'granted' ? 'rgba(34,197,94,0.06)' : undefined,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <GpsFixed sx={{ color: locationStatus === 'granted' ? '#22c55e' : 'text.secondary' }} />
                <Typography variant="subtitle2" fontWeight={700}>Your Current Location</Typography>
                {locationStatus === 'granted' && (
                  <Chip label="LOCATED" size="small" sx={{ bgcolor: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 10 }} />
                )}
              </Box>

              {locationStatus === 'requesting' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">Acquiring GPS signal...</Typography>
                </Box>
              )}

              {locationStatus === 'granted' && coords && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOn sx={{ fontSize: 16, color: '#22c55e' }} />
                    <Typography variant="body2" color="text.secondary">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </Typography>
                  </Box>
                  {gpsAccuracy !== null && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: gpsAccuracy <= 50 ? '#22c55e' : gpsAccuracy <= 150 ? '#f59e0b' : '#ef4444',
                      }} />
                      <Typography variant="caption" color={gpsAccuracy <= 50 ? 'success.main' : gpsAccuracy <= 150 ? 'warning.main' : 'error.main'}>
                        Accuracy: {gpsAccuracy.toFixed(0)}m — {gpsAccuracy <= 50 ? 'Excellent' : gpsAccuracy <= 150 ? 'Good' : 'Low accuracy — move outdoors'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {locationStatus === 'denied' && (
                <Box>
                  <Typography variant="body2" color="error" sx={{ mb: 1 }}>{locationError}</Typography>
                  <Button size="small" variant="outlined" color="error" onClick={requestLocation} startIcon={<GpsFixed />}>
                    Retry
                  </Button>
                </Box>
              )}
            </Box>

            <Alert severity="info">
              <Typography variant="body2">
                Confirm that you have arrived at the pickup location. Your GPS coordinates will be recorded.
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Step 1: Late Pass */}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="success" icon={<CheckCircle />}>
              <Typography variant="body2" fontWeight={600}>
                Arrival confirmed at {checkInTime?.toLocaleTimeString()}
              </Typography>
              {coords && (
                <Typography variant="caption" color="text.secondary">
                  Location: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </Typography>
              )}
            </Alert>

            {/* Ask if there's a late pass */}
            {hasLatePass === null && (
              <Box sx={{
                p: 2.5, borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: 'rgba(245,158,11,0.04)',
                textAlign: 'center',
              }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                  Did you receive a Late Pass?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  A late pass is issued when you arrive late at the pickup. It has a penalty amount.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => setHasLatePass(true)}
                    sx={{ fontWeight: 700, px: 3, borderRadius: 2 }}
                  >
                    Yes, I have a Late Pass
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setHasLatePass(false)}
                    sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
                  >
                    No Late Pass
                  </Button>
                </Box>
              </Box>
            )}

            {/* Late Pass Details */}
            {hasLatePass === true && (
              <Box sx={{
                p: 2, borderRadius: 3,
                border: `2px solid rgba(245,158,11,0.4)`,
                bgcolor: 'rgba(245,158,11,0.04)',
              }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#d97706' }}>
                  Late Pass Details
                </Typography>

                {/* Scan Late Pass */}
                <Box sx={{
                  border: `2px dashed ${latePassPhoto ? '#22c55e' : 'rgba(245,158,11,0.4)'}`,
                  borderRadius: 2, p: 2, textAlign: 'center', mb: 2,
                  bgcolor: latePassPhoto ? 'rgba(34,197,94,0.04)' : 'transparent',
                }}>
                  <input
                    ref={scanInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={handleScanLatePass}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant={latePassPhoto ? 'outlined' : 'contained'}
                    color={latePassPhoto ? 'success' : 'warning'}
                    startIcon={ocrAnalyzing ? <CircularProgress size={16} /> : latePassPhoto ? <AutoFixHigh /> : <PhotoCamera />}
                    disabled={ocrAnalyzing}
                    onClick={() => scanInputRef.current?.click()}
                    sx={{ mb: 1, fontWeight: 700 }}
                  >
                    {ocrAnalyzing ? 'Reading Late Pass...' : latePassPhoto ? 'Scan Again' : 'Scan Late Pass'}
                  </Button>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {latePassPhoto
                      ? ocrAutoFilled
                        ? 'Amount auto-detected from late pass — verify below'
                        : 'Late pass photo attached — enter amount below'
                      : 'Take a photo of the late pass to auto-detect the amount'}
                  </Typography>
                </Box>

                {/* Late Pass Preview */}
                {latePassPreview && (
                  <Box sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 140, mb: 2 }}>
                    <img src={latePassPreview} alt="Late Pass" style={{ width: '100%', maxHeight: 140, objectFit: 'cover' }} />
                  </Box>
                )}

                {/* Amount Field */}
                <TextField
                  fullWidth size="small"
                  label="Late Pass Amount *"
                  type="number"
                  value={latePassAmount}
                  onChange={(e) => { setLatePassAmount(e.target.value); setOcrAutoFilled(false); }}
                  placeholder="Enter penalty amount"
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    endAdornment: ocrAutoFilled ? (
                      <Chip label="OCR" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" sx={{ height: 24 }} />
                    ) : undefined,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText={ocrAutoFilled ? 'Auto-detected from scanned late pass — please verify' : 'Enter the amount shown on the late pass'}
                />

                {/* Option to go back */}
                <Button
                  size="small"
                  sx={{ mt: 1, color: 'text.secondary', textTransform: 'none' }}
                  onClick={() => {
                    setHasLatePass(null);
                    setLatePassAmount('');
                    setLatePassPhoto(null);
                    setLatePassPreview(null);
                    setOcrAutoFilled(false);
                  }}
                >
                  No late pass? Go back
                </Button>
              </Box>
            )}

            {/* No Late Pass — just confirm */}
            {hasLatePass === false && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  No late pass — you can proceed to complete check-in.
                </Typography>
                <Button
                  size="small"
                  sx={{ mt: 0.5, textTransform: 'none', p: 0 }}
                  onClick={() => setHasLatePass(null)}
                >
                  Actually, I have one
                </Button>
              </Alert>
            )}
          </Box>
        )}

        {/* Step 2: Success */}
        {activeStep === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
            <CheckCircle sx={{ fontSize: 80, color: '#22c55e' }} />
            <Typography variant="h5" fontWeight={700} color="success.main">
              CHECKED IN
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              You have successfully checked in at the pickup location.
            </Typography>
            {checkInTime && (
              <Chip
                icon={<LocationOn />}
                label={`Checked in at ${checkInTime.toLocaleTimeString()}`}
                variant="outlined"
                color="success"
              />
            )}
            {hasLatePass && parseFloat(latePassAmount) > 0 && (
              <Chip
                label={`Late Pass: $${parseFloat(latePassAmount).toFixed(2)}`}
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            )}
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
              Next step: Confirm when loading is complete
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        {activeStep === 0 && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleConfirmArrival}
              disabled={locationStatus !== 'granted'}
              startIcon={<LocationOn />}
              sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
            >
              Confirm Arrival
            </Button>
          </>
        )}

        {activeStep === 1 && (
          <>
            <Button onClick={() => setActiveStep(0)} disabled={loading}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || hasLatePass === null || (hasLatePass && (!latePassAmount || parseFloat(latePassAmount) <= 0))}
              sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={16} /> : 'Complete Check-In'}
            </Button>
          </>
        )}

        {activeStep === 2 && (
          <Button onClick={handleClose} variant="contained" color="success">
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
