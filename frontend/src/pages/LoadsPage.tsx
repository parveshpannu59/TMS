import React, { useState } from 'react';
import {
  Box, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Divider, Chip, Grid, CircularProgress,
} from '@mui/material';
import {
  CheckCircle, MonetizationOn, LocalShipping, AccessTime,
  RateReview, Payments,
} from '@mui/icons-material';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Load, LoadFormData, loadApi } from '@/api/load.api';
import { ConfirmRateDialog } from '@/components/dialogs/ConfirmRateDialog';
import { useLoadsPage } from '@/hooks/useLoadsPage';
import {
  LoadsHeader,
  LoadsStats,
  LoadsFilters,
  LoadsDataGrid,
  LoadsAssignDialog,
  LoadsNotesDialog,
  LoadsCreateEditDialog,
  LoadDetailsDialog,
} from '@/components/loads';
import { useTranslation } from 'react-i18next';

// ═══════════════════════════════════════════════════════════════
// REVIEW COMPLETION DIALOG
// ═══════════════════════════════════════════════════════════════
function ReviewCompletionDialog({
  open, onClose, load, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  load: Load | null;
  onSuccess: () => void;
}) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [adjustedPayment, setAdjustedPayment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!load) return null;

  const tripDetails = (load as any).tripCompletionDetails;
  const calcPayment = tripDetails?.totalPayment || 0;
  const expenses = tripDetails?.expenses;
  const driverName = (load as any).driverId?.name || 'Driver';

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await loadApi.confirmCompletion(load._id, {
        reviewNotes: reviewNotes || undefined,
        adjustedPayment: adjustedPayment ? Number(adjustedPayment) : undefined,
      });
      onSuccess();
      setReviewNotes('');
      setAdjustedPayment('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to confirm completion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <RateReview color="warning" />
        Review & Confirm Completion
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Load Info */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {load.loadNumber}
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Driver</Typography>
              <Typography variant="body2" fontWeight={600}>{driverName}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box><Chip label="DELIVERED" color="warning" size="small" /></Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Route</Typography>
              <Typography variant="body2">
                {(load as any).pickupLocation?.city || '—'} → {(load as any).deliveryLocation?.city || '—'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Delivered At</Typography>
              <Typography variant="body2">
                {(load as any).deliveredAt ? new Date((load as any).deliveredAt).toLocaleString() : (load as any).tripEndedAt ? new Date((load as any).tripEndedAt).toLocaleString() : '—'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Trip Summary */}
        {tripDetails && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocalShipping fontSize="small" /> Trip Summary
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Box sx={{ p: 1.5, bgcolor: 'success.50', borderRadius: 1.5, textAlign: 'center', border: '1px solid', borderColor: 'success.200' }}>
                  <Typography variant="caption" color="text.secondary">Total Miles</Typography>
                  <Typography variant="h6" fontWeight={700}>{tripDetails.totalMiles || '—'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 1.5, textAlign: 'center', border: '1px solid', borderColor: 'primary.200' }}>
                  <Typography variant="caption" color="text.secondary">Rate/Mile</Typography>
                  <Typography variant="h6" fontWeight={700}>${tripDetails.rate || 0}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 1.5, bgcolor: 'warning.50', borderRadius: 1.5, textAlign: 'center', border: '1px solid', borderColor: 'warning.200' }}>
                  <Typography variant="caption" color="text.secondary">Total Payment</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">${calcPayment}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Expenses */}
        {expenses && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MonetizationOn fontSize="small" /> Expenses Reported
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {expenses.fuelExpenses > 0 && <Chip label={`Fuel: $${expenses.fuelExpenses}`} size="small" variant="outlined" />}
              {expenses.tolls > 0 && <Chip label={`Tolls: $${expenses.tolls}`} size="small" variant="outlined" />}
              {expenses.otherCosts > 0 && <Chip label={`Other: $${expenses.otherCosts}`} size="small" variant="outlined" />}
              <Chip label={`Total Expenses: $${expenses.totalExpenses || 0}`} size="small" color="error" variant="outlined" />
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Adjusted Payment */}
        <TextField
          fullWidth
          label="Adjusted Payment Amount (optional)"
          type="number"
          value={adjustedPayment}
          onChange={(e) => setAdjustedPayment(e.target.value)}
          placeholder={`Default: $${calcPayment}`}
          helperText={adjustedPayment ? `Adjusted: $${adjustedPayment} (original: $${calcPayment})` : `Will use calculated amount: $${calcPayment}`}
          sx={{ mb: 2 }}
          InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography> }}
        />

        {/* Review Notes */}
        <TextField
          fullWidth
          label="Review Notes (optional)"
          multiline
          rows={3}
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="Add any notes about this completion..."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} /> : <CheckCircle />}
        >
          {submitting ? 'Confirming...' : 'Confirm Completion & Approve Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// MANAGE PAYMENT DIALOG
// ═══════════════════════════════════════════════════════════════
function ManagePaymentDialog({
  open, onClose, load, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  load: Load | null;
  onSuccess: () => void;
}) {
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!load) return null;

  const paymentAmount = (load as any).paymentAmount || (load as any).tripCompletionDetails?.totalPayment || 0;
  const paymentStatus = (load as any).paymentStatus || 'pending';

  const handleMarkPaid = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await loadApi.markPaymentPaid(load._id, {
        paymentNotes: paymentNotes || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      onSuccess();
      setPaymentNotes('');
      setPaymentMethod('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to mark payment as paid');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Payments color="success" />
        Manage Payment
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">Approved Payment</Typography>
          <Typography variant="h4" fontWeight={800} color="success.main">${paymentAmount}</Typography>
          <Chip
            label={paymentStatus === 'paid' ? 'PAID' : paymentStatus === 'approved' ? 'APPROVED - PENDING PAYMENT' : 'PENDING'}
            color={paymentStatus === 'paid' ? 'success' : paymentStatus === 'approved' ? 'warning' : 'default'}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        <TextField
          fullWidth
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          placeholder="e.g., Bank Transfer, Check, Cash"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Payment Notes"
          multiline
          rows={2}
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
          placeholder="Transaction ID or reference..."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleMarkPaid}
          disabled={submitting || paymentStatus === 'paid'}
          startIcon={submitting ? <CircularProgress size={18} /> : <Payments />}
        >
          {paymentStatus === 'paid' ? 'Already Paid' : submitting ? 'Processing...' : 'Mark as Paid'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const LoadsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const {
    loads,
    filteredLoads,
    trucks,
    trailers,
    drivers,
    loading,
    error: apiError,
    stats,
    totalRows,
    paginationModel,
    handlePaginationModelChange,
    fetchLoads,
    fetchResources,
    assignLoad,
    unassignLoad,
    createLoad,
    updateLoad,
    deleteLoad,
    setError: setApiError,
  } = useLoadsPage({ searchTerm, statusFilter, priorityFilter });

  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openConfirmRateDialog, setOpenConfirmRateDialog] = useState(false);
  const [confirmingRateLoad, setConfirmingRateLoad] = useState<Load | null>(null);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState('');
  const [notesTitle, setNotesTitle] = useState('Notes');
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [assigningLoad, setAssigningLoad] = useState<Load | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<import('@/api/driver.api').Driver | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<import('@/api/truck.api').Truck | null>(null);
  const [selectedTrailer, setSelectedTrailer] = useState<import('@/api/trailer.api').Trailer | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [detailsLoad, setDetailsLoad] = useState<Load | null>(null);

  // Review & Payment dialogs
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [reviewingLoad, setReviewingLoad] = useState<Load | null>(null);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentLoad, setPaymentLoad] = useState<Load | null>(null);

  const errorState = error ?? apiError;
  const setErrorState = (v: string | null) => {
    setError(v);
    setApiError(v);
  };

  const handleOpenDialog = (load?: Load) => {
    setEditingLoad(load ?? null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLoad(null);
  };

  const handleOpenAssignDialog = (load: Load) => {
    setAssigningLoad(load);
    setSelectedDriver(null);
    setSelectedTruck(null);
    setSelectedTrailer(null);
    fetchResources();
    setOpenAssignDialog(true);
  };

  const handleCloseAssignDialog = () => {
    setOpenAssignDialog(false);
    setAssigningLoad(null);
    setSelectedDriver(null);
    setSelectedTruck(null);
    setSelectedTrailer(null);
  };

  const handleAssignLoad = async () => {
    if (!assigningLoad || !selectedDriver || !selectedTruck || !selectedTrailer) {
      setErrorState('Please select Driver, Truck, and Trailer');
      return;
    }
    try {
      const driverId = (selectedDriver as { _id?: string; id?: string })._id ?? (selectedDriver as { _id?: string; id?: string }).id ?? '';
      const truckId = (selectedTruck as { _id?: string; id?: string })._id ?? (selectedTruck as { _id?: string; id?: string }).id ?? '';
      const trailerId = (selectedTrailer as { _id?: string; id?: string })._id ?? (selectedTrailer as { _id?: string; id?: string }).id ?? '';
      // Close dialog immediately, then assign in background
      handleCloseAssignDialog();
      await assignLoad(assigningLoad._id, { driverId, truckId, trailerId });
      setSuccess('Load assigned successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setErrorState(err instanceof Error ? err.message : 'Failed to assign load');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this load?')) return;
    try {
      await deleteLoad(id);
      setSuccess('Load deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setErrorState(err instanceof Error ? err.message : 'Failed to delete load');
    }
  };

  const handleUnassignLoad = async (load: Load) => {
    const reason = window.prompt('Enter reason for unassigning (optional):', 'Driver reassignment');
    if (reason === null) return;
    try {
      await unassignLoad(load._id, reason || undefined);
      setSuccess('Load unassigned. Now available for reassignment.');
      handleOpenAssignDialog(load);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setErrorState(err instanceof Error ? err.message : 'Failed to unassign load');
    }
  };

  const handleCreateSuccess = () => {
    setSuccess('Load created successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUpdateSuccess = () => {
    setSuccess('Load updated successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <LoadsHeader onAddLoad={() => handleOpenDialog()} />

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {errorState && (
            <Alert severity="error" onClose={() => setErrorState(null)} sx={{ mb: 2 }} variant="outlined">
              {errorState}
            </Alert>
          )}
          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }} variant="outlined">
              {success}
            </Alert>
          )}

          {loads.length > 0 && (
            <LoadsStats
              total={stats.total}
              booked={stats.booked}
              inTransit={stats.inTransit}
              delivered={stats.delivered}
              completed={stats.completed}
              totalRevenue={stats.totalRevenue}
            />
          )}

          <LoadsFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            onSearchChange={setSearchTerm}
            onStatusChange={setStatusFilter}
            onPriorityChange={setPriorityFilter}
            onClear={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPriorityFilter('all');
            }}
          />

          <LoadsDataGrid
            loads={loads}
            filteredLoads={filteredLoads}
            loading={loading}
            totalRows={totalRows}
            paginationModel={paginationModel}
            onPaginationModelChange={handlePaginationModelChange}
            onView={(load) => {
              setDetailsLoad(load);
              setOpenDetailsDialog(true);
            }}
            onEdit={(load) => handleOpenDialog(load)}
            onDelete={handleDelete}
            onAssign={handleOpenAssignDialog}
            onUnassign={handleUnassignLoad}
            onOpenNotes={(notes, title) => {
              setSelectedNotes(notes);
              setNotesTitle(title);
              setOpenNotesDialog(true);
            }}
            onConfirmRate={(load) => {
              setConfirmingRateLoad(load);
              setOpenConfirmRateDialog(true);
            }}
            onViewTripDetails={(load) => {
              setDetailsLoad(load);
              setOpenDetailsDialog(true);
            }}
            onReviewCompletion={(load) => {
              setReviewingLoad(load);
              setOpenReviewDialog(true);
            }}
            onManagePayment={(load) => {
              setPaymentLoad(load);
              setOpenPaymentDialog(true);
            }}
            onAddLoad={() => handleOpenDialog()}
          />

          <LoadsCreateEditDialog
            open={openDialog}
            onClose={handleCloseDialog}
            editingLoad={editingLoad}
            onCreateLoad={async (data) => {
              await createLoad(data as unknown as LoadFormData);
            }}
            onUpdateLoad={async (id, data) => {
              await updateLoad(id, data as Partial<LoadFormData>);
            }}
            onSuccess={(mode) => {
              fetchLoads();
              if (mode === 'create') handleCreateSuccess();
              else handleUpdateSuccess();
            }}
          />

          <ConfirmRateDialog
            open={openConfirmRateDialog}
            onClose={() => {
              setOpenConfirmRateDialog(false);
              setConfirmingRateLoad(null);
            }}
            load={confirmingRateLoad}
            onSuccess={() => {
              setOpenConfirmRateDialog(false);
              setConfirmingRateLoad(null);
              setSuccess(t('loads.rateConfirmed', { defaultValue: 'Rate confirmed successfully' }));
              fetchLoads();
              setTimeout(() => setSuccess(null), 3000);
            }}
          />

          <LoadsAssignDialog
            open={openAssignDialog}
            onClose={handleCloseAssignDialog}
            load={assigningLoad}
            drivers={drivers}
            trucks={trucks}
            trailers={trailers}
            selectedDriver={selectedDriver}
            selectedTruck={selectedTruck}
            selectedTrailer={selectedTrailer}
            onDriverChange={setSelectedDriver}
            onTruckChange={setSelectedTruck}
            onTrailerChange={setSelectedTrailer}
            onAssign={handleAssignLoad}
          />

          <LoadsNotesDialog open={openNotesDialog} onClose={() => setOpenNotesDialog(false)} title={notesTitle} notes={selectedNotes} />

          <LoadDetailsDialog
            open={openDetailsDialog}
            onClose={() => { setOpenDetailsDialog(false); setDetailsLoad(null); }}
            load={detailsLoad}
          />

          <ReviewCompletionDialog
            open={openReviewDialog}
            onClose={() => { setOpenReviewDialog(false); setReviewingLoad(null); }}
            load={reviewingLoad}
            onSuccess={() => {
              setOpenReviewDialog(false);
              setReviewingLoad(null);
              setSuccess('Load completion confirmed and payment approved!');
              fetchLoads();
              setTimeout(() => setSuccess(null), 4000);
            }}
          />

          <ManagePaymentDialog
            open={openPaymentDialog}
            onClose={() => { setOpenPaymentDialog(false); setPaymentLoad(null); }}
            load={paymentLoad}
            onSuccess={() => {
              setOpenPaymentDialog(false);
              setPaymentLoad(null);
              setSuccess('Payment marked as paid!');
              fetchLoads();
              setTimeout(() => setSuccess(null), 4000);
            }}
          />
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default LoadsPage;
