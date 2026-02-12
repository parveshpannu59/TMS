import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Link,
} from '@mui/material';
import { Close, AttachFile, Description, AutoFixHigh } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR } from '@/hooks/useDocumentOCR';
import type { Load } from '@/types/all.types';

interface LoadOutDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const LoadOutDialog: React.FC<LoadOutDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [bolFile, setBolFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrExtracted, setOcrExtracted] = useState<Record<string, string> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analyze, analyzing: ocrAnalyzing, reset: resetOCR } = useDocumentOCR();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept PDF and images
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError('Please upload a PDF or image file');
        return;
      }
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        setError('PDF_TOO_LARGE');
        return;
      }
      setBolFile(file);
      setError(null);
      setOcrExtracted(null);

      // Auto-analyze BOL to extract details
      try {
        const result = await analyze(file);
        if (result && result.extractedFields) {
          const fields = result.extractedFields;
          const extracted: Record<string, string> = {};
          if (fields.bolNumber) extracted['BOL #'] = fields.bolNumber;
          if (fields.poNumber) extracted['PO #'] = fields.poNumber;
          if (fields.proNumber) extracted['PRO #'] = fields.proNumber;
          if (fields.shipper) extracted['Shipper'] = fields.shipper;
          if (fields.consignee) extracted['Consignee'] = fields.consignee;
          if (fields.weight) extracted['Weight'] = fields.weight;
          if (fields.pieces) extracted['Pieces'] = fields.pieces;
          if (fields.commodity) extracted['Commodity'] = fields.commodity;
          if (fields.sealNumber) extracted['Seal #'] = fields.sealNumber;
          if (Object.keys(extracted).length > 0) setOcrExtracted(extracted);
        }
      } catch { /* OCR failure is non-critical */ }
    }
  };

  const handleSubmit = async () => {
    if (!bolFile) {
      setError('Please upload Bill of Lading (BOL) document');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bolUrl = await loadApi.uploadLoadDocument(load.id, bolFile);

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

      await loadApi.shipperLoadOut(load.id, {
        bolDocument: bolUrl,
        ...gps,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete load out');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBolFile(null);
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
          <Typography variant="h6">Load Out - Upload BOL</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error === 'PDF_TOO_LARGE' ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  PDF size is too large (max 25MB). Compress it first:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Link href="https://smallpdf.com/compress-pdf" target="_blank" rel="noopener noreferrer" sx={{ mr: 1 }}>
                    SmallPDF
                  </Link>
                  <Link href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noopener noreferrer">
                    iLovePDF
                  </Link>
                </Box>
              </Box>
            ) : (
              error
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Upload Bill of Lading (BOL) PDF *
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Box
              sx={{
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: bolFile ? 'action.selected' : 'background.default',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {bolFile ? (
                <Box>
                  <Description sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="body2" fontWeight={500}>
                    {bolFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(bolFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBolFile(null);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Box>
                  <AttachFile sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Take Photo or Upload BOL (PDF/Image)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max size: 25MB
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* OCR Scanning Indicator */}
          {ocrAnalyzing && (
            <Alert severity="info" icon={<CircularProgress size={16} />}>
              <Typography variant="body2">Scanning document for BOL details...</Typography>
            </Alert>
          )}

          {/* OCR Extracted Fields */}
          {ocrExtracted && (
            <Alert severity="success" icon={<AutoFixHigh />} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
              <Typography variant="body2" fontWeight={700} gutterBottom>
                Extracted from BOL:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(ocrExtracted).map(([key, value]) => (
                  <Box key={key} sx={{
                    bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 1, px: 1.5, py: 0.5,
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1 }}>
                      {key}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Verify these details match your physical BOL document.
              </Typography>
            </Alert>
          )}

          {bolFile && bolFile.size > 20 * 1024 * 1024 && (
            <Alert severity="warning">
              <Typography variant="body2" sx={{ mb: 1 }}>
                Large file detected ({((bolFile.size / 1024 / 1024).toFixed(2))} MB). 
                Consider compressing before upload:
              </Typography>
              <Link href="https://www.ilovepdf.com/compress-pdf" target="_blank" rel="noopener">
                Compress PDF Online
              </Link>
            </Alert>
          )}

          <Alert severity="warning" variant="outlined">
            <Typography variant="body2" fontWeight={600} gutterBottom>
              BOL Upload Required
            </Typography>
            <Typography variant="caption">
              The Bill of Lading must be uploaded within 2-3 hours of loading. 
              Upload it now before departing the shipper location to avoid delays.
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
          disabled={loading || !bolFile}
          startIcon={loading ? <CircularProgress size={16} /> : <AttachFile />}
        >
          Complete Load Out
        </Button>
      </DialogActions>
    </Dialog>
  );
};
