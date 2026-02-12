import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Chip,
} from '@mui/material';
import {
  Close,
  CloudUpload,
  CheckCircle,
  Receipt,
  LocalShipping,
  InsertPhoto,
  AutoFixHigh,
} from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR, extractAmount } from '@/hooks/useDocumentOCR';
import type { Load } from '@/types/all.types';

interface LoadInDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const LoadInDialog: React.FC<LoadInDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Lumper fee
  const [hasLumperFee, setHasLumperFee] = useState<boolean | null>(null);
  const [lumperAmount, setLumperAmount] = useState('');
  const [lumperPaidBy, setLumperPaidBy] = useState<string>('driver');
  const [lumperReceipt, setLumperReceipt] = useState<File | null>(null);
  const [lumperReceiptPreview, setLumperReceiptPreview] = useState<string | null>(null);
  const [lumperReceiptUrl, setLumperReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ocrAutoFilled, setOcrAutoFilled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analyze, analyzing: ocrAnalyzing, reset: resetOCR } = useDocumentOCR();

  useEffect(() => {
    if (open) {
      setHasLumperFee(null);
      setLumperAmount('');
      setLumperPaidBy('driver');
      setLumperReceipt(null);
      setLumperReceiptPreview(null);
      setLumperReceiptUrl(null);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLumperReceipt(file);
    setOcrAutoFilled(false);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setLumperReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLumperReceiptPreview(null);
    }
    e.target.value = '';

    // Auto-analyze receipt with OCR to extract amount
    try {
      const result = await analyze(file);
      if (result) {
        const amount = extractAmount(result.rawText);
        if (amount && !lumperAmount) {
          setLumperAmount(String(amount));
          setOcrAutoFilled(true);
        }
      }
    } catch { /* OCR failure is non-critical */ }
  }, [analyze, lumperAmount]);

  const handleUploadReceipt = useCallback(async () => {
    if (!lumperReceipt) return;
    try {
      setUploading(true);
      const url = await loadApi.uploadLoadDocument(load.id || (load as any)._id, lumperReceipt);
      setLumperReceiptUrl(url);
    } catch (err: any) {
      setError('Failed to upload receipt: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  }, [lumperReceipt, load]);

  const handleConfirmLoaded = async () => {
    try {
      setLoading(true);
      setError(null);

      // If lumper fee exists, log it as an expense first
      if (hasLumperFee && lumperAmount && Number(lumperAmount) > 0) {
        try {
          await loadApi.addExpense(load.id || (load as any)._id, {
            category: 'lumper',
            amount: Number(lumperAmount),
            description: `Lumper fee at shipper`,
            paidBy: lumperPaidBy,
            receiptUrl: lumperReceiptUrl || undefined,
          });
        } catch {
          // Non-critical: expense logging failure shouldn't block loading confirmation
        }
      }

      // Confirm load in
      await loadApi.shipperLoadIn(load.id || (load as any)._id);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm loading');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setHasLumperFee(null);
    setLumperAmount('');
    setLumperPaidBy('driver');
    setLumperReceipt(null);
    setLumperReceiptPreview(null);
    setLumperReceiptUrl(null);
    setError(null);
    setSuccess(false);
    setOcrAutoFilled(false);
    resetOCR();
    onClose();
  };

  if (success) {
    return (
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 6 }}>
            <CheckCircle sx={{ fontSize: 80, color: '#22c55e' }} />
            <Typography variant="h5" fontWeight={700} color="success.main">
              Loading Confirmed!
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              The shipment has been loaded onto your truck.
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Next: Upload Bill of Lading (BOL) before departing
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShipping color="primary" />
            <Typography variant="h6" fontWeight={700}>Confirm Loaded</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Load Info */}
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, mb: 3 }}>
          <Typography variant="subtitle2" color="primary" fontWeight={700}>
            Load #{load.loadNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {(load as any)?.pickupLocation?.city || 'Pickup'} → {(load as any)?.deliveryLocation?.city || 'Delivery'}
          </Typography>
        </Box>

        {/* Step 1: Lumper Fee Question */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Was there a Lumper Fee?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            If a lumper service was used for loading, record the fee and receipt.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              fullWidth
              variant={hasLumperFee === true ? 'contained' : 'outlined'}
              color={hasLumperFee === true ? 'warning' : 'inherit'}
              onClick={() => setHasLumperFee(true)}
              sx={{ py: 1.5, fontWeight: 600, fontSize: 15 }}
            >
              Yes, there was a lumper fee
            </Button>
            <Button
              fullWidth
              variant={hasLumperFee === false ? 'contained' : 'outlined'}
              color={hasLumperFee === false ? 'success' : 'inherit'}
              onClick={() => setHasLumperFee(false)}
              sx={{ py: 1.5, fontWeight: 600, fontSize: 15 }}
            >
              No lumper fee
            </Button>
          </Box>
        </Box>

        {/* Step 2: Lumper Fee Details */}
        {hasLumperFee === true && (
          <Box sx={{
            border: '1px solid',
            borderColor: 'warning.main',
            borderRadius: 2,
            p: 2,
            mb: 3,
            bgcolor: 'rgba(255,152,0,0.04)',
          }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Receipt fontSize="small" color="warning" /> Lumper Fee Details
            </Typography>

            {/* Amount */}
            <TextField
              fullWidth
              label="Lumper Fee Amount"
              type="number"
              value={lumperAmount}
              onChange={(e) => { setLumperAmount(e.target.value); setOcrAutoFilled(false); }}
              placeholder="Enter amount"
              sx={{ mb: 2 }}
              helperText={
                ocrAnalyzing ? '🔍 Scanning receipt...' :
                ocrAutoFilled ? '✅ Auto-filled from receipt — verify and edit if needed' :
                undefined
              }
              InputProps={{
                startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 600 }}>$</Typography>,
                endAdornment: ocrAutoFilled ? (
                  <Chip label="OCR" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" />
                ) : ocrAnalyzing ? (
                  <CircularProgress size={18} />
                ) : undefined,
              }}
            />

            {/* Who Paid */}
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Who paid the lumper fee?</Typography>
            <ToggleButtonGroup
              value={lumperPaidBy}
              exclusive
              onChange={(_, v) => v && setLumperPaidBy(v)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="driver" sx={{ textTransform: 'none', fontWeight: 600 }}>
                🚛 Driver (Reimburse)
              </ToggleButton>
              <ToggleButton value="broker" sx={{ textTransform: 'none', fontWeight: 600 }}>
                🏢 Broker/Shipper
              </ToggleButton>
              <ToggleButton value="owner" sx={{ textTransform: 'none', fontWeight: 600 }}>
                👤 Dispatcher/Owner
              </ToggleButton>
            </ToggleButtonGroup>

            {lumperPaidBy === 'driver' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This amount will be marked for reimbursement to you.
              </Alert>
            )}

            {/* Receipt Upload */}
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Upload Lumper Receipt</Typography>
            {!lumperReceipt ? (
              <Button
                fullWidth
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<CloudUpload />}
                sx={{
                  py: 3,
                  borderStyle: 'dashed',
                  borderWidth: 2,
                }}
              >
                Take Photo or Upload Receipt
              </Button>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                {lumperReceiptPreview ? (
                  <img src={lumperReceiptPreview} alt="Receipt" style={{
                    width: 56, height: 56, borderRadius: 8, objectFit: 'cover',
                  }} />
                ) : (
                  <InsertPhoto sx={{ fontSize: 40, color: 'text.secondary' }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{lumperReceipt.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(lumperReceipt.size / 1024).toFixed(0)} KB
                  </Typography>
                </Box>
                {!lumperReceiptUrl ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleUploadReceipt}
                    disabled={uploading}
                    startIcon={uploading ? <CircularProgress size={14} /> : <CloudUpload />}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                ) : (
                  <Chip label="Uploaded" color="success" size="small" icon={<CheckCircle />} />
                )}
                <IconButton size="small" onClick={() => {
                  setLumperReceipt(null);
                  setLumperReceiptPreview(null);
                  setLumperReceiptUrl(null);
                }}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        )}

        {/* Confirmation */}
        {hasLumperFee !== null && (
          <Alert severity="success" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Ready to confirm loading
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {hasLumperFee ? `Lumper fee: $${lumperAmount || 0} (paid by ${lumperPaidBy})` : 'No lumper fee'}.
              {' '}After confirming, you will need to upload the Bill of Lading (BOL).
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirmLoaded}
          disabled={loading || hasLumperFee === null || (hasLumperFee === true && !lumperAmount)}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
          sx={{ fontWeight: 700 }}
        >
          {loading ? 'Confirming...' : 'Confirm Loaded'}
        </Button>
      </DialogActions>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </Dialog>
  );
};
