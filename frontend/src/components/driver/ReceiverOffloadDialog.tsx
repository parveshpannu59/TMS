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
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Close,
  PhotoCamera,
  CloudUpload,
  CheckCircle,
  Description,
  Delete as DeleteIcon,
  LocalShipping,
} from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

interface ReceiverOffloadDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
  initialPodPhoto?: File | null;
}

export const ReceiverOffloadDialog: React.FC<ReceiverOffloadDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
  initialPodPhoto,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [bolAcknowledged, setBolAcknowledged] = useState(false);
  const [podFile, setPodFile] = useState<File | null>(null);
  const [podPhoto, setPodPhoto] = useState<File | null>(null);
  const [podPhotoPreview, setPodPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accept pre-captured POD photo
  useEffect(() => {
    if (open && initialPodPhoto) {
      setPodPhoto(initialPodPhoto);
      const reader = new FileReader();
      reader.onloadend = () => setPodPhotoPreview(reader.result as string);
      reader.readAsDataURL(initialPodPhoto);
    }
  }, [open, initialPodPhoto]);

  const handlePodFileSelect = useCallback((file: File | null) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setError('File size should be less than 15MB'); return; }
    setPodFile(file);
  }, []);

  const handlePodPhotoSelect = useCallback((file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Photo size should be less than 10MB'); return; }
    setPodPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPodPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      let podDocumentUrl: string | undefined;
      let podPhotoUrl: string | undefined;
      if (podFile) podDocumentUrl = await loadApi.uploadLoadDocument(load.id, podFile);
      if (podPhoto) podPhotoUrl = await loadApi.uploadLoadDocument(load.id, podPhoto);

      // Capture current GPS
      let gps: { latitude?: number; longitude?: number } = {};
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 })
        );
        if (pos.coords.accuracy <= 200) {
          gps = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } catch { /* ignore GPS failure */ }

      await loadApi.receiverOffload(load.id, {
        additionalDetails,
        bolAcknowledged,
        podDocument: podDocumentUrl,
        podPhoto: podPhotoUrl,
        ...gps,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete offload');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdditionalDetails('');
    setBolAcknowledged(false);
    setPodFile(null);
    setPodPhoto(null);
    setPodPhotoPreview(null);
    setError(null);
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
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LocalShipping sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Receiver Offload</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

          {/* ── 1. Upload POD Document ── */}
          <Box sx={{
            p: 2, borderRadius: 3,
            border: `2px dashed ${podFile ? alpha('#10b981', 0.5) : alpha('#3b82f6', 0.3)}`,
            background: podFile ? alpha('#10b981', 0.04) : alpha('#3b82f6', 0.02),
            transition: 'all 0.2s',
          }}>
            {!podFile ? (
              <>
                <Button
                  variant="contained" component="label" fullWidth
                  startIcon={<Description />}
                  sx={{
                    py: 1.8, borderRadius: 2.5, fontSize: '0.9rem', fontWeight: 700,
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                    '&:hover': { background: 'linear-gradient(135deg, #2563eb, #4f46e5)' },
                  }}
                >
                  Upload POD Document
                  <input type="file" hidden accept="application/pdf,image/*"
                    onChange={(e) => handlePodFileSelect(e.target.files?.[0] || null)} />
                </Button>
                <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    PDF or photo of delivery document (Optional)
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                p: 1, borderRadius: 2, bgcolor: alpha('#10b981', 0.06),
              }}>
                <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} color="#059669">Document Attached</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {podFile.name} ({(podFile.size / 1024).toFixed(0)} KB)
                  </Typography>
                </Box>
                <Button component="label" size="small" variant="outlined"
                  sx={{ minWidth: 'auto', px: 1.5, fontSize: '0.7rem', borderColor: alpha('#64748b', 0.3), color: '#64748b' }}
                >
                  Replace
                  <input type="file" hidden accept="application/pdf,image/*"
                    onChange={(e) => handlePodFileSelect(e.target.files?.[0] || null)} />
                </Button>
                <IconButton size="small" onClick={() => setPodFile(null)}>
                  <DeleteIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* ── 2. Upload POD Photo ── */}
          <Box sx={{
            p: 2, borderRadius: 3,
            border: `2px dashed ${podPhoto ? alpha('#f59e0b', 0.5) : alpha('#64748b', 0.25)}`,
            background: podPhoto ? alpha('#f59e0b', 0.04) : alpha('#64748b', 0.02),
            transition: 'all 0.2s',
          }}>
            {!podPhoto ? (
              <>
                <Button
                  variant="contained" component="label" fullWidth
                  startIcon={<PhotoCamera />}
                  sx={{
                    py: 1.8, borderRadius: 2.5, fontSize: '0.9rem', fontWeight: 700,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
                    '&:hover': { background: 'linear-gradient(135deg, #d97706, #b45309)' },
                  }}
                >
                  Take POD Photo
                  <input type="file" hidden accept="image/*" capture="environment"
                    onChange={(e) => handlePodPhotoSelect(e.target.files?.[0] || null)} />
                </Button>
                <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                  <Button component="label" size="small"
                    sx={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'none', '&:hover': { color: '#f59e0b', background: 'transparent' } }}
                    startIcon={<CloudUpload sx={{ fontSize: 14 }} />}
                  >
                    or upload from gallery
                    <input type="file" hidden accept="image/*"
                      onChange={(e) => handlePodPhotoSelect(e.target.files?.[0] || null)} />
                  </Button>
                </Box>
              </>
            ) : (
              <Box>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1, mb: podPhotoPreview ? 1 : 0,
                  p: 1, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.06),
                }}>
                  <CheckCircle sx={{ color: '#f59e0b', fontSize: 20 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} color="#b45309">Photo Attached</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {podPhoto.name} ({(podPhoto.size / 1024).toFixed(0)} KB)
                    </Typography>
                  </Box>
                  <Button component="label" size="small" variant="outlined"
                    sx={{ minWidth: 'auto', px: 1.5, fontSize: '0.7rem', borderColor: alpha('#64748b', 0.3), color: '#64748b' }}
                    startIcon={<PhotoCamera sx={{ fontSize: 14 }} />}
                  >
                    Retake
                    <input type="file" hidden accept="image/*" capture="environment"
                      onChange={(e) => handlePodPhotoSelect(e.target.files?.[0] || null)} />
                  </Button>
                  <IconButton size="small" onClick={() => { setPodPhoto(null); setPodPhotoPreview(null); }}>
                    <DeleteIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                  </IconButton>
                </Box>
                {podPhotoPreview && (
                  <Box sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 140 }}>
                    <img src={podPhotoPreview} alt="POD" style={{ width: '100%', maxHeight: 140, objectFit: 'cover' }} />
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* ── 3. BOL Acknowledgement ── */}
          <FormControlLabel
            control={
              <Checkbox
                id="receiver-offload-bol-acknowledged"
                checked={bolAcknowledged}
                onChange={(e) => setBolAcknowledged(e.target.checked)}
                sx={{
                  color: '#94a3b8',
                  '&.Mui-checked': { color: '#10b981' },
                }}
              />
            }
            label={
              <Typography variant="body2" fontWeight={500}>
                I acknowledge receipt of the Bill of Lading (BOL)
              </Typography>
            }
            sx={{
              mx: 0, p: 1.5, borderRadius: 2,
              border: `1px solid ${bolAcknowledged ? alpha('#10b981', 0.3) : alpha('#e2e8f0', 0.8)}`,
              background: bolAcknowledged ? alpha('#10b981', 0.04) : 'transparent',
              transition: 'all 0.2s',
            }}
          />

          {/* ── 4. Additional Details ── */}
          <TextField
            fullWidth multiline rows={2} size="small"
            label="Additional Details (Optional)"
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="Any notes about the delivery"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={16} /> : 'Complete Offload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
