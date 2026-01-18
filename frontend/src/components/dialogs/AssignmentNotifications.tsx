import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import assignmentApi from '../../api/assignment.api';

interface Assignment {
  _id: string;
  loadId: any;
  driverId: any;
  truckId?: any;
  trailerId?: any;
  status: string;
  createdAt: string;
  expiresAt: string;
  driverResponse?: {
    status: string;
    respondedAt: string;
    reason?: string;
  };
}

export const AssignmentNotifications: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assignmentApi.getPendingAssignments();
      console.log('Pending assignments loaded:', data);
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
      console.error('Error loading assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (assignment: Assignment) => {
    console.log('Opening details for assignment:', assignment);
    setSelectedAssignment(assignment);
    setShowDetailsDialog(true);
  };

  const handleAccept = async (assignmentId: string) => {
    try {
      setActionInProgress(true);
      await assignmentApi.acceptAssignment(assignmentId);
      setAssignments(assignments.filter((a) => a._id !== assignmentId));
      setSelectedAssignment(null);
      setShowDetailsDialog(false);
      alert('Assignment accepted successfully! You can now start the trip.');
      // Refresh to show trip workflow
      window.location.reload();
    } catch (err: any) {
      alert(`Error accepting assignment: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRejectClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedAssignment) return;

    try {
      setActionInProgress(true);
      await assignmentApi.rejectAssignment(
        selectedAssignment._id,
        rejectionReason || 'Not interested'
      );
      setAssignments(assignments.filter((a) => a._id !== selectedAssignment._id));
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedAssignment(null);
      alert('Assignment rejected successfully!');
      loadAssignments(); // Refresh list
    } catch (err: any) {
      alert(`Error rejecting assignment: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography color="textSecondary" align="center">
            No pending assignments at this time
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        sx={{ 
          mb: 3,
          border: '3px solid',
          borderColor: 'warning.main',
          boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
          animation: assignments.length > 0 ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%, 100%': {
              boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
            },
            '50%': {
              boxShadow: '0 8px 30px rgba(255, 152, 0, 0.6)',
            },
          },
        }}
      >
        <CardHeader
          sx={{
            bgcolor: 'warning.main',
            color: 'white',
          }}
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <LocalShippingIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  🚨 New Load Assignment! ({assignments.length})
                </Typography>
                <Typography variant="body2">
                  You have pending load assignments - Accept to start trip
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {assignments.map((assignment) => (
            <Box
              key={assignment._id}
              sx={{
                p: 3,
                mb: 2,
                border: '2px solid',
                borderColor: 'success.main',
                borderRadius: 2,
                bgcolor: '#f0f9ff',
                boxShadow: 2,
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <LocalShippingIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                    <Box flex={1}>
                      <Typography variant="h5" fontWeight={700} color="primary.main">
                        Load #{assignment.loadId?.loadNumber || 'Unknown'}
                      </Typography>
                      <Typography variant="body1" color="textSecondary" sx={{ mt: 0.5 }}>
                        📍 {assignment.loadId?.origin?.city || 'N/A'}, {assignment.loadId?.origin?.state || 'N/A'} → {assignment.loadId?.destination?.city || 'N/A'}, {assignment.loadId?.destination?.state || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Pickup Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {assignment.loadId?.pickupDate 
                      ? new Date(assignment.loadId.pickupDate).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })
                      : 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Delivery Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {assignment.loadId?.deliveryDate 
                      ? new Date(assignment.loadId.deliveryDate).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })
                      : 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    {assignment.truckId?.unitNumber && (
                      <Chip
                        label={`🚚 Truck: ${assignment.truckId.unitNumber}`}
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {assignment.trailerId?.unitNumber && (
                      <Chip
                        label={`🚛 Trailer: ${assignment.trailerId.unitNumber}`}
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {assignment.loadId?.rate && (
                      <Chip
                        label={`💰 Rate: $${assignment.loadId.rate.toLocaleString()}`}
                        color="success"
                        variant="filled"
                      />
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      ⏰ Please respond within 24 hours or this assignment will expire
                    </Typography>
                  </Alert>

                  <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      fullWidth
                      startIcon={<CheckCircleIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Accept Load ${assignment.loadId?.loadNumber}?\n\nThis will start your trip workflow.`)) {
                          handleAccept(assignment._id);
                        }
                      }}
                      disabled={actionInProgress}
                      sx={{ 
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                      }}
                    >
                      ✅ Accept & Start Trip
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="large"
                      fullWidth
                      startIcon={<CancelIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectClick(assignment);
                      }}
                      disabled={actionInProgress}
                      sx={{ py: 2 }}
                    >
                      ❌ Decline Load
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Assignment Details Dialog */}
      <Dialog 
        open={showDetailsDialog} 
        onClose={() => setShowDetailsDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LocalShippingIcon />
            Load Assignment Details
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedAssignment && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                You have been assigned this load. Please review the details and accept or decline within 24 hours.
              </Alert>

              <Typography variant="h6" gutterBottom>
                Load #{selectedAssignment.loadId?.loadNumber}
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Origin
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedAssignment.loadId?.origin || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Destination
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedAssignment.loadId?.destination || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Pickup Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedAssignment.loadId?.pickupDate
                      ? new Date(selectedAssignment.loadId.pickupDate).toLocaleDateString()
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Delivery Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedAssignment.loadId?.deliveryDate
                      ? new Date(selectedAssignment.loadId.deliveryDate).toLocaleDateString()
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Assigned Truck
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedAssignment.truckId?.unitNumber || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Assigned Trailer
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedAssignment.trailerId?.unitNumber || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>

              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="body2" fontWeight={600}>
                  This assignment expires in {' '}
                  {selectedAssignment.expiresAt
                    ? Math.max(0, Math.round((new Date(selectedAssignment.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
                    : '24'}{' '}
                  hours
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button 
            onClick={() => setShowDetailsDialog(false)}
            variant="outlined"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              if (selectedAssignment) {
                setShowDetailsDialog(false);
                handleRejectClick(selectedAssignment);
              }
            }}
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            disabled={actionInProgress}
          >
            Decline
          </Button>
          <Button
            onClick={() => {
              if (selectedAssignment) {
                setShowDetailsDialog(false);
                handleAccept(selectedAssignment._id);
              }
            }}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={actionInProgress}
          >
            Accept & Start Trip
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Decline Assignment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Are you sure you want to decline this load assignment?
          </Typography>
          <TextField
            fullWidth
            label="Reason for declining"
            placeholder="e.g., Not suitable for my truck, Too far, Insufficient rate, etc."
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            disabled={actionInProgress}
          >
            {actionInProgress ? 'Declining...' : 'Decline'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssignmentNotifications;
