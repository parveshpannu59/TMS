import React, { useState, useEffect } from 'react';
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
  Divider,
  Chip,
} from '@mui/material';
import { Close, PhotoCamera, LocalGasStation, Toll, Build, AutoFixHigh } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { useDocumentOCR, extractAmount, extractMileage } from '@/hooks/useDocumentOCR';
import type { Load } from '@/types/all.types';

const CATEGORIES = [
  { value: 'fuel', label: 'Fuel', icon: <LocalGasStation fontSize="small" /> },
  { value: 'toll', label: 'Toll', icon: <Toll fontSize="small" /> },
  { value: 'scale', label: 'Scale' },
  { value: 'parking', label: 'Parking' },
  { value: 'lumper', label: 'Lumper' },
  { value: 'dock_fee', label: 'Dock Fee' },
  { value: 'repair', label: 'Maintenance & Repair', icon: <Build fontSize="small" /> },
  { value: 'other', label: 'Other' },
];

const PAYER_OPTIONS = [
  { value: 'driver', label: 'Driver (I paid)' },
  { value: 'dispatcher', label: 'Dispatcher / Owner' },
  { value: 'broker', label: 'Broker / Shipper' },
];

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
  const [location, setLocation] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fuel-specific fields
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [odometerBefore, setOdometerBefore] = useState('');
  const [odometerAfter, setOdometerAfter] = useState('');
  const [odometerBeforePhoto, setOdometerBeforePhoto] = useState<File | null>(null);
  const [odometerAfterPhoto, setOdometerAfterPhoto] = useState<File | null>(null);

  // Maintenance-specific fields
  const [repairStartTime, setRepairStartTime] = useState('');
  const [repairEndTime, setRepairEndTime] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const [repairLocation, setRepairLocation] = useState('');
  const [repairIssuePhoto, setRepairIssuePhoto] = useState<File | null>(null);
  const [repairIssuePreview, setRepairIssuePreview] = useState<string | null>(null);
  const [repairCompleted, setRepairCompleted] = useState(false);

  // Payer
  const [paidBy, setPaidBy] = useState('driver');
  const [ocrAutoFilled, setOcrAutoFilled] = useState(false);
  const { analyze, analyzing: ocrAnalyzing, reset: resetOCR } = useDocumentOCR();

  useEffect(() => {
    if (open) setCategory(defaultCategory);
  }, [open, defaultCategory]);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let receiptUrl: string | undefined;
      if (receiptFile) {
        receiptUrl = await loadApi.uploadLoadDocument(load.id, receiptFile);
      }

      // Upload odometer photos if fuel
      let odometerBeforeUrl: string | undefined;
      let odometerAfterUrl: string | undefined;
      if (category === 'fuel') {
        if (odometerBeforePhoto) {
          odometerBeforeUrl = await loadApi.uploadLoadDocument(load.id, odometerBeforePhoto);
        }
        if (odometerAfterPhoto) {
          odometerAfterUrl = await loadApi.uploadLoadDocument(load.id, odometerAfterPhoto);
        }
      }

      // Build description with all extra info
      let fullDescription = description;
      if (category === 'fuel') {
        const parts = [];
        if (fuelStation) parts.push(`Station: ${fuelStation}`);
        if (fuelQuantity) parts.push(`Qty: ${fuelQuantity} gal`);
        if (odometerBefore) parts.push(`Odometer Before: ${odometerBefore}`);
        if (odometerAfter) parts.push(`Odometer After: ${odometerAfter}`);
        if (odometerBeforeUrl) parts.push(`Odometer Before Photo: ${odometerBeforeUrl}`);
        if (odometerAfterUrl) parts.push(`Odometer After Photo: ${odometerAfterUrl}`);
        if (parts.length) fullDescription = `${parts.join(' | ')}${description ? ` | Notes: ${description}` : ''}`;
      }
      // Upload repair issue photo if present
      let repairIssuePhotoUrl: string | undefined;
      if (category === 'repair' && repairIssuePhoto) {
        repairIssuePhotoUrl = await loadApi.uploadLoadDocument(load.id, repairIssuePhoto);
      }

      if (category === 'repair') {
        const parts = [];
        if (repairStartTime) parts.push(`Start: ${new Date(repairStartTime).toLocaleString()}`);
        if (repairEndTime) parts.push(`End: ${new Date(repairEndTime).toLocaleString()}`);
        if (repairStartTime && repairEndTime) {
          const start = new Date(repairStartTime);
          const end = new Date(repairEndTime);
          const hours = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);
          parts.push(`Downtime: ${hours}h`);
        }
        if (repairLocation) parts.push(`Location: ${repairLocation}`);
        if (repairDescription) parts.push(`Issue: ${repairDescription}`);
        if (repairIssuePhotoUrl) parts.push(`Issue Photo: ${repairIssuePhotoUrl}`);
        if (repairCompleted) parts.push('Status: Repair Completed');
        if (parts.length) fullDescription = `${parts.join(' | ')}${description ? ` | Notes: ${description}` : ''}`;
      }
      fullDescription = `${fullDescription || ''} | Paid by: ${paidBy}`.trim();

      await loadApi.addExpense(load.id, {
        category,
        type: 'on_the_way',
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        description: fullDescription || undefined,
        location: (category === 'fuel' ? fuelStation : category === 'repair' ? repairLocation : location) || undefined,
        receiptUrl,
        paidBy,
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
    setLocation('');
    setReceiptFile(null);
    setFuelQuantity('');
    setFuelStation('');
    setOdometerBefore('');
    setOdometerAfter('');
    setOdometerBeforePhoto(null);
    setOdometerAfterPhoto(null);
    setRepairStartTime('');
    setRepairEndTime('');
    setRepairDescription('');
    setRepairLocation('');
    setRepairIssuePhoto(null);
    setRepairIssuePreview(null);
    setRepairCompleted(false);
    setPaidBy('driver');
    setError(null);
    setOcrAutoFilled(false);
    resetOCR();
    onClose();
  };

  const getCategoryTitle = () => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? `Log ${cat.label}` : 'Log Expense';
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{getCategoryTitle()}</Typography>
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            select
            fullWidth
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.icon && <Box component="span" sx={{ mr: 1, display: 'inline-flex' }}>{c.icon}</Box>}
                {c.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Amount ($)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            required
          />

          {/* Fuel-specific fields */}
          {category === 'fuel' && (
            <>
              <Divider sx={{ my: 0.5 }}><Typography variant="caption" color="text.secondary">Fuel Details</Typography></Divider>
              <TextField
                fullWidth
                label="Fuel Station / Location"
                value={fuelStation}
                onChange={(e) => setFuelStation(e.target.value)}
                placeholder="e.g. Pilot Travel Center, Exit 42"
              />
              <TextField
                fullWidth
                label="Fuel Quantity (gallons)"
                type="number"
                value={fuelQuantity}
                onChange={(e) => setFuelQuantity(e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Odometer Before"
                  type="number"
                  value={odometerBefore}
                  onChange={(e) => setOdometerBefore(e.target.value)}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  fullWidth
                  label="Odometer After"
                  type="number"
                  value={odometerAfter}
                  onChange={(e) => setOdometerAfter(e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" component="label" startIcon={<PhotoCamera />} size="small">
                  {odometerBeforePhoto ? 'Before ✓' : 'Scan Odometer Before'}
                  <input type="file" hidden accept="image/*" capture="environment" onChange={async (e) => {
                    const f = e.target.files?.[0] || null;
                    setOdometerBeforePhoto(f);
                    if (f) {
                      try {
                        const result = await analyze(f);
                        if (result) {
                          const ml = extractMileage(result.rawText);
                          if (ml && !odometerBefore) setOdometerBefore(String(ml));
                        }
                      } catch { /* non-critical */ }
                    }
                  }} />
                </Button>
                <Button variant="outlined" component="label" startIcon={<PhotoCamera />} size="small">
                  {odometerAfterPhoto ? 'After ✓' : 'Scan Odometer After'}
                  <input type="file" hidden accept="image/*" capture="environment" onChange={async (e) => {
                    const f = e.target.files?.[0] || null;
                    setOdometerAfterPhoto(f);
                    if (f) {
                      try {
                        const result = await analyze(f);
                        if (result) {
                          const ml = extractMileage(result.rawText);
                          if (ml && !odometerAfter) setOdometerAfter(String(ml));
                        }
                      } catch { /* non-critical */ }
                    }
                  }} />
                </Button>
              </Box>
            </>
          )}

          {/* Maintenance-specific fields */}
          {category === 'repair' && (
            <>
              <Divider sx={{ my: 0.5 }}><Typography variant="caption" color="text.secondary">Maintenance & Repair Details</Typography></Divider>
              
              {/* Issue Description */}
              <TextField
                fullWidth
                label="What happened? *"
                multiline
                rows={2}
                value={repairDescription}
                onChange={(e) => setRepairDescription(e.target.value)}
                placeholder="e.g. Tire blowout on highway, brake pad worn out, engine overheating..."
              />

              {/* Location */}
              <TextField
                fullWidth
                label="Repair Location"
                value={repairLocation}
                onChange={(e) => setRepairLocation(e.target.value)}
                placeholder="e.g. Joe's Truck Stop, Hwy 40 mile marker 120"
              />

              {/* Start & End Time */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Start Date & Time *"
                  type="datetime-local"
                  value={repairStartTime}
                  onChange={(e) => setRepairStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="End Date & Time"
                  type="datetime-local"
                  value={repairEndTime}
                  onChange={(e) => { setRepairEndTime(e.target.value); setRepairCompleted(true); }}
                  InputLabelProps={{ shrink: true }}
                  helperText={repairCompleted ? 'Repair completed' : 'Fill when repair is done'}
                />
              </Box>

              {/* Downtime Summary */}
              {repairStartTime && repairEndTime && (() => {
                const start = new Date(repairStartTime);
                const end = new Date(repairEndTime);
                const diffMs = end.getTime() - start.getTime();
                if (diffMs < 0) return (
                  <Alert severity="error" sx={{ py: 0.5 }}>
                    End time must be after start time
                  </Alert>
                );
                const hours = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                return (
                  <Alert severity="info" sx={{ py: 0.5 }} icon={false}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={600}>
                        Total Downtime: {hours}h {mins}m
                      </Typography>
                      <Chip
                        label={repairCompleted ? 'Repair Complete' : 'In Progress'}
                        size="small"
                        color={repairCompleted ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </Box>
                  </Alert>
                );
              })()}

              {repairStartTime && !repairEndTime && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  <Typography variant="body2">
                    Repair in progress. Enter end time when the fix is complete.
                  </Typography>
                </Alert>
              )}

              {/* Photo of Issue */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Photo of the Issue (for proof)
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoCamera />}
                  size="small"
                  fullWidth
                >
                  {repairIssuePhoto ? repairIssuePhoto.name : 'Take Photo of Issue'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setRepairIssuePhoto(f);
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = () => setRepairIssuePreview(reader.result as string);
                        reader.readAsDataURL(f);
                      } else {
                        setRepairIssuePreview(null);
                      }
                    }}
                  />
                </Button>
                {repairIssuePreview && (
                  <Box sx={{ mt: 1, position: 'relative' }}>
                    <img src={repairIssuePreview} alt="Issue" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
                    <Button
                      size="small"
                      onClick={() => { setRepairIssuePhoto(null); setRepairIssuePreview(null); }}
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', minWidth: 'auto', px: 1, '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                    >
                      ✕
                    </Button>
                  </Box>
                )}
              </Box>
            </>
          )}

          {/* Generic location for non-fuel */}
          {category !== 'fuel' && (
            <TextField
              fullWidth
              label="Location (Optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Toll plaza, Repair shop"
            />
          )}

          {/* Who paid */}
          <FormControl fullWidth>
            <InputLabel>Who Paid?</InputLabel>
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} label="Who Paid?">
              {PAYER_OPTIONS.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {paidBy === 'driver' && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              This expense will be marked for reimbursement.
            </Alert>
          )}

          <TextField
            fullWidth
            label="Additional Notes (Optional)"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any additional details"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Receipt Photo / Scan {ocrAnalyzing && '— 🔍 Analyzing...'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={ocrAnalyzing ? <CircularProgress size={16} /> : <PhotoCamera />}
                disabled={loading || ocrAnalyzing}
              >
                {receiptFile ? receiptFile.name : 'Scan or Upload Receipt'}
                <input
                  type="file"
                  hidden
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] || null;
                    setReceiptFile(file);
                    setOcrAutoFilled(false);
                    if (file) {
                      try {
                        const result = await analyze(file);
                        if (result) {
                          // Auto-fill amount from receipt
                          const extractedAmt = result.extractedFields?.amount
                            ? parseFloat(result.extractedFields.amount.replace(/[^0-9.]/g, ''))
                            : extractAmount(result.rawText);
                          if (extractedAmt && !amount) {
                            setAmount(String(extractedAmt));
                            setOcrAutoFilled(true);
                          }
                          // Auto-fill vendor/station for fuel
                          if (category === 'fuel' && result.extractedFields?.shipper && !fuelStation) {
                            setFuelStation(result.extractedFields.shipper);
                          }
                          // Auto-fill location
                          if (!location && (result.extractedFields?.shipper || result.extractedFields?.consignee)) {
                            setLocation(result.extractedFields.shipper || result.extractedFields.consignee || '');
                          }
                        }
                      } catch { /* OCR failure is non-critical */ }
                    }
                  }}
                />
              </Button>
              {receiptFile && (
                <Typography variant="caption" color="text.secondary">
                  ({(receiptFile.size / 1024).toFixed(0)} KB)
                </Typography>
              )}
              {ocrAutoFilled && (
                <Chip label="OCR" size="small" icon={<AutoFixHigh />} color="success" variant="outlined" />
              )}
            </Box>
            {ocrAutoFilled && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                ✅ Amount auto-filled from receipt — verify and edit if needed
              </Typography>
            )}
            {receiptFile && !ocrAnalyzing && !ocrAutoFilled && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Upload a clear photo for auto-fill, or enter details manually
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !amount}>
          {loading ? <CircularProgress size={16} /> : 'Log Expense'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
