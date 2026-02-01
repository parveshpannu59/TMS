import React, { useState } from 'react';
import { Box, Alert } from '@mui/material';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Load, LoadFormData } from '@/api/load.api';
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
} from '@/components/loads';
import { useTranslation } from 'react-i18next';

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
      await assignLoad(assigningLoad._id, { driverId, truckId, trailerId });
      setSuccess('Load assigned successfully!');
      handleCloseAssignDialog();
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
            onView={(load) => handleOpenDialog(load)}
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
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default LoadsPage;
