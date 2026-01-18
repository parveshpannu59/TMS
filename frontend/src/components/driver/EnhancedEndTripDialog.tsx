import React, { useState, useRef } from 'react';
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
  Grid,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { 
  PhotoCamera, 
  Close, 
  Add,
  Delete,
  AttachFile,
  CheckCircle,
  LocalGasStation,
  TollOutlined,
  LocalShipping,
  Receipt,
  Description,
} from '@mui/icons-material';
import type { Load } from '@/types/all.types';
import type { EndTripData, TripExpense, ExpenseType } from '@/types/trip.types';

interface EnhancedEndTripDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  tripId: string;
  startingMileage: number;
  ratePerMile: number;
  onSubmit: (data: EndTripData) => Promise<void>;
}

export const EnhancedEndTripDialog: React.FC<EnhancedEndTripDialogProps> = ({
  open,
  onClose,
  load,
  tripId,
  startingMileage,
  ratePerMile,
  onSubmit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [endingMileage, setEndingMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
  const [odometerPhotoPreview, setOdometerPhotoPreview] = useState<string | null>(null);
  const [bolPhoto, setBolPhoto] = useState<File | null>(null);
  const [podPhoto, setPodPhoto] = useState<File | null>(null);
  const [otherDocs, setOtherDocs] = useState<File[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  
  // New expense form
  const [newExpenseType, setNewExpenseType] = useState<ExpenseType | ''>('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseLocation, setNewExpenseLocation] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const odometerInputRef = useRef<HTMLInputElement>(null);
  const bolInputRef = useRef<HTMLInputElement>(null);
  const podInputRef = useRef<HTMLInputElement>(null);
  const otherDocsInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPhoto: (file: File | null) => void,
    setPreview?: (preview: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size should be less than 10MB');
        return;
      }
      
      if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
        setError('Please select a valid image or PDF file');
        return;
      }
      
      setPhoto(file);
      if (setPreview && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
      setError(null);
    }
  };

  const handleOtherDocsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        return false;
      }
      return file.type.startsWith('image/') || file.type.includes('pdf');
    });
    
    setOtherDocs(prev => [...prev, ...validFiles]);
  };

  const handleAddExpense = () => {
    if (!newExpenseType || !newExpenseAmount) {
      setError('Please select expense type and enter amount');
      return;
    }

    const amount = parseFloat(newExpenseAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid amount');
      return;
    }

    const expense: TripExpense = {
      type: newExpenseType as ExpenseType,
      amount,
      description: newExpenseDesc.trim() || undefined,
      location: newExpenseLocation.trim() || undefined,
      date: new Date().toISOString(),
    };

    setExpenses(prev => [...prev, expense]);
    
    // Reset form
    setNewExpenseType('');
    setNewExpenseAmount('');
    setNewExpenseDesc('');
    setNewExpenseLocation('');
    setError(null);
  };

  const handleRemoveExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!endingMileage || !odometerPhoto) {
      setError('Please enter ending mileage and upload odometer photo');
      return;
    }

    const mileage = parseInt(endingMileage);
    if (isNaN(mileage) || mileage < 0) {
      setError('Please enter a valid mileage value');
      return;
    }

    if (mileage <= startingMileage) {
      setError('Ending mileage must be greater than starting mileage');
      return;
    }

    if (!bolPhoto) {
      setError('Please upload Bill of Lading');
      return;
    }

    if (!podPhoto) {
      setError('Please upload Proof of Delivery');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tripData: EndTripData = {
        tripId,
        endingMileage: mileage,
        odometerEndPhoto: odometerPhoto,
        expenses,
        documents: {
          billOfLading: bolPhoto,
          proofOfDelivery: podPhoto,
          other: otherDocs.length > 0 ? otherDocs : undefined,
        },
        notes: notes.trim() || undefined,
      };

      await onSubmit(tripData);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to complete trip');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEndingMileage('');
      setNotes('');
      setOdometerPhoto(null);
      setOdometerPhotoPreview(null);
      setBolPhoto(null);
      setPodPhoto(null);
      setOtherDocs([]);
      setExpenses([]);
      setNewExpenseType('');
      setNewExpenseAmount('');
      setNewExpenseDesc('');
      setNewExpenseLocation('');
      setError(null);
      onClose();
    }
  };

  // Calculate totals
  const totalMiles = endingMileage ? parseInt(endingMileage) - startingMileage : 0;
  const totalEarnings = totalMiles * ratePerMile;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netEarnings = totalEarnings - totalExpenses;

  const getExpenseIcon = (type: ExpenseType) => {
    switch (type) {
      case 'fuel': return <LocalGasStation />;
      case 'toll': return <TollOutlined />;
      case 'loading':
      case 'offloading': return <LocalShipping />;
      default: return <Receipt />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            <Typography variant="h6">Complete Trip</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={loading}>
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

        {/* Trip Summary */}
        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'success.light', borderColor: 'success.main' }}>
          <CardContent>
            <Typography variant="subtitle2" color="success.dark" gutterBottom>
              Trip Earnings Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Starting Miles</Typography>
                <Typography variant="h6">{startingMileage}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Ending Miles</Typography>
                <Typography variant="h6">{endingMileage || '--'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Total Miles</Typography>
                <Typography variant="h6" color="primary">{totalMiles || '--'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Gross Earnings</Typography>
                <Typography variant="h6" color="success.dark">
                  ${totalEarnings.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
            
            {expenses.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Total Expenses</Typography>
                    <Typography variant="body1" color="error">
                      -${totalExpenses.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Net Earnings</Typography>
                    <Typography variant="h6" color="success.dark">
                      ${netEarnings.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Left Column - Mileage & Documents */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Ending Mileage */}
              <TextField
                fullWidth
                label="Ending Odometer Mileage *"
                type="number"
                value={endingMileage}
                onChange={(e) => setEndingMileage(e.target.value)}
                placeholder="Enter final odometer reading"
                required
                disabled={loading}
                inputProps={{ min: startingMileage + 1, step: 1 }}
                helperText={`Must be greater than ${startingMileage}`}
              />

              {/* Ending Odometer Photo */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Ending Odometer Photo *
                </Typography>
                <input
                  ref={odometerInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoSelect(e, setOdometerPhoto, setOdometerPhotoPreview)}
                  style={{ display: 'none' }}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PhotoCamera />}
                  onClick={() => odometerInputRef.current?.click()}
                  disabled={loading}
                >
                  {odometerPhoto ? `✓ ${odometerPhoto.name}` : 'Upload Odometer Photo'}
                </Button>
              </Box>

              {/* Bill of Lading */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Bill of Lading (BOL) *
                </Typography>
                <input
                  ref={bolInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handlePhotoSelect(e, setBolPhoto)}
                  style={{ display: 'none' }}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Description />}
                  onClick={() => bolInputRef.current?.click()}
                  disabled={loading}
                  color={bolPhoto ? 'success' : 'primary'}
                >
                  {bolPhoto ? `✓ ${bolPhoto.name}` : 'Upload Bill of Lading'}
                </Button>
              </Box>

              {/* Proof of Delivery */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Proof of Delivery (POD) *
                </Typography>
                <input
                  ref={podInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handlePhotoSelect(e, setPodPhoto)}
                  style={{ display: 'none' }}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Description />}
                  onClick={() => podInputRef.current?.click()}
                  disabled={loading}
                  color={podPhoto ? 'success' : 'primary'}
                >
                  {podPhoto ? `✓ ${podPhoto.name}` : 'Upload Proof of Delivery'}
                </Button>
              </Box>

              {/* Other Documents */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Other Documents (Optional)
                </Typography>
                <input
                  ref={otherDocsInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleOtherDocsSelect}
                  style={{ display: 'none' }}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AttachFile />}
                  onClick={() => otherDocsInputRef.current?.click()}
                  disabled={loading}
                >
                  Add Documents ({otherDocs.length})
                </Button>
                {otherDocs.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {otherDocs.map((doc, idx) => (
                      <Chip
                        key={idx}
                        label={doc.name}
                        onDelete={() => setOtherDocs(prev => prev.filter((_, i) => i !== idx))}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Right Column - Expenses */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Trip Expenses
            </Typography>
            
            {/* Add Expense Form */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Expense Type"
                      value={newExpenseType}
                      onChange={(e) => setNewExpenseType(e.target.value as ExpenseType)}
                    >
                      <MenuItem value="fuel">Fuel</MenuItem>
                      <MenuItem value="toll">Toll</MenuItem>
                      <MenuItem value="loading">Loading Charges</MenuItem>
                      <MenuItem value="offloading">Offloading Charges</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Amount"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Description (Optional)"
                      value={newExpenseDesc}
                      onChange={(e) => setNewExpenseDesc(e.target.value)}
                      placeholder="E.g., Gas station receipt"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Location (Optional)"
                      value={newExpenseLocation}
                      onChange={(e) => setNewExpenseLocation(e.target.value)}
                      placeholder="E.g., Dallas, TX"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddExpense}
                      disabled={!newExpenseType || !newExpenseAmount}
                    >
                      Add Expense
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Expense List */}
            {expenses.length > 0 ? (
              <List dense>
                {expenses.map((expense, idx) => (
                  <ListItem key={idx} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}>
                    <Box sx={{ mr: 2 }}>
                      {getExpenseIcon(expense.type)}
                    </Box>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {expense.type.replace('_', ' ')}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            ${expense.amount.toFixed(2)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          {expense.description && (
                            <Typography variant="caption" display="block">
                              {expense.description}
                            </Typography>
                          )}
                          {expense.location && (
                            <Typography variant="caption" color="text.secondary">
                              📍 {expense.location}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveExpense(idx)}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                <Divider sx={{ my: 1 }} />
                <ListItem>
                  <ListItemText primary="Total Expenses" />
                  <Typography variant="h6" color="error">
                    ${totalExpenses.toFixed(2)}
                  </Typography>
                </ListItem>
              </List>
            ) : (
              <Alert severity="info">
                No expenses added. Add any trip-related expenses above.
              </Alert>
            )}
          </Grid>
        </Grid>

        {/* Notes */}
        <TextField
          fullWidth
          label="Trip Notes (Optional)"
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any final notes about the trip..."
          disabled={loading}
          sx={{ mt: 3 }}
        />

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={500} gutterBottom>
            Trip Completion Checklist:
          </Typography>
          <Typography variant="caption" component="div">
            ✓ Accurate ending mileage entered<br />
            ✓ All documents uploaded (BOL & POD required)<br />
            ✓ All expenses logged with receipts<br />
            ✓ Vehicle returned in good condition
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={loading || !endingMileage || !odometerPhoto || !bolPhoto || !podPhoto}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
        >
          {loading ? 'Completing Trip...' : 'Complete Trip'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
