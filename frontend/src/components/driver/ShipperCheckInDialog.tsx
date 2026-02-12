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
} from '@mui/material';
import { Close, LocationOn, GpsFixed, CheckCircle, PhotoCamera, AutoFixHigh } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR } from '@/hooks/useDocumentOCR';
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

  // Step tracking: 0 = Confirm Arrival (GPS), 1 = Enter Details, 2 = Checked In
  const [activeStep, setActiveStep] = useState(0);

  const [poNumber, setPoNumber] = useState('');
  const [loadNumber, setLoadNumber] = useState(load.loadNumber || '');
  const [referenceNumber, setReferenceNumber] = useState('');
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

  // Request location on dialog open — uses watchPosition for accuracy improvement
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

        // Stop watching once accuracy is good enough
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
    // At least one identifier required
    if (!poNumber && !loadNumber && !referenceNumber) {
      setError('Please fill at least one identifier (PO, Load #, or Reference #)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await loadApi.shipperCheckIn(load.id, {
        poNumber: poNumber || undefined,
        loadNumber: loadNumber || undefined,
        referenceNumber: referenceNumber || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });

      setActiveStep(2);

      // Auto-close after showing success
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

  const handleScanDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setOcrAutoFilled(false);

    try {
      const result = await analyze(file);
      if (result) {
        let filled = false;
        const fields = result.extractedFields;

        if (fields.poNumber && !poNumber) { setPoNumber(fields.poNumber); filled = true; }
        if (fields.loadNumber && !loadNumber) { setLoadNumber(fields.loadNumber); filled = true; }
        if (fields.referenceNumber && !referenceNumber) { setReferenceNumber(fields.referenceNumber); filled = true; }

        // Also try bolNumber and proNumber as reference
        if (!referenceNumber && (fields.bolNumber || fields.proNumber)) {
          setReferenceNumber(fields.bolNumber || fields.proNumber || '');
          filled = true;
        }

        if (filled) setOcrAutoFilled(true);
      }
    } catch { /* OCR failure is non-critical */ }
  };

  const handleClose = () => {
    setPoNumber('');
    setLoadNumber(load.loadNumber || '');
    setReferenceNumber('');
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
          <Step>
            <StepLabel>Confirm Arrival</StepLabel>
          </Step>
          <Step>
            <StepLabel>Enter Details</StepLabel>
          </Step>
          <Step>
            <StepLabel>Checked In</StepLabel>
          </Step>
        </Stepper>

        {/* Step 0: Confirm Arrival with GPS */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Pickup Location */}
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
              borderRadius: 2,
              p: 2,
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

        {/* Step 1: Enter Identifiers */}
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

            {/* Scan Document Button */}
            <Box sx={{
              border: `2px dashed ${ocrAutoFilled ? '#22c55e' : theme.palette.divider}`,
              borderRadius: 2, p: 2, textAlign: 'center',
              bgcolor: ocrAutoFilled ? 'rgba(34,197,94,0.06)' : 'rgba(59,130,246,0.04)',
            }}>
              <input
                ref={scanInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={handleScanDocument}
                style={{ display: 'none' }}
              />
              <Button
                variant={ocrAutoFilled ? 'outlined' : 'contained'}
                color={ocrAutoFilled ? 'success' : 'primary'}
                startIcon={ocrAnalyzing ? <CircularProgress size={16} /> : ocrAutoFilled ? <AutoFixHigh /> : <PhotoCamera />}
                disabled={ocrAnalyzing}
                onClick={() => scanInputRef.current?.click()}
                sx={{ mb: 1 }}
              >
                {ocrAnalyzing ? 'Scanning Document...' : ocrAutoFilled ? 'Scan Again' : 'Scan PO / Gate Pass'}
              </Button>
              <Typography variant="caption" color="text.secondary" display="block">
                {ocrAutoFilled
                  ? '✅ Details auto-filled — verify and edit below'
                  : 'Take a photo of PO slip, gate pass, or any document to auto-fill'}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Enter at least one identifier to complete check-in. Load Number is pre-filled.
            </Typography>

            <TextField
              id="shipper-checkin-load"
              fullWidth
              label="Load Number"
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value)}
              placeholder="Enter load number"
              helperText="Pre-filled from load details"
            />
            <TextField
              id="shipper-checkin-po"
              fullWidth
              label="PO Number"
              value={poNumber}
              onChange={(e) => { setPoNumber(e.target.value); setOcrAutoFilled(false); }}
              placeholder="Enter Purchase Order number (optional)"
              InputProps={{
                endAdornment: ocrAutoFilled && poNumber ? (
                  <Chip label="OCR" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" />
                ) : undefined,
              }}
            />
            <TextField
              id="shipper-checkin-reference"
              fullWidth
              label="Reference Number"
              value={referenceNumber}
              onChange={(e) => { setReferenceNumber(e.target.value); setOcrAutoFilled(false); }}
              placeholder="Enter reference number (optional)"
              InputProps={{
                endAdornment: ocrAutoFilled && referenceNumber ? (
                  <Chip label="OCR" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" />
                ) : undefined,
              }}
            />
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
              disabled={loading || (!poNumber && !loadNumber && !referenceNumber)}
              sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
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
