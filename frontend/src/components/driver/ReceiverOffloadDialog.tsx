import React, { useState, useRef, useEffect } from 'react';
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
} from '@mui/material';
import { Close, PhotoCamera, AttachFile, AutoFixHigh } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR } from '@/hooks/useDocumentOCR';
import type { Load } from '@/types/all.types';

interface ReceiverOffloadDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
  /** Pre-captured POD photo (e.g. from Scan POD camera) */
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
  const [quantity, setQuantity] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [bolAcknowledged, setBolAcknowledged] = useState(false);
  const [podFile, setPodFile] = useState<File | null>(null);
  const [podPhoto, setPodPhoto] = useState<File | null>(null);
  const [podPhotoPreview, setPodPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrExtracted, setOcrExtracted] = useState<Record<string, string> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { analyze, analyzing: ocrAnalyzing, reset: resetOCR } = useDocumentOCR();

  useEffect(() => {
    if (open && initialPodPhoto) {
      setPodPhoto(initialPodPhoto);
      const reader = new FileReader();
      reader.onloadend = () => setPodPhotoPreview(reader.result as string);
      reader.readAsDataURL(initialPodPhoto);
    }
  }, [open, initialPodPhoto]);

  const runOCR = async (file: File) => {
    try {
      setOcrExtracted(null);
      const result = await analyze(file);
      if (result && result.extractedFields) {
        const fields = result.extractedFields;
        const extracted: Record<string, string> = {};
        if (fields.bolNumber) extracted['BOL #'] = fields.bolNumber;
        if (fields.poNumber) extracted['PO #'] = fields.poNumber;
        if (fields.proNumber) extracted['PRO #'] = fields.proNumber;
        if (fields.weight) extracted['Weight'] = fields.weight;
        if (fields.pieces) extracted['Pieces'] = fields.pieces;
        if (fields.shipper) extracted['Shipper'] = fields.shipper;
        if (fields.consignee) extracted['Consignee'] = fields.consignee;
        if (fields.deliveryDate) extracted['Delivery Date'] = fields.deliveryDate;
        if (fields.sealNumber) extracted['Seal #'] = fields.sealNumber;
        if (Object.keys(extracted).length > 0) setOcrExtracted(extracted);
        // Auto-fill quantity if found
        if (fields.pieces && !quantity) setQuantity(fields.pieces);
      }
    } catch { /* OCR failure is non-critical */ }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPodFile(file);
      await runOCR(file);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Photo size should be less than 10MB');
        return;
      }
      setPodPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPodPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      await runOCR(file);
    }
  };

  const handleSubmit = async () => {
    if (!bolAcknowledged) {
      setError('Please acknowledge BOL receipt');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let podDocumentUrl: string | undefined;
      let podPhotoUrl: string | undefined;
      if (podFile) podDocumentUrl = await loadApi.uploadLoadDocument(load.id, podFile);
      if (podPhoto) podPhotoUrl = await loadApi.uploadLoadDocument(load.id, podPhoto);

      if (!podDocumentUrl && !podPhotoUrl) {
        setError('Please upload proof of delivery (document or photo)');
        return;
      }

      // Capture current GPS for the status history
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
        quantity,
        additionalDetails,
        bolAcknowledged: true,
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
    setQuantity('');
    setAdditionalDetails('');
    setBolAcknowledged(false);
    setPodFile(null);
    setPodPhoto(null);
    setPodPhotoPreview(null);
    setError(null);
    setOcrExtracted(null);
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
          <Typography variant="h6">Receiver Offload</Typography>
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
          <TextField
            fullWidth
            label="Quantity (Optional)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity delivered"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Details (Optional)"
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="Any additional notes or details"
          />

          {/* OCR Scanning Indicator */}
          {ocrAnalyzing && (
            <Alert severity="info" icon={<CircularProgress size={16} />}>
              <Typography variant="body2">Scanning document for delivery details...</Typography>
            </Alert>
          )}

          {/* OCR Extracted Fields */}
          {ocrExtracted && (
            <Alert severity="success" icon={<AutoFixHigh />} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
              <Typography variant="body2" fontWeight={700} gutterBottom>
                Extracted from POD:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(ocrExtracted).map(([key, value]) => (
                  <Box key={key} sx={{
                    bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 1, px: 1.5, py: 0.5,
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1 }}>{key}</Typography>
                    <Typography variant="body2" fontWeight={600}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Verify these details match your physical document.
              </Typography>
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox
                id="receiver-offload-bol-acknowledged"
                checked={bolAcknowledged}
                onChange={(e) => setBolAcknowledged(e.target.checked)}
                required
              />
            }
            label="I acknowledge receipt of the Bill of Lading (BOL) *"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Upload Proof of Delivery Document (Optional)
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              startIcon={ocrAnalyzing ? <CircularProgress size={16} /> : <AttachFile />}
              onClick={() => fileInputRef.current?.click()}
              fullWidth
              disabled={ocrAnalyzing}
            >
              {podFile ? podFile.name : 'Scan or Upload POD Document'}
            </Button>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Upload Proof of Delivery Photo (Optional)
            </Typography>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            {podPhotoPreview ? (
              <Box>
                <img
                  src={podPhotoPreview}
                  alt="POD"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                />
                <Button
                  size="small"
                  onClick={() => {
                    setPodPhoto(null);
                    setPodPhotoPreview(null);
                  }}
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                startIcon={ocrAnalyzing ? <CircularProgress size={16} /> : <PhotoCamera />}
                onClick={() => photoInputRef.current?.click()}
                fullWidth
                disabled={ocrAnalyzing}
              >
                Scan or Take POD Photo
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !bolAcknowledged}
        >
          {loading ? <CircularProgress size={16} /> : 'Complete Offload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
