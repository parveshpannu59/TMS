import React, { useState } from 'react';
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
  Divider,
  useTheme,
  useMediaQuery,
  Grid,
} from '@mui/material';
import { Close, AttachMoney, LocalGasStation, Toll, Build } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

interface EndTripDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
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
  const [totalMiles, setTotalMiles] = useState('');
  const [rate, setRate] = useState('');
  const [fuelExpenses, setFuelExpenses] = useState('');
  const [tolls, setTolls] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [additionalExpenseDetails, setAdditionalExpenseDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startingMileage = load.tripStartDetails?.startingMileage || 0;
  const calculatedMiles = endingMileage && startingMileage
    ? parseInt(endingMileage) - startingMileage
    : 0;
  const totalPayment = totalMiles && rate
    ? parseFloat(totalMiles) * parseFloat(rate)
    : 0;
  const totalExpenses = (parseFloat(fuelExpenses) || 0) + 
                        (parseFloat(tolls) || 0) + 
                        (parseFloat(otherCosts) || 0);

  const handleSubmit = async () => {
    if (!endingMileage || !totalMiles || !rate) {
      setError('Please fill in ending mileage, total miles, and rate');
      return;
    }

    if (parseInt(endingMileage) < startingMileage) {
      setError('Ending mileage cannot be less than starting mileage');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await loadApi.endTrip(load.id, {
        endingMileage: parseInt(endingMileage),
        totalMiles: parseFloat(totalMiles),
        rate: parseFloat(rate),
        fuelExpenses: parseFloat(fuelExpenses) || 0,
        tolls: parseFloat(tolls) || 0,
        otherCosts: parseFloat(otherCosts) || 0,
        additionalExpenseDetails,
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
    setTotalMiles('');
    setRate('');
    setFuelExpenses('');
    setTolls('');
    setOtherCosts('');
    setAdditionalExpenseDetails('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">End Trip - Complete Details</Typography>
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
          {/* Mileage Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Mileage Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Starting Mileage"
                  value={startingMileage}
                  disabled
                  helperText="Recorded at trip start"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ending Mileage *"
                  type="number"
                  value={endingMileage}
                  onChange={(e) => {
                    setEndingMileage(e.target.value);
                    if (startingMileage) {
                      const calculated = parseInt(e.target.value) - startingMileage;
                      if (calculated > 0) {
                        setTotalMiles(calculated.toString());
                      }
                    }
                  }}
                  required
                  inputProps={{ min: startingMileage }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Miles *"
                  type="number"
                  value={totalMiles}
                  onChange={(e) => setTotalMiles(e.target.value)}
                  required
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText={calculatedMiles > 0 ? `Calculated: ${calculatedMiles} miles` : ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Pay Per Mile Rate ($) *"
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <AttachMoney sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
            </Grid>
            {totalPayment > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  Total Payment: ${totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Alert>
            )}
          </Box>

          <Divider />

          {/* Expenses Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Trip Expenses
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Fuel Expenses ($)"
                  type="number"
                  value={fuelExpenses}
                  onChange={(e) => setFuelExpenses(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <LocalGasStation sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Tolls ($)"
                  type="number"
                  value={tolls}
                  onChange={(e) => setTolls(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <Toll sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Other Costs ($)"
                  type="number"
                  value={otherCosts}
                  onChange={(e) => setOtherCosts(e.target.value)}
                  placeholder="Loading, offloading, etc."
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <Build sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
            </Grid>
            {totalExpenses > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  Total Expenses: ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Alert>
            )}
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Additional Expense Details (Optional)"
              value={additionalExpenseDetails}
              onChange={(e) => setAdditionalExpenseDetails(e.target.value)}
              placeholder="Any additional notes about expenses"
              sx={{ mt: 2 }}
            />
          </Box>

          <Divider />

          {/* Summary */}
          {totalPayment > 0 && (
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Payment Summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Total Payment:</Typography>
                <Typography variant="body2" fontWeight={600}>
                  ${totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Total Expenses:</Typography>
                <Typography variant="body2" fontWeight={600}>
                  ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1" fontWeight={700}>Net Amount:</Typography>
                <Typography variant="body1" fontWeight={700} color="primary.main">
                  ${(totalPayment - totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={loading || !endingMileage || !totalMiles || !rate}
        >
          {loading ? <CircularProgress size={16} /> : 'End Trip & Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
