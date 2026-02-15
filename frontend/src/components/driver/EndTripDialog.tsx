import React, { useState, useEffect, useCallback } from 'react';
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
  alpha,
  Grid,
  Divider,
} from '@mui/material';
import {
  Close,
  PhotoCamera,
  CloudUpload,
  CheckCircle,
  Delete as DeleteIcon,
  Flag,
  AutoFixHigh,
  LocationOn,
  CalendarToday,
} from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR, extractMileage } from '@/hooks/useDocumentOCR';
import type { Load } from '@/types/all.types';

interface EndTripDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
  loadExpenses?: { summary: { fuel: number; tolls: number; other: number } } | null;
}

export const EndTripDialog: React.FC<EndTripDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [endingMileage, setEndingMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
  const [odometerPreview, setOdometerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrAutoFilled, setOcrAutoFilled] = useState(false);

  // ─── Drop-off Details (filled at end trip) ───
  const [dropoffReferenceNumber, setDropoffReferenceNumber] = useState('');
  const [dropoffTime, setDropoffTime] = useState('');
  const [dropoffDate, setDropoffDate] = useState(new Date().toISOString().split('T')[0]);
  const [dropoffLocation, setDropoffLocation] = useState(() => {
    const loc = load.deliveryLocation as any;
    if (!loc) return '';
    if (loc.city && loc.city.trim()) return `${loc.city}, ${loc.state || ''}`.replace(/,\s*$/, '');
    if (loc.address && loc.address.trim()) return loc.address;
    return '';
  });
  const [dropoffPlace, setDropoffPlace] = useState(
    (load.deliveryLocation as any)?.address || (load.deliveryLocation as any)?.name || ''
  );

  const { analyze, analyzing: ocrAnalyzing, reset: resetOCR } = useDocumentOCR();

  const startingMileage = load.tripStartDetails?.startingMileage || 0;

  // Auto-calculate total miles
  const endMiles = parseInt(endingMileage) || 0;
  const totalMiles = endMiles > startingMileage ? endMiles - startingMileage : 0;

  // Reset only when dialog is first opened (not on every load reference change)
  const prevOpenRef = React.useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened — reset everything
      setEndingMileage('');
      setNotes('');
      setOdometerPhoto(null);
      setOdometerPreview(null);
      setOcrAutoFilled(false);
      setDropoffReferenceNumber('');
      setDropoffTime('');
      setDropoffDate(new Date().toISOString().split('T')[0]);
      const loc = load.deliveryLocation as any;
      setDropoffLocation(
        loc?.city && loc.city.trim() ? `${loc.city}, ${loc.state || ''}`.replace(/,\s*$/, '')
        : loc?.address && loc.address.trim() ? loc.address : ''
      );
      setDropoffPlace(loc?.address || loc?.name || '');
      resetOCR();
    }
    prevOpenRef.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─── Odometer scan with OCR ───────────────────────────
  const handleOdometerPhoto = useCallback(async (file: File | null) => {
    setOdometerPhoto(file);
    setOcrAutoFilled(false);
    if (!file) { setOdometerPreview(null); return; }

    // Preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setOdometerPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else { setOdometerPreview(null); }

    // OCR to extract mileage
    try {
      const result = await analyze(file);
      if (result) {
        const ml = extractMileage(result.rawText);
        if (ml && !endingMileage) {
          setEndingMileage(String(ml));
          setOcrAutoFilled(true);
        }
      }
    } catch { /* non-critical */ }
  }, [analyze, endingMileage]);

  // ─── Submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!endingMileage) {
      setError('Please enter or scan the ending mileage');
      return;
    }
    if (endMiles < startingMileage) {
      setError('Ending mileage cannot be less than starting mileage');
      return;
    }
    if (!dropoffReferenceNumber || !dropoffTime || !dropoffDate || !dropoffLocation) {
      setError('Please fill in all drop-off details');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let endingPhotoUrl: string | undefined;
      if (odometerPhoto) {
        endingPhotoUrl = await loadApi.uploadLoadDocument(load.id, odometerPhoto);
      }

      // GPS
      let gps: { latitude?: number; longitude?: number } = {};
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 })
        );
        if (pos.coords.accuracy <= 200) {
          gps = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } catch { /* ignore */ }

      // Update drop-off details on the load's driverFormDetails first
      try {
        await loadApi.submitDriverForm(load.id, {
          loadNumber: load.loadNumber || '',
          pickupReferenceNumber: (load as any).driverFormDetails?.pickupReferenceNumber || '',
          pickupTime: (load as any).driverFormDetails?.pickupTime || '',
          pickupPlace: (load as any).driverFormDetails?.pickupPlace || '',
          pickupDate: (load as any).driverFormDetails?.pickupDate
            ? new Date((load as any).driverFormDetails.pickupDate).toISOString().split('T')[0]
            : '',
          pickupLocation: (load as any).driverFormDetails?.pickupLocation || '',
          dropoffReferenceNumber,
          dropoffTime,
          dropoffLocation,
          dropoffDate,
          dropoffPlace,
        });
      } catch { /* non-critical — proceed with end trip */ }

      await loadApi.endTrip(load.id, {
        endingMileage: endMiles,
        totalMiles,
        rate: load?.rate || 0,
        fuelExpenses: 0,
        tolls: 0,
        otherCosts: 0,
        additionalExpenseDetails: notes || undefined,
        endingPhoto: endingPhotoUrl,
        ...gps,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to end trip');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEndingMileage('');
    setNotes('');
    setOdometerPhoto(null);
    setOdometerPreview(null);
    setError(null);
    setOcrAutoFilled(false);
    setDropoffReferenceNumber('');
    setDropoffTime('');
    setDropoffDate(new Date().toISOString().split('T')[0]);
    setDropoffLocation('');
    setDropoffPlace('');
    resetOCR();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      {/* Title */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Flag sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>End Trip</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

          {/* ── 1. Scan / Upload Odometer ── */}
          <Box sx={{
            p: 2, borderRadius: 3,
            border: `2px dashed ${odometerPhoto ? alpha('#10b981', 0.5) : alpha('#3b82f6', 0.3)}`,
            background: odometerPhoto ? alpha('#10b981', 0.04) : alpha('#3b82f6', 0.02),
            transition: 'all 0.2s',
          }}>
            {!odometerPhoto ? (
              <>
                <Button
                  variant="contained" component="label" fullWidth
                  startIcon={ocrAnalyzing ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera />}
                  disabled={ocrAnalyzing}
                  sx={{
                    py: 2, borderRadius: 2.5, fontSize: '0.95rem', fontWeight: 700,
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                    '&:hover': { background: 'linear-gradient(135deg, #2563eb, #4f46e5)' },
                  }}
                >
                  {ocrAnalyzing ? 'Reading Odometer...' : 'Scan Odometer Reading'}
                  <input type="file" hidden accept="image/*" capture="environment"
                    onChange={(e) => handleOdometerPhoto(e.target.files?.[0] || null)} />
                </Button>
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Button component="label" size="small"
                    sx={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'none', '&:hover': { color: '#3b82f6', background: 'transparent' } }}
                    startIcon={<CloudUpload sx={{ fontSize: 14 }} />}
                  >
                    or upload from gallery
                    <input type="file" hidden accept="image/*"
                      onChange={(e) => handleOdometerPhoto(e.target.files?.[0] || null)} />
                  </Button>
                </Box>
              </>
            ) : (
              <Box>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1, mb: odometerPreview ? 1 : 0,
                  p: 1, borderRadius: 2, bgcolor: alpha('#10b981', 0.06),
                }}>
                  <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} color="#059669">Odometer Photo Attached</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {odometerPhoto.name} ({(odometerPhoto.size / 1024).toFixed(0)} KB)
                    </Typography>
                  </Box>
                  <Button component="label" size="small" variant="outlined"
                    sx={{ minWidth: 'auto', px: 1.5, fontSize: '0.7rem', borderColor: alpha('#64748b', 0.3), color: '#64748b' }}
                    startIcon={<PhotoCamera sx={{ fontSize: 14 }} />}
                  >
                    Retake
                    <input type="file" hidden accept="image/*" capture="environment"
                      onChange={(e) => handleOdometerPhoto(e.target.files?.[0] || null)} />
                  </Button>
                  <IconButton size="small" onClick={() => { setOdometerPhoto(null); setOdometerPreview(null); setOcrAutoFilled(false); }}>
                    <DeleteIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                  </IconButton>
                </Box>
                {odometerPreview && (
                  <Box sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 140 }}>
                    <img src={odometerPreview} alt="Odometer" style={{ width: '100%', maxHeight: 140, objectFit: 'cover' }} />
                  </Box>
                )}
                {ocrAnalyzing && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1, borderRadius: 2, bgcolor: alpha('#3b82f6', 0.05) }}>
                    <CircularProgress size={14} />
                    <Typography variant="caption" color="text.secondary">Reading odometer value...</Typography>
                  </Box>
                )}
                {ocrAutoFilled && !ocrAnalyzing && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip label="Auto-filled" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                    <Typography variant="caption" color="success.main">Ending mileage detected — verify below</Typography>
                  </Box>
                )}
                {odometerPhoto && !ocrAnalyzing && !ocrAutoFilled && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Photo saved. Enter the ending mileage manually below.
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* ── 2. Mileage Information ── */}
          <Box sx={{
            p: 2, borderRadius: 3,
            border: `1px solid ${alpha('#e2e8f0', 0.8)}`,
            background: alpha('#f8fafc', 0.5),
          }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Mileage Information
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
              {/* Starting (read-only) */}
              <TextField
                fullWidth size="small"
                label="Starting Mileage"
                value={startingMileage.toLocaleString()}
                disabled
                helperText="Recorded at trip start"
              />
              {/* Ending (editable) */}
              <TextField
                fullWidth size="small"
                label="Ending Mileage *"
                type="number"
                value={endingMileage}
                onChange={(e) => { setEndingMileage(e.target.value); setOcrAutoFilled(false); }}
                required
                inputProps={{ min: startingMileage }}
                InputProps={{
                  endAdornment: ocrAutoFilled ? (
                    <Chip label="OCR" size="small" sx={{ height: 20, fontSize: '0.65rem' }} color="success" variant="outlined" />
                  ) : undefined,
                }}
              />
            </Box>

            {/* Auto-calculated total */}
            {totalMiles > 0 && (
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                p: 1.5, borderRadius: 2,
                background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.06))',
                border: `1px solid ${alpha('#3b82f6', 0.15)}`,
              }}>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  Total Miles Driven
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {totalMiles.toLocaleString()} mi
                </Typography>
              </Box>
            )}

            {endMiles > 0 && endMiles < startingMileage && (
              <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                Ending mileage cannot be less than starting mileage
              </Alert>
            )}
          </Box>

          <Divider />

          {/* ── 3. Drop-off Details ── */}
          <Box sx={{
            p: 2, borderRadius: 3,
            border: `1px solid ${alpha('#10b981', 0.3)}`,
            background: alpha('#10b981', 0.02),
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <LocationOn sx={{ color: '#10b981', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={700}>Drop-off Details</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Reference Number */}
              <TextField
                fullWidth size="small"
                label="Reference Number *"
                value={dropoffReferenceNumber}
                onChange={(e) => setDropoffReferenceNumber(e.target.value)}
                placeholder="Drop-off reference / PO number"
                required
              />

              {/* Date + Time row */}
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small"
                    label="Drop-off Date *"
                    type="date"
                    value={dropoffDate}
                    onChange={(e) => setDropoffDate(e.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <CalendarToday sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} /> }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size="small"
                    label="Drop-off Time *"
                    type="time"
                    value={dropoffTime}
                    onChange={(e) => setDropoffTime(e.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              {/* Drop-off Place */}
              <TextField
                fullWidth size="small"
                label="Drop-off Place *"
                value={dropoffPlace}
                onChange={(e) => setDropoffPlace(e.target.value)}
                placeholder="Receiver name or address"
                required
              />

              {/* Drop-off Location */}
              <TextField
                fullWidth size="small"
                label="Drop-off Location (City, State) *"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="City, State"
                required
                InputProps={{ startAdornment: <LocationOn sx={{ mr: 0.5, color: '#10b981', fontSize: 20 }} /> }}
              />
            </Box>
          </Box>

          {/* ── 4. Additional Notes ── */}
          <TextField
            fullWidth multiline rows={2} size="small"
            label="Additional Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about the trip ending"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained" color="error"
          onClick={handleSubmit}
          disabled={loading || !endingMileage || endMiles < startingMileage || !dropoffReferenceNumber || !dropoffTime || !dropoffDate || !dropoffLocation}
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            '&:hover': { background: 'linear-gradient(135deg, #dc2626, #b91c1c)' },
          }}
        >
          {loading ? <CircularProgress size={16} /> : 'End Trip'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
