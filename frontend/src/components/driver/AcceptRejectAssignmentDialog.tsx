import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  TextField,
  Alert,
  Divider,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  LocalShipping,
  LocationOn,
  CalendarToday,
  AttachMoney,
  CheckCircle,
  Cancel,
  Warning,
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { Load } from '@/types/all.types';

interface AcceptRejectAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load | null;
  assignmentId: string | null;
  onAccept: (assignmentId: string) => Promise<void>;
  onReject: (assignmentId: string, reason: string) => Promise<void>;
}

export const AcceptRejectAssignmentDialog: React.FC<AcceptRejectAssignmentDialogProps> = ({
  open,
  onClose,
  load,
  assignmentId,
  onAccept,
  onReject,
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!assignmentId) return;
    
    try {
      setLoading(true);
      setError(null);
      await onAccept(assignmentId);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!assignmentId || !rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await onReject(assignmentId, rejectionReason);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowRejectForm(false);
    setRejectionReason('');
    setError(null);
    onClose();
  };

  if (!load) return null;

  // Calculate estimated pay based on distance and rate
  const estimatedPay = load.rate && (load.distance || (load as any).miles)
    ? `$${(load.rate * (load.distance || (load as any).miles)).toFixed(2)}`
    : 'N/A';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LocalShipping color="primary" />
          <Typography variant="h6">New Load Assignment</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Load Details
            </Typography>
            <Typography variant="h6" gutterBottom>
              {load.loadNumber || `LOAD-${load.id?.substring(0, 8)}`}
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Pickup Location */}
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="start" gap={1}>
                  <LocationOn color="success" sx={{ fontSize: 20, mt: 0.3 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Pickup Location
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {typeof load.pickupLocation === 'string' 
                        ? load.pickupLocation 
                        : (load.pickupLocation as any)?.address || 'N/A'}
                    </Typography>
                    {load.pickupDate && (
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(load.pickupDate), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Delivery Location */}
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="start" gap={1}>
                  <LocationOn color="error" sx={{ fontSize: 20, mt: 0.3 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Delivery Location
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {typeof load.deliveryLocation === 'string'
                        ? load.deliveryLocation
                        : (load.deliveryLocation as any)?.address || 'N/A'}
                    </Typography>
                    {load.expectedDeliveryDate && (
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(load.expectedDeliveryDate), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Distance */}
              {(load.distance || (load as any).miles) && (
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Distance
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {(load.distance || (load as any).miles)} mi
                  </Typography>
                </Grid>
              )}

              {/* Rate per Mile */}
              {load.rate && (
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Rate/Mile
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    ${load.rate}
                  </Typography>
                </Grid>
              )}

              {/* Weight */}
              {load.weight && (
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Weight
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {load.weight} lbs
                  </Typography>
                </Grid>
              )}

              {/* Commodity */}
              {(load.cargoType || (load as any).commodity) && (
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Commodity
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {load.cargoType || (load as any).commodity}
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Estimated Earnings */}
            <Box 
              sx={{ 
                bgcolor: 'success.light', 
                color: 'success.dark',
                p: 2, 
                borderRadius: 1,
                textAlign: 'center'
              }}
            >
              <Typography variant="caption">
                Estimated Earnings
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {estimatedPay}
              </Typography>
              {load.rate && load.distance && (
                <Typography variant="caption">
                  ({load.distance} miles × ${load.rate}/mile)
                </Typography>
              )}
            </Box>

            {load.specialInstructions && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Special Instructions
                </Typography>
                <Typography variant="body2">
                  {load.specialInstructions || (load as any).internalNotes}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Rejection Form */}
        {showRejectForm && (
          <Card variant="outlined" sx={{ bgcolor: 'error.light', borderColor: 'error.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Warning color="error" />
                <Typography variant="subtitle2" color="error.dark">
                  Reason for Rejection
                </Typography>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Please provide a reason for rejecting this assignment..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={loading}
                variant="outlined"
                sx={{ bgcolor: 'white' }}
              />
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!showRejectForm ? (
          <>
            <Button
              onClick={() => setShowRejectForm(true)}
              startIcon={<Cancel />}
              color="error"
              disabled={loading}
            >
              Reject
            </Button>
            <Button
              onClick={handleAccept}
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
              color="success"
              disabled={loading}
            >
              Accept Load
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setShowRejectForm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <Cancel />}
              color="error"
              disabled={loading || !rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
