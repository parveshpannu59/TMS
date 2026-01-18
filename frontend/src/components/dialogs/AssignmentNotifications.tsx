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

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assignmentApi.getPendingAssignments();
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (assignmentId: string) => {
    try {
      setActionInProgress(true);
      await assignmentApi.acceptAssignment(assignmentId);
      setAssignments(assignments.filter((a) => a._id !== assignmentId));
      setSelectedAssignment(null);
      alert('Assignment accepted successfully!');
      loadAssignments(); // Refresh list
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
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <LocalShippingIcon />
              Pending Load Assignments ({assignments.length})
            </Box>
          }
          subheader="Review and respond to assigned loads"
        />
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {assignments.map((assignment) => (
            <Box
              key={assignment._id}
              sx={{
                p: 2,
                mb: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                bgcolor: '#fafafa',
                '&:hover': {
                  bgcolor: '#f5f5f5',
                },
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6">
                    Load #{assignment.loadId?.loadNumber || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                    📍 {assignment.loadId?.origin} → {assignment.loadId?.destination}
                  </Typography>
                  {assignment.loadId?.pickupDate && (
                    <Typography variant="body2" color="textSecondary">
                      📅 Pickup: {new Date(assignment.loadId.pickupDate).toLocaleDateString()}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    {assignment.truckId?.unitNumber && (
                      <Chip
                        label={`🚚 ${assignment.truckId.unitNumber}`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                    {assignment.trailerId?.unitNumber && (
                      <Chip
                        label={`🚛 ${assignment.trailerId.unitNumber}`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                    <Chip
                      label="⏱️ 24h to respond"
                      variant="outlined"
                      size="small"
                      color="warning"
                    />
                  </Box>

                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleAccept(assignment._id)}
                      disabled={actionInProgress}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={() => handleRejectClick(assignment)}
                      disabled={actionInProgress}
                    >
                      Reject
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Assignment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Are you sure you want to reject this load assignment?
          </Typography>
          <TextField
            fullWidth
            label="Reason for rejection"
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
            {actionInProgress ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssignmentNotifications;
