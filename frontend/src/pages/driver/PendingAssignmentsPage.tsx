import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  Dialog,
} from '@mui/material';
import {
  LocalShipping,
  LocationOn,
  CalendarToday,
  AttachMoney,
  CheckCircle,
  Cancel,
  Timer,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { assignmentApi } from '@/api/assignment.api';
import { loadApi } from '@/api/all.api';
import { AcceptRejectAssignmentDialog } from '@/components/driver/AcceptRejectAssignmentDialog';
import type { Load } from '@/types/all.types';

interface Assignment {
  _id: string;
  loadId: string;
  driverId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: string;
  createdAt: string;
  load?: Load;
}

export const PendingAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assignmentApi.getPendingAssignments();
      setAssignments(data || []);
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
      setError(err.response?.data?.message || 'Failed to load pending assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleOpenAssignment = async (assignment: Assignment) => {
    try {
      // Fetch the full load details
      const load = await loadApi.getLoadById(assignment.loadId);
      setSelectedLoad(load);
      setSelectedAssignmentId(assignment._id);
      setDialogOpen(true);
    } catch (err: any) {
      setError('Failed to load assignment details. Please try again.');
      console.error('Error loading assignment:', err);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedLoad(null);
    setSelectedAssignmentId(null);
    // Refresh assignments after accept/reject
    fetchAssignments();
  };

  const handleAccept = async (assignmentId: string) => {
    await assignmentApi.acceptAssignment(assignmentId);
    handleCloseDialog();
  };

  const handleReject = async (assignmentId: string, reason: string) => {
    await assignmentApi.rejectAssignment(assignmentId, reason);
    handleCloseDialog();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusColor = (status: string, expiresAt: string) => {
    if (isExpired(expiresAt)) return 'error';
    if (status === 'accepted') return 'success';
    if (status === 'rejected') return 'error';
    return 'default';
  };

  const getStatusIcon = (status: string, expiresAt: string) => {
    if (isExpired(expiresAt)) return <Timer sx={{ color: 'error.main' }} />;
    if (status === 'accepted') return <CheckCircle sx={{ color: 'success.main' }} />;
    if (status === 'rejected') return <Cancel sx={{ color: 'error.main' }} />;
    return <Timer sx={{ color: 'warning.main' }} />;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Pending Assignments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review and accept/reject load assignments
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : assignments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LocalShipping sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Pending Assignments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don't have any pending load assignments at the moment.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {assignments.map((assignment) => {
            const expired = isExpired(assignment.expiresAt);
            const load = assignment.load;

            return (
              <Grid item xs={12} sm={6} md={4} key={assignment._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: expired ? 0.6 : 1,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: 4,
                      transform: expired ? 'none' : 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Header with load number and status */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" fontWeight={600}>
                        {load?.loadNumber || 'Load #Unknown'}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(assignment.status, assignment.expiresAt)}
                        label={expired ? 'Expired' : assignment.status}
                        color={getStatusColor(assignment.status, assignment.expiresAt) as any}
                        size="small"
                      />
                    </Box>

                    {/* Load Details */}
                    {load && (
                      <>
                        {/* Pickup Location */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <LocationOn sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Pickup
                            </Typography>
                            <Typography variant="body2">
                              {typeof load.pickupLocation === 'string'
                                ? load.pickupLocation
                                : (load.pickupLocation as any)?.city || 'N/A'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Delivery Location */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <LocalShipping sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Delivery
                            </Typography>
                            <Typography variant="body2">
                              {typeof load.deliveryLocation === 'string'
                                ? load.deliveryLocation
                                : (load.deliveryLocation as any)?.city || 'N/A'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Distance and Rate */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Distance
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {load.distance || 0} miles
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Rate
                            </Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ color: 'success.main' }}>
                              ${load.rate || 0}/mi
                            </Typography>
                          </Box>
                        </Box>

                        {/* Expected Earnings */}
                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor: 'success.light',
                            borderRadius: 1,
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <AttachMoney sx={{ color: 'success.main', mr: 1 }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Est. Earnings
                            </Typography>
                            <Typography variant="body1" fontWeight={600} sx={{ color: 'success.main' }}>
                              ${((load.distance || 0) * (load.rate || 0)).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Expiration time */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CalendarToday sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color={expired ? 'error' : 'text.secondary'}>
                            {expired ? (
                              <>Expired: {format(new Date(assignment.expiresAt), 'MMM dd, HH:mm')}</>
                            ) : (
                              <>Expires: {format(new Date(assignment.expiresAt), 'MMM dd, HH:mm')}</>
                            )}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </CardContent>

                  {/* Actions */}
                  <CardActions sx={{ pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color={expired ? 'inherit' : 'primary'}
                      onClick={() => handleOpenAssignment(assignment)}
                      disabled={expired || assignment.status !== 'pending'}
                      sx={{ textTransform: 'none' }}
                    >
                      {expired
                        ? 'Expired'
                        : assignment.status === 'pending'
                          ? 'Review'
                          : assignment.status === 'accepted'
                            ? 'Accepted'
                            : 'Rejected'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Assignment Dialog */}
      <AcceptRejectAssignmentDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        load={selectedLoad}
        assignmentId={selectedAssignmentId}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </Container>
  );
};

export default PendingAssignmentsPage;
