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
  InputAdornment,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Receipt,
  LocalShipping,
  InsertPhoto,
  AutoFixHigh,
  PhotoCamera,
  Delete as DeleteIcon,
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
      setOcrAutoFilled(false);
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

    // Auto-set lumper fee to yes since they're scanning a receipt
    setHasLumperFee(true);

    // Auto-analyze receipt with OCR
    try {
      const result = await analyze(file);
      if (result) {
        // Extract amount
        const amount = extractAmount(result.rawText);
        if (amount && amount > 0) {
          setLumperAmount(String(amount));
          setOcrAutoFilled(true);
        }
      }
    } catch { /* OCR failure is non-critical */ }
  }, [analyze]);

  const handleConfirmLoaded = async () => {
    try {
      setLoading(true);
      setError(null);

      // If lumper fee exists, log it as an expense first
      if (hasLumperFee && lumperAmount && Number(lumperAmount) > 0) {
        // Auto-upload receipt if not already uploaded
        if (lumperReceipt && !lumperReceiptUrl) {
          try {
            const url = await loadApi.uploadLoadDocument(load.id || (load as any)._id, lumperReceipt);
            setLumperReceiptUrl(url);
          } catch { /* non-critical */ }
        }

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

  const clearReceipt = () => {
    setLumperReceipt(null);
    setLumperReceiptPreview(null);
    setLumperReceiptUrl(null);
    setLumperAmount('');
    setOcrAutoFilled(false);
    setHasLumperFee(null);
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
            {hasLumperFee && parseFloat(lumperAmount) > 0 && (
              <Chip
                label={`Lumper Fee: $${parseFloat(lumperAmount).toFixed(2)} (${lumperPaidBy})`}
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            )}
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* ── STEP 1: Scan Lumper Receipt FIRST ── */}
          {!lumperReceipt && hasLumperFee === null && (
            <>
              <Box sx={{
                border: `2px dashed rgba(245,158,11,0.5)`,
                borderRadius: 3, p: 3, textAlign: 'center',
                bgcolor: 'rgba(245,158,11,0.03)',
              }}>
                <Receipt sx={{ fontSize: 40, color: '#f59e0b', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                  Scan Lumper Receipt
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Take a photo or upload the lumper receipt to auto-fill fee details
                </Typography>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<PhotoCamera />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ fontWeight: 700, py: 1.5, px: 3, borderRadius: 2, fontSize: '0.95rem' }}
                >
                  Scan / Upload Receipt
                </Button>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  — or —
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => setHasLumperFee(true)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    Enter manually
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setHasLumperFee(false)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    No lumper fee
                  </Button>
                </Box>
              </Box>
            </>
          )}

          {/* ── Receipt scanned: show preview + auto-filled details ── */}
          {lumperReceipt && hasLumperFee === true && (
            <Box sx={{
              border: '2px solid',
              borderColor: ocrAutoFilled ? '#22c55e' : 'warning.main',
              borderRadius: 3, overflow: 'hidden',
              bgcolor: ocrAutoFilled ? 'rgba(34,197,94,0.03)' : 'rgba(255,152,0,0.03)',
            }}>
              {/* Receipt Preview Header */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1, p: 1.5,
                bgcolor: ocrAutoFilled ? 'rgba(34,197,94,0.08)' : 'rgba(255,152,0,0.08)',
                borderBottom: '1px solid',
                borderColor: ocrAutoFilled ? 'rgba(34,197,94,0.2)' : 'rgba(255,152,0,0.2)',
              }}>
                {lumperReceiptPreview ? (
                  <img src={lumperReceiptPreview} alt="Receipt" style={{
                    width: 48, height: 48, borderRadius: 8, objectFit: 'cover',
                  }} />
                ) : (
                  <InsertPhoto sx={{ fontSize: 40, color: 'text.secondary' }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircle sx={{ fontSize: 16, color: '#22c55e' }} />
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      Receipt Attached
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {lumperReceipt.name} ({(lumperReceipt.size / 1024).toFixed(0)} KB)
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => fileInputRef.current?.click()} title="Rescan">
                  <PhotoCamera fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={clearReceipt} title="Remove">
                  <DeleteIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                </IconButton>
              </Box>

              {/* OCR scanning indicator */}
              {ocrAnalyzing && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">Reading receipt details...</Typography>
                </Box>
              )}

              {/* Auto-filled Details */}
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ocrAutoFilled && (
                  <Alert severity="success" sx={{ py: 0.5 }} icon={<AutoFixHigh />}>
                    <Typography variant="body2" fontWeight={600}>
                      Amount auto-detected — verify below
                    </Typography>
                  </Alert>
                )}

                {/* Amount */}
                <TextField
                  fullWidth size="small"
                  label="Lumper Fee Amount *"
                  type="number"
                  value={lumperAmount}
                  onChange={(e) => { setLumperAmount(e.target.value); setOcrAutoFilled(false); }}
                  placeholder="Enter amount"
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    endAdornment: ocrAutoFilled ? (
                      <Chip label="OCR" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" sx={{ height: 24 }} />
                    ) : undefined,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />

                {/* Who Paid */}
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Who paid?</Typography>
                  <ToggleButtonGroup
                    value={lumperPaidBy}
                    exclusive
                    onChange={(_, v) => v && setLumperPaidBy(v)}
                    fullWidth
                    size="small"
                  >
                    <ToggleButton value="driver" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}>
                      Driver (Reimburse)
                    </ToggleButton>
                    <ToggleButton value="broker" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}>
                      Broker/Shipper
                    </ToggleButton>
                    <ToggleButton value="owner" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}>
                      Dispatcher/Owner
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {lumperPaidBy === 'driver' && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    This amount will be marked for reimbursement to you.
                  </Alert>
                )}
              </Box>
            </Box>
          )}

          {/* ── Manual entry (no scan) ── */}
          {!lumperReceipt && hasLumperFee === true && (
            <Box sx={{
              border: '1px solid',
              borderColor: 'warning.main',
              borderRadius: 3, p: 2,
              bgcolor: 'rgba(255,152,0,0.04)',
            }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Receipt fontSize="small" color="warning" /> Lumper Fee Details
              </Typography>

              {/* Scan option */}
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ mb: 2, py: 1.5, borderStyle: 'dashed', fontWeight: 600 }}
              >
                Scan Receipt to Auto-Fill
              </Button>

              {/* Amount */}
              <TextField
                fullWidth size="small"
                label="Lumper Fee Amount *"
                type="number"
                value={lumperAmount}
                onChange={(e) => setLumperAmount(e.target.value)}
                placeholder="Enter amount"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />

              {/* Who Paid */}
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Who paid?</Typography>
              <ToggleButtonGroup
                value={lumperPaidBy}
                exclusive
                onChange={(_, v) => v && setLumperPaidBy(v)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              >
                <ToggleButton value="driver" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}>
                  Driver (Reimburse)
                </ToggleButton>
                <ToggleButton value="broker" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}>
                  Broker/Shipper
                </ToggleButton>
                <ToggleButton value="owner" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}>
                  Dispatcher/Owner
                </ToggleButton>
              </ToggleButtonGroup>

              {lumperPaidBy === 'driver' && (
                <Alert severity="info" sx={{ py: 0.5, mt: 1 }}>
                  This amount will be marked for reimbursement to you.
                </Alert>
              )}

              <Button
                size="small"
                sx={{ mt: 1, color: 'text.secondary', textTransform: 'none' }}
                onClick={() => { setHasLumperFee(null); setLumperAmount(''); }}
              >
                Go back
              </Button>
            </Box>
          )}

          {/* ── No lumper fee confirmation ── */}
          {hasLumperFee === false && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                No lumper fee — ready to confirm loading.
              </Typography>
              <Button
                size="small"
                sx={{ mt: 0.5, textTransform: 'none', p: 0 }}
                onClick={() => setHasLumperFee(null)}
              >
                Go back
              </Button>
            </Alert>
          )}

          {/* ── Ready to confirm ── */}
          {hasLumperFee !== null && (
            <Alert severity="info" sx={{ borderRadius: 2, py: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {hasLumperFee && lumperAmount
                  ? `Lumper fee: $${parseFloat(lumperAmount).toFixed(2)} (paid by ${lumperPaidBy}).`
                  : hasLumperFee
                  ? 'Enter lumper fee amount above.'
                  : 'No lumper fee.'
                }
                {' '}After confirming, upload the Bill of Lading (BOL).
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirmLoaded}
          disabled={loading || hasLumperFee === null || (hasLumperFee === true && (!lumperAmount || parseFloat(lumperAmount) <= 0))}
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
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </Dialog>
  );
};
