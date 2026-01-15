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
  Alert,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Add, Edit, Delete, RvHookup, Search, FilterList } from '@mui/icons-material';
import { InputAdornment } from '@mui/material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { EmptyState } from '@/components/common/EmptyState';
import { trailerApi, Trailer, TrailerFormData } from '@/api/trailer.api';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const trailerSchema = yup.object({
  unitNumber: yup.string().required('Unit number is required'),
  type: yup.string().required('Type is required').oneOf(['dry_van', 'reefer', 'flatbed', 'step_deck', 'lowboy', 'tanker']),
  make: yup.string(),
  year: yup.number().min(1900).max(new Date().getFullYear() + 1),
  vin: yup.string().required('VIN is required').length(17, 'VIN must be 17 characters'),
  licensePlate: yup.string().required('License plate is required'),
  status: yup.string().oneOf(['available', 'on_road', 'in_maintenance', 'out_of_service']),
});

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  available: 'success',
  on_road: 'info',
  in_maintenance: 'warning',
  out_of_service: 'error',
};

const trailerTypes: Record<string, string> = {
  dry_van: 'Dry Van',
  reefer: 'Reefer',
  flatbed: 'Flatbed',
  step_deck: 'Step Deck',
  lowboy: 'Lowboy',
  tanker: 'Tanker',
};

const TrailersPage: React.FC = () => {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [filteredTrailers, setFilteredTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrailerFormData>({
    resolver: yupResolver(trailerSchema),
    defaultValues: {
      unitNumber: '',
      type: 'dry_van',
      make: '',
      year: new Date().getFullYear(),
      vin: '',
      licensePlate: '',
      status: 'available',
    },
  });

  const fetchTrailers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await trailerApi.getTrailers();
      setTrailers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trailers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrailers();
  }, [fetchTrailers]);

  // Apply filters
  useEffect(() => {
    let result = [...trailers];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (trailer) =>
          trailer.unitNumber?.toLowerCase().includes(lowerSearch) ||
          trailer.vin?.toLowerCase().includes(lowerSearch) ||
          trailer.make?.toLowerCase().includes(lowerSearch) ||
          trailer.licensePlate?.toLowerCase().includes(lowerSearch) ||
          trailerTypeLabels[trailer.type]?.toLowerCase().includes(lowerSearch)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((trailer) => trailer.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((trailer) => trailer.type === typeFilter);
    }

    setFilteredTrailers(result);
  }, [trailers, searchTerm, statusFilter, typeFilter]);

  const handleOpenDialog = (trailer?: Trailer) => {
    if (trailer) {
      setEditingTrailer(trailer);
      reset({
        unitNumber: trailer.unitNumber,
        type: trailer.type,
        make: trailer.make,
        year: trailer.year,
        vin: trailer.vin,
        licensePlate: trailer.licensePlate,
        status: trailer.status,
      });
    } else {
      setEditingTrailer(null);
      reset({
        unitNumber: '',
        type: 'dry_van',
        make: '',
        year: new Date().getFullYear(),
        vin: '',
        licensePlate: '',
        status: 'available',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTrailer(null);
    reset();
  };

  const onSubmit = async (data: TrailerFormData) => {
    try {
      if (editingTrailer) {
        await trailerApi.updateTrailer(editingTrailer._id, data);
        setSuccess('Trailer updated successfully');
      } else {
        await trailerApi.createTrailer(data);
        setSuccess('Trailer created successfully');
      }
      handleCloseDialog();
      fetchTrailers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save trailer');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this trailer?')) return;

    try {
      await trailerApi.deleteTrailer(id);
      setSuccess('Trailer deleted successfully');
      fetchTrailers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete trailer');
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
      field: 'type',
      headerName: 'Type',
      flex: 1,
      minWidth: 110,
      renderCell: (params) => trailerTypes[params.value] || params.value,
    },
    {
      field: 'make',
      headerName: 'Make',
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
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => handleOpenDialog(params.row as Trailer)}
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
            <RvHookup sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700}>
              Trailers Management
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
            Add Trailer
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
            placeholder="Search by unit#, VIN, make, type, plate..."
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
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="on_trip">On Trip</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="out_of_service">Out of Service</MenuItem>
          </TextField>

          <TextField
            select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="dry_van">Dry Van</MenuItem>
            <MenuItem value="reefer">Reefer</MenuItem>
            <MenuItem value="flatbed">Flatbed</MenuItem>
            <MenuItem value="step_deck">Step Deck</MenuItem>
            <MenuItem value="lowboy">Lowboy</MenuItem>
            <MenuItem value="tanker">Tanker</MenuItem>
          </TextField>

          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear
            </Button>
          )}
        </Box>

        <Card>
          {!loading && filteredTrailers.length === 0 ? (
            <EmptyState
              icon={<RvHookup />}
              title={trailers.length === 0 ? "No Trailers Added" : "No Results Found"}
              description={trailers.length === 0 ? "Build your trailer fleet by adding equipment. Choose from dry vans, reefers, flatbeds, and more to match your hauling needs." : "Try adjusting your search or filters"}
              actionLabel={trailers.length === 0 ? "Add First Trailer" : undefined}
              onAction={trailers.length === 0 ? () => handleOpenDialog() : undefined}
            />
          ) : (
            <Box sx={{ minHeight: 900, height: filteredTrailers.length > 10 ? filteredTrailers.length * 52 + 150 : 900 }}>
              <DataGrid
                rows={filteredTrailers}
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
            {editingTrailer ? 'Edit Trailer' : 'Add New Trailer'}
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

                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Trailer Type *"
                      error={!!errors.type}
                      helperText={errors.type?.message}
                      disabled={isSubmitting}
                      fullWidth
                    >
                      <MenuItem value="dry_van">Dry Van</MenuItem>
                      <MenuItem value="reefer">Reefer</MenuItem>
                      <MenuItem value="flatbed">Flatbed</MenuItem>
                      <MenuItem value="step_deck">Step Deck</MenuItem>
                      <MenuItem value="lowboy">Lowboy</MenuItem>
                      <MenuItem value="tanker">Tanker</MenuItem>
                    </TextField>
                  )}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Controller
                    name="make"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Make"
                        error={!!errors.make}
                        helperText={errors.make?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />

                  <Controller
                    name="year"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Year"
                        type="number"
                        error={!!errors.year}
                        helperText={errors.year?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Box>

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
                {editingTrailer ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default TrailersPage;
