import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Add, Edit, Delete, LocalShipping, Search, FilterList } from '@mui/icons-material';
import { InputAdornment } from '@mui/material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { EmptyState } from '@/components/common/EmptyState';
import { StatsCard } from '@/components/common/StatsCard';
import { truckApi, Truck, TruckFormData } from '@/api/truck.api';
import { useTheme } from '@mui/material/styles';
import { CheckCircle, Build, Warning } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslation } from 'react-i18next';

const truckSchema = yup.object({
  unitNumber: yup.string().required('Unit number is required'),
  make: yup.string().required('Make is required'),
  model: yup.string().required('Model is required'),
  year: yup.number().required('Year is required').min(1900).max(new Date().getFullYear() + 1),
  vin: yup.string().required('VIN is required').length(17, 'VIN must be 17 characters'),
  licensePlate: yup.string().required('License plate is required'),
  status: yup.string().oneOf(['available', 'on_road', 'in_maintenance', 'out_of_service']),
  notes: yup.string(),
});

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  available: 'success',
  on_road: 'info',
  in_maintenance: 'warning',
  out_of_service: 'error',
};

const TrucksPage: React.FC = () => {
  const { t } = useTranslation();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [filteredTrucks, setFilteredTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [notesTitle, setNotesTitle] = useState<string>('Notes');
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const theme = useTheme();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TruckFormData>({
    resolver: yupResolver(truckSchema),
    defaultValues: {
      unitNumber: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      licensePlate: '',
      status: 'available',
      notes: '',
    },
  });

  const fetchTrucks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await truckApi.getTrucks();
      setTrucks(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trucks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  // Apply filters
  useEffect(() => {
    let result = [...trucks];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (truck) =>
          truck.unitNumber?.toLowerCase().includes(lowerSearch) ||
          truck.vin?.toLowerCase().includes(lowerSearch) ||
          truck.make?.toLowerCase().includes(lowerSearch) ||
          truck.model?.toLowerCase().includes(lowerSearch) ||
          truck.licensePlate?.toLowerCase().includes(lowerSearch)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((truck) => truck.status === statusFilter);
    }

    setFilteredTrucks(result);
  }, [trucks, searchTerm, statusFilter]);

  const handleOpenDialog = (truck?: Truck) => {
    if (truck) {
      setEditingTruck(truck);
      reset({
        unitNumber: truck.unitNumber,
        make: truck.make,
        model: truck.model,
        year: truck.year,
        vin: truck.vin,
        licensePlate: truck.licensePlate,
        status: truck.status,
        notes: (truck as any).notes || '',
      });
    } else {
      setEditingTruck(null);
      reset({
        unitNumber: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vin: '',
        licensePlate: '',
        status: 'available',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTruck(null);
    reset();
  };

  const onSubmit = async (data: TruckFormData) => {
    try {
      if (editingTruck) {
        await truckApi.updateTruck(editingTruck._id, data);
        setSuccess('Truck updated successfully');
      } else {
        await truckApi.createTruck(data);
        setSuccess('Truck created successfully');
      }
      handleCloseDialog();
      fetchTrucks();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save truck');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this truck?')) return;

    try {
      await truckApi.deleteTruck(id);
      setSuccess('Truck deleted successfully');
      fetchTrucks();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete truck');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'unitNumber',
      headerName: 'Unit #',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'make',
      headerName: 'Make',
      flex: 1,
      minWidth: 110,
    },
    {
      field: 'model',
      headerName: 'Model',
      flex: 1,
      minWidth: 110,
    },
    {
      field: 'year',
      headerName: 'Year',
      flex: 0.6,
      minWidth: 80,
    },
    {
      field: 'vin',
      headerName: 'VIN',
      flex: 1.4,
      minWidth: 140,
    },
    {
      field: 'licensePlate',
      headerName: 'License Plate',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params) => (
        <Chip
          label={params.value.replace('_', ' ').toUpperCase()}
          color={statusColors[params.value] || 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'currentLoadId',
      headerName: 'Current Load',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params) =>
        params.value ? (
          <Typography variant="body2" color="primary">
            {params.value.loadNumber || 'Assigned'}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        ),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 1.5,
      minWidth: 150,
      renderCell: (params) => {
        if (!params || !params.row) {
          return (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              No notes
            </Typography>
          );
        }
        const notes = params.row.notes || '';
        if (!notes) {
          return (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              No notes
            </Typography>
          );
        }
        const truncated = notes.length > 50 ? notes.substring(0, 50) + '...' : notes;
        const hasMore = notes.length > 50;
        return (
          <Typography 
            variant="body2" 
            onClick={() => {
              if (hasMore || notes) {
                setSelectedNotes(notes);
                setNotesTitle(`Notes - Truck #${params.row.unitNumber || 'N/A'}`);
                setOpenNotesDialog(true);
              }
            }}
            sx={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: notes ? 'pointer' : 'default',
              '&:hover': notes ? {
                color: 'primary.main',
                textDecoration: 'underline',
              } : {},
            }}
          >
            {truncated}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => handleOpenDialog(params.row as Truck)}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDelete(params.row._id)}
          showInMenu
        />,
      ],
    },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShipping sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700}>
              {t('trucks.title')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a4196 100%)',
              },
            }}
          >
            {t('trucks.addTruck')}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Search and Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder={t('trucks.searchPlaceholder', { defaultValue: 'Search by unit#, VIN, make, model, plate...' })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 300 }}
            size="small"
          />
          
          <TextField
            select
            label={t('common.status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="all">{t('common.allStatus')}</MenuItem>
            <MenuItem value="available">{t('common.available')}</MenuItem>
            <MenuItem value="on_trip">{t('trucks.onTrip', { defaultValue: 'On Trip' })}</MenuItem>
            <MenuItem value="maintenance">{t('trucks.maintenance', { defaultValue: 'Maintenance' })}</MenuItem>
            <MenuItem value="out_of_service">{t('trucks.outOfService', { defaultValue: 'Out of Service' })}</MenuItem>
          </TextField>

          {(searchTerm || statusFilter !== 'all') && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              {t('common.clear')}
            </Button>
          )}
        </Box>

        <Card>
          {!loading && filteredTrucks.length === 0 ? (
            <EmptyState
              icon={<LocalShipping />}
              title={trucks.length === 0 ? t('trucks.noTrucksAdded', { defaultValue: 'No Trucks Added' }) : t('common.noResultsFound')}
              description={trucks.length === 0 ? t('trucks.noTrucksDescription', { defaultValue: 'Start building your fleet by adding your first truck. Include unit number, make, model, and VIN to track your equipment.' }) : t('common.tryAdjustingFilters')}
              actionLabel={trucks.length === 0 ? t('trucks.addFirstTruck', { defaultValue: 'Add First Truck' }) : undefined}
              onAction={trucks.length === 0 ? () => handleOpenDialog() : undefined}
            />
          ) : (
            <Box sx={{ minHeight: 900, height: filteredTrucks.length > 10 ? filteredTrucks.length * 52 + 150 : 900 }}>
              <DataGrid
                rows={filteredTrucks}
                columns={columns}
                loading={loading}
                getRowId={(row) => row._id}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                disableRowSelectionOnClick
                autoHeight={false}
                sx={{
                  border: 'none',
                  height: '100%',
                  width: '100%',
                  '& .MuiDataGrid-cell:focus': {
                    outline: 'none',
                  },
                  '& .MuiDataGrid-row:hover': {
                    bgcolor: 'action.hover',
                  },
                  '& .MuiDataGrid-virtualScroller': {
                    overflow: 'auto !important',
                  },
                }}
              />
            </Box>
          )}
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTruck ? 'Edit Truck' : 'Add New Truck'}
          </DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Controller
                  name="unitNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Unit Number *"
                      error={!!errors.unitNumber}
                      helperText={errors.unitNumber?.message}
                      disabled={isSubmitting}
                      fullWidth
                    />
                  )}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Controller
                    name="make"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Make *"
                        error={!!errors.make}
                        helperText={errors.make?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />

                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Model *"
                        error={!!errors.model}
                        helperText={errors.model?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Box>

                <Controller
                  name="year"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Year *"
                      type="number"
                      error={!!errors.year}
                      helperText={errors.year?.message}
                      disabled={isSubmitting}
                      fullWidth
                    />
                  )}
                />

                <Controller
                  name="vin"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="VIN *"
                      error={!!errors.vin}
                      helperText={errors.vin?.message}
                      disabled={isSubmitting}
                      inputProps={{ maxLength: 17 }}
                      fullWidth
                    />
                  )}
                />

                <Controller
                  name="licensePlate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="License Plate *"
                      error={!!errors.licensePlate}
                      helperText={errors.licensePlate?.message}
                      disabled={isSubmitting}
                      fullWidth
                    />
                  )}
                />

                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Status"
                      disabled={isSubmitting}
                      fullWidth
                    >
                      <MenuItem value="available">Available</MenuItem>
                      <MenuItem value="on_road">On Road</MenuItem>
                      <MenuItem value="in_maintenance">In Maintenance</MenuItem>
                      <MenuItem value="out_of_service">Out of Service</MenuItem>
                    </TextField>
                  )}
                />

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Additional Notes
                  </Typography>
                </Box>

                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notes (Optional)"
                      disabled={isSubmitting}
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Add any additional notes, maintenance reminders, special instructions, or important information about this truck..."
                      helperText="Use this field to record maintenance history, special handling requirements, or any other relevant information"
                    />
                  )}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting && <CircularProgress size={16} />}
              >
                {editingTruck ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default TrucksPage;
