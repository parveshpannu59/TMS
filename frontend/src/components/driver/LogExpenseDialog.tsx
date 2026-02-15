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
  MenuItem,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  Chip,
  alpha,
} from '@mui/material';
import {
  Close,
  PhotoCamera,
  LocalGasStation,
  Toll,
  Build,
  AutoFixHigh,
  CloudUpload,
  CheckCircle,
  LocalShipping,
  RvHookup,
  Delete as DeleteIcon,
  CameraAlt,
} from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR, extractAmount } from '@/hooks/useDocumentOCR';
import type { Load } from '@/types/all.types';

// ─── OCR helpers ────────────────────────────────────────
function extractFuelQuantity(text: string): number | null {
  const patterns = [/QTY:\s*([\d,.]+)\s*GAL/i, /Gallons?\s*:\s*([\d,.]+)/i, /([\d,.]+)\s*GAL(?:LONS?)?/i];
  for (const p of patterns) {
    const m = text.replace(/\s+/g, ' ').match(p);
    if (m) { const v = parseFloat(m[1].replace(/,/g, '')); if (v > 0 && v < 10000) return v; }
  }
  return null;
}
function extractFuelPrice(text: string): number | null {
  const patterns = [/PRICE:\s*\$?([\d,.]+)\s*\/?\s*GAL/i, /Price\s*\/?\s*Gal\s*:\s*\$?([\d,.]+)/i, /\$?([\d]+\.\d{2,3})\s*\/\s*GAL/i];
  for (const p of patterns) {
    const m = text.replace(/\s+/g, ' ').match(p);
    if (m) { const v = parseFloat(m[1].replace(/,/g, '')); if (v > 0 && v < 20) return v; }
  }
  return null;
}
function extractFuelStation(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const name = lines[0].replace(/(\w)\s(?=\w\s|\w$)/g, '$1');
    if (name.length > 3 && name.length < 80) return name;
  }
  return null;
}
function extractTotalAmount(text: string): number | null {
  const cleaned = text.replace(/\s+/g, ' ');
  const patterns = [/TOTAL\s*\$?\s*([\d,.]+)/gi, /Sale\s*Total\s*\$?\s*([\d,.]+)/i];
  let best: number | null = null;
  for (const p of patterns) {
    let m;
    while ((m = p.exec(cleaned)) !== null) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (v > 10 && (!best || v > best)) best = v;
    }
  }
  return best;
}

// ─── Title & icon map ───────────────────────────────────
const CATEGORY_META: Record<string, { label: string; gradient: string; icon: React.ReactNode }> = {
  fuel:     { label: 'Log Fuel',                gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: <LocalGasStation sx={{ color: '#fff', fontSize: 20 }} /> },
  toll:     { label: 'Log Toll',                gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', icon: <Toll sx={{ color: '#fff', fontSize: 20 }} /> },
  repair:   { label: 'Log Maintenance & Repair', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: <Build sx={{ color: '#fff', fontSize: 20 }} /> },
  scale:    { label: 'Log Scale',               gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', icon: <Toll sx={{ color: '#fff', fontSize: 20 }} /> },
  parking:  { label: 'Log Parking',             gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', icon: <Toll sx={{ color: '#fff', fontSize: 20 }} /> },
  lumper:   { label: 'Log Lumper',              gradient: 'linear-gradient(135deg, #10b981, #059669)', icon: <Toll sx={{ color: '#fff', fontSize: 20 }} /> },
  dock_fee: { label: 'Log Dock Fee',            gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', icon: <Toll sx={{ color: '#fff', fontSize: 20 }} /> },
  other:    { label: 'Log Expense',             gradient: 'linear-gradient(135deg, #64748b, #475569)', icon: <Toll sx={{ color: '#fff', fontSize: 20 }} /> },
};

interface LogExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
  defaultCategory?: string;
}

export const LogExpenseDialog: React.FC<LogExpenseDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
  defaultCategory = 'fuel',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [category, setCategory] = useState(defaultCategory);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fuel-specific
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [fuelPricePerGal, setFuelPricePerGal] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [odometerMiles, setOdometerMiles] = useState('');
  const [vehicleType, setVehicleType] = useState<'truck' | 'trailer'>('truck');

  // Repair-specific
  const [repairStartTime, setRepairStartTime] = useState('');
  const [repairEndTime, setRepairEndTime] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const [repairIssuePhoto, setRepairIssuePhoto] = useState<File | null>(null);
  const [repairIssuePreview, setRepairIssuePreview] = useState<string | null>(null);
  const [repairCompleted, setRepairCompleted] = useState(false);

  // OCR
  const [ocrAutoFilled, setOcrAutoFilled] = useState(false);
  const [ocrFields, setOcrFields] = useState<string[]>([]);
  const { analyze, analyzing: ocrAnalyzing, reset: resetOCR } = useDocumentOCR();

  // Auto-set category from prop every time dialog opens
  useEffect(() => {
    if (open) setCategory(defaultCategory);
  }, [open, defaultCategory]);

  // ─── Receipt OCR ──────────────────────────────────────
  const handleReceiptFile = useCallback(async (file: File | null) => {
    setReceiptFile(file);
    setOcrAutoFilled(false);
    setOcrFields([]);
    if (!file) { setReceiptPreview(null); return; }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else { setReceiptPreview(null); }

    try {
      const result = await analyze(file);
      if (!result) return;
      const raw = result.rawText || '';
      const filled: string[] = [];

      if (category === 'fuel') {
        const qty = extractFuelQuantity(raw);
        if (qty && !fuelQuantity) { setFuelQuantity(String(qty)); filled.push('Quantity'); }
        const price = extractFuelPrice(raw);
        if (price && !fuelPricePerGal) { setFuelPricePerGal(String(price)); filled.push('Price/Gal'); }
        const total = extractTotalAmount(raw);
        if (total && !amount) { setAmount(String(total)); filled.push('Amount'); }
        const station = extractFuelStation(raw);
        if (station && !fuelStation) { setFuelStation(station); filled.push('Station'); }
      } else {
        const extractedAmt = result.extractedFields?.amount
          ? parseFloat(result.extractedFields.amount.replace(/[^0-9.]/g, ''))
          : (extractTotalAmount(raw) || extractAmount(raw));
        if (extractedAmt && !amount) { setAmount(String(extractedAmt)); filled.push('Amount'); }
      }

      if (filled.length > 0) { setOcrAutoFilled(true); setOcrFields(filled); }
    } catch { /* non-critical */ }
  }, [analyze, category, amount, fuelQuantity, fuelPricePerGal, fuelStation]);

  // ─── Auto-calculate total amount for fuel ─────────────
  useEffect(() => {
    if (category === 'fuel' && fuelQuantity && fuelPricePerGal) {
      const qty = parseFloat(fuelQuantity);
      const ppg = parseFloat(fuelPricePerGal);
      if (qty > 0 && ppg > 0) {
        setAmount((qty * ppg).toFixed(2));
      }
    }
  }, [category, fuelQuantity, fuelPricePerGal]);

  // ─── Submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (category === 'fuel') {
      if (!receiptFile) { setError('Receipt is mandatory. Please scan or upload.'); return; }
      if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return; }
      if (!odometerMiles) { setError('Odometer / Miles is mandatory'); return; }
      if (!fuelQuantity) { setError('Fuel quantity is mandatory'); return; }
    } else if (category === 'toll') {
      if (!receiptFile) { setError('Receipt is mandatory. Please scan or upload.'); return; }
      if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return; }
    } else if (category === 'repair') {
      if (!receiptFile) { setError('Receipt is mandatory. Please scan or upload.'); return; }
      if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return; }
    } else {
      if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return; }
    }

    try {
      setLoading(true);
      setError(null);

      let receiptUrl: string | undefined;
      if (receiptFile) {
        receiptUrl = await loadApi.uploadLoadDocument(load.id, receiptFile);
      }

      let fullDescription = description;

      // Fuel description
      if (category === 'fuel') {
        const parts = [];
        if (fuelStation) parts.push(`Station: ${fuelStation}`);
        if (fuelQuantity) parts.push(`Qty: ${fuelQuantity} gal`);
        if (fuelPricePerGal) parts.push(`Price: $${fuelPricePerGal}/gal`);
        if (odometerMiles) parts.push(`Odometer: ${odometerMiles} mi`);
        parts.push(`Vehicle: ${vehicleType}`);
        if (parts.length) fullDescription = `${parts.join(' | ')}${description ? ` | Notes: ${description}` : ''}`;
      }

      // Repair description + photo upload
      let repairIssuePhotoUrl: string | undefined;
      if (category === 'repair') {
        if (repairIssuePhoto) {
          repairIssuePhotoUrl = await loadApi.uploadLoadDocument(load.id, repairIssuePhoto);
        }
        const parts = [];
        if (repairDescription) parts.push(`Issue: ${repairDescription}`);
        if (repairStartTime) parts.push(`Start: ${new Date(repairStartTime).toLocaleString()}`);
        if (repairEndTime) parts.push(`End: ${new Date(repairEndTime).toLocaleString()}`);
        if (repairStartTime && repairEndTime) {
          const hours = ((new Date(repairEndTime).getTime() - new Date(repairStartTime).getTime()) / 3600000).toFixed(1);
          parts.push(`Downtime: ${hours}h`);
        }
        if (repairIssuePhotoUrl) parts.push(`Issue Photo: ${repairIssuePhotoUrl}`);
        if (repairCompleted) parts.push('Status: Repair Completed');
        if (parts.length) fullDescription = `${parts.join(' | ')}${description ? ` | Notes: ${description}` : ''}`;
      }

      await loadApi.addExpense(load.id, {
        category,
        type: 'on_the_way',
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        description: fullDescription || undefined,
        location: fuelStation || undefined,
        receiptUrl,
        paidBy: 'driver',
        repairStartTime: repairStartTime || undefined,
        repairEndTime: repairEndTime || undefined,
        repairDescription: repairDescription || undefined,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to log expense');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategory(defaultCategory);
    setAmount('');
    setDescription('');
    setReceiptFile(null);
    setReceiptPreview(null);
    setFuelQuantity('');
    setFuelPricePerGal('');
    setFuelStation('');
    setOdometerMiles('');
    setVehicleType('truck');
    setRepairStartTime('');
    setRepairEndTime('');
    setRepairDescription('');
    setRepairIssuePhoto(null);
    setRepairIssuePreview(null);
    setRepairCompleted(false);
    setError(null);
    setOcrAutoFilled(false);
    setOcrFields([]);
    resetOCR();
    onClose();
  };

  const meta = CATEGORY_META[category] || CATEGORY_META.other;

  const isValid = (() => {
    if (category === 'fuel') return !!(receiptFile && amount && parseFloat(amount) > 0 && odometerMiles && fuelQuantity);
    if (category === 'toll') return !!(receiptFile && amount && parseFloat(amount) > 0);
    if (category === 'repair') return !!(receiptFile && amount && parseFloat(amount) > 0);
    return !!(amount && parseFloat(amount) > 0);
  })();

  // ─── Shared receipt upload block ──────────────────────
  const renderReceiptUpload = (mandatory: boolean) => (
    <Box sx={{
      p: 2, borderRadius: 3,
      border: `2px dashed ${receiptFile ? alpha('#10b981', 0.5) : alpha('#3b82f6', 0.3)}`,
      background: receiptFile ? alpha('#10b981', 0.04) : alpha('#3b82f6', 0.02),
      transition: 'all 0.2s',
    }}>
      {!receiptFile ? (
        <>
          {/* Primary: single tap → camera → auto-attach + OCR */}
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
            {ocrAnalyzing ? 'Scanning...' : `Scan Receipt${mandatory ? ' *' : ''}`}
            <input type="file" hidden accept="image/*" capture="environment"
              onChange={(e) => handleReceiptFile(e.target.files?.[0] || null)} />
          </Button>
          {/* Fallback: upload from gallery */}
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Button component="label" size="small"
              sx={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'none', '&:hover': { color: '#3b82f6', background: 'transparent' } }}
              startIcon={<CloudUpload sx={{ fontSize: 14 }} />}
            >
              or upload from gallery
              <input type="file" hidden accept="image/*,application/pdf"
                onChange={(e) => handleReceiptFile(e.target.files?.[0] || null)} />
            </Button>
          </Box>
        </>
      ) : (
        <Box>
          {/* Status: Attached */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1, mb: receiptPreview ? 1 : 0,
            p: 1, borderRadius: 2, bgcolor: alpha('#10b981', 0.06),
          }}>
            <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} color="#059669">
                Receipt Attached
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)
              </Typography>
            </Box>
            {/* Replace with new scan */}
            <Button component="label" size="small" variant="outlined"
              sx={{ minWidth: 'auto', px: 1.5, fontSize: '0.7rem', borderColor: alpha('#64748b', 0.3), color: '#64748b' }}
              startIcon={<PhotoCamera sx={{ fontSize: 14 }} />}
            >
              Retake
              <input type="file" hidden accept="image/*" capture="environment"
                onChange={(e) => handleReceiptFile(e.target.files?.[0] || null)} />
            </Button>
            <IconButton size="small" onClick={() => { setReceiptFile(null); setReceiptPreview(null); setOcrAutoFilled(false); setOcrFields([]); }}>
              <DeleteIcon fontSize="small" sx={{ color: '#94a3b8' }} />
            </IconButton>
          </Box>

          {/* Preview */}
          {receiptPreview && (
            <Box sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 120 }}>
              <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxHeight: 120, objectFit: 'cover' }} />
            </Box>
          )}

          {/* OCR scanning indicator */}
          {ocrAnalyzing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1, borderRadius: 2, bgcolor: alpha('#3b82f6', 0.05) }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Reading receipt details...</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* OCR results */}
      {ocrAutoFilled && ocrFields.length > 0 && !ocrAnalyzing && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
          <Chip label="Auto-filled" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
          {ocrFields.map((f) => (
            <Chip key={f} label={f} size="small" color="success" variant="filled"
              sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha('#10b981', 0.1), color: '#059669' }} />
          ))}
        </Box>
      )}
      {receiptFile && !ocrAnalyzing && !ocrAutoFilled && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Receipt saved. Fill in the details below.
        </Typography>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      {/* ─── Title ─── */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {meta.icon}
            </Box>
            <Typography variant="h6" fontWeight={700}>{meta.label}</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

          {/* ════════════════════════════════════════════════
              FUEL
              ════════════════════════════════════════════════ */}
          {category === 'fuel' && (
            <>
              {renderReceiptUpload(true)}

              <FormControl fullWidth size="small" required>
                <InputLabel>Fuel For *</InputLabel>
                <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as 'truck' | 'trailer')} label="Fuel For *">
                  <MenuItem value="truck">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocalShipping sx={{ fontSize: 18, color: '#3b82f6' }} /> Truck
                    </Box>
                  </MenuItem>
                  <MenuItem value="trailer">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RvHookup sx={{ fontSize: 18, color: '#6366f1' }} /> Trailer (Reefer)
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth label="Odometer / Miles *" type="number"
                value={odometerMiles} onChange={(e) => setOdometerMiles(e.target.value)}
                inputProps={{ min: 0 }} required size="small"
                placeholder="Current odometer reading" helperText="Current mileage at fueling"
              />

              <TextField
                fullWidth label="Fuel Quantity (gallons) *" type="number"
                value={fuelQuantity} onChange={(e) => setFuelQuantity(e.target.value)}
                inputProps={{ min: 0, step: 0.001 }} required size="small"
                InputProps={{ endAdornment: ocrFields.includes('Quantity') ? <Chip label="OCR" size="small" sx={{ height: 20, fontSize: '0.65rem' }} color="success" variant="outlined" /> : undefined }}
              />

              <TextField
                fullWidth label="Price / Gal ($)" type="number"
                value={fuelPricePerGal} onChange={(e) => setFuelPricePerGal(e.target.value)}
                inputProps={{ min: 0, step: 0.001 }} size="small"
                InputProps={{ endAdornment: ocrFields.includes('Price/Gal') ? <Chip label="OCR" size="small" sx={{ height: 20, fontSize: '0.65rem' }} color="success" variant="outlined" /> : undefined }}
              />

              <TextField
                fullWidth label="Additional Notes (Optional)" multiline rows={2}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Station name, who paid if not you, DEF, etc." size="small"
              />
            </>
          )}

          {/* ════════════════════════════════════════════════
              TOLL
              ════════════════════════════════════════════════ */}
          {category === 'toll' && (
            <>
              {renderReceiptUpload(true)}

              <TextField
                fullWidth label="Amount Paid ($) *" type="number"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }} required size="small"
                InputProps={{ endAdornment: ocrFields.includes('Amount') ? <Chip label="OCR" size="small" sx={{ height: 20, fontSize: '0.65rem' }} color="success" variant="outlined" /> : undefined }}
              />

              <TextField
                fullWidth label="Additional Notes (Optional)" multiline rows={2}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Toll plaza name, who paid if not you, etc." size="small"
              />
            </>
          )}

          {/* ════════════════════════════════════════════════
              REPAIR / MAINTENANCE
              ════════════════════════════════════════════════ */}
          {category === 'repair' && (
            <>
              {/* 1. Receipt (Mandatory) */}
              {renderReceiptUpload(true)}

              {/* 2. Photo of the Issue */}
              <Box sx={{
                p: 2, borderRadius: 3,
                border: `2px dashed ${repairIssuePhoto ? alpha('#f59e0b', 0.5) : alpha('#64748b', 0.25)}`,
                background: repairIssuePhoto ? alpha('#f59e0b', 0.04) : alpha('#64748b', 0.02),
                transition: 'all 0.2s',
              }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {repairIssuePhoto ? <CheckCircle sx={{ fontSize: 18, color: '#f59e0b' }} /> : <CameraAlt sx={{ fontSize: 18, color: '#64748b' }} />}
                  Photo of Issue (Optional)
                </Typography>
                {!repairIssuePhoto ? (
                  <Button variant="outlined" component="label" startIcon={<CameraAlt />} size="small" fullWidth
                    sx={{ borderColor: alpha('#64748b', 0.3), color: '#475569' }}>
                    Take Photo
                    <input type="file" hidden accept="image/*" capture="environment"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setRepairIssuePhoto(f);
                        if (f) { const r = new FileReader(); r.onload = () => setRepairIssuePreview(r.result as string); r.readAsDataURL(f); }
                        else setRepairIssuePreview(null);
                      }}
                    />
                  </Button>
                ) : (
                  <Box>
                    {repairIssuePreview && (
                      <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', maxHeight: 120, mb: 0.5 }}>
                        <img src={repairIssuePreview} alt="Issue" style={{ width: '100%', maxHeight: 120, objectFit: 'cover' }} />
                        <IconButton size="small"
                          onClick={() => { setRepairIssuePhoto(null); setRepairIssuePreview(null); }}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ color: '#f59e0b', fontSize: 16 }} />
                      <Typography variant="body2" fontWeight={500} sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {repairIssuePhoto.name}
                      </Typography>
                      <IconButton size="small" onClick={() => { setRepairIssuePhoto(null); setRepairIssuePreview(null); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* 3. What happened */}
              <TextField
                fullWidth label="What happened? *" multiline rows={2}
                value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)}
                placeholder="e.g. Tire blowout on highway, brake pad worn out..."
                size="small"
              />

              {/* 4. Amount */}
              <TextField
                fullWidth label="Amount ($) *" type="number"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }} required size="small"
                InputProps={{ endAdornment: ocrFields.includes('Amount') ? <Chip label="OCR" size="small" sx={{ height: 20, fontSize: '0.65rem' }} color="success" variant="outlined" /> : undefined }}
              />

              {/* 5. Start & End Date */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  fullWidth label="Start Date & Time" type="datetime-local"
                  value={repairStartTime} onChange={(e) => setRepairStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }} size="small"
                />
                <TextField
                  fullWidth label="End Date & Time" type="datetime-local"
                  value={repairEndTime}
                  onChange={(e) => { setRepairEndTime(e.target.value); setRepairCompleted(true); }}
                  InputLabelProps={{ shrink: true }}
                  helperText={repairCompleted ? 'Repair completed' : 'Fill when done'}
                  size="small"
                />
              </Box>

              {repairStartTime && repairEndTime && (() => {
                const diffMs = new Date(repairEndTime).getTime() - new Date(repairStartTime).getTime();
                if (diffMs < 0) return <Alert severity="error" sx={{ py: 0.5 }}>End time must be after start time</Alert>;
                const hours = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                return (
                  <Alert severity="info" sx={{ py: 0.5 }} icon={false}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={600}>Total Downtime: {hours}h {mins}m</Typography>
                      <Chip label={repairCompleted ? 'Complete' : 'In Progress'} size="small"
                        color={repairCompleted ? 'success' : 'warning'} variant="outlined" />
                    </Box>
                  </Alert>
                );
              })()}

              {repairStartTime && !repairEndTime && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  <Typography variant="body2">Repair in progress. Enter end time when done.</Typography>
                </Alert>
              )}

              {/* 6. Notes */}
              <TextField
                fullWidth label="Additional Notes (Optional)" multiline rows={2}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Location, who paid if not you, etc." size="small"
              />
            </>
          )}

          {/* ════════════════════════════════════════════════
              OTHER CATEGORIES (scale, parking, lumper, dock_fee, other)
              ════════════════════════════════════════════════ */}
          {!['fuel', 'toll', 'repair'].includes(category) && (
            <>
              {renderReceiptUpload(false)}

              <TextField
                fullWidth label="Amount ($) *" type="number"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }} required size="small"
                InputProps={{ endAdornment: ocrFields.includes('Amount') ? <Chip label="OCR" size="small" sx={{ height: 20, fontSize: '0.65rem' }} color="success" variant="outlined" /> : undefined }}
              />

              <TextField
                fullWidth label="Additional Notes (Optional)" multiline rows={2}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Any additional details" size="small"
              />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !isValid}>
          {loading ? <CircularProgress size={16} /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
