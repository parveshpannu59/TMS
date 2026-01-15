import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Grid,
  Divider,
  Autocomplete,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Delete,
  Assignment,
  Visibility,
  LocalShipping,
  CheckCircle,
  PendingActions,
  Search,
  FilterList,
} from '@mui/icons-material';
import { InputAdornment } from '@mui/material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useTheme } from '@mui/material/styles';
import { EmptyState } from '@/components/common/EmptyState';
import { StatsCard } from '@/components/common/StatsCard';
import { loadApi, Load, LoadFormData } from '@/api/load.api';
import { truckApi, Truck } from '@/api/truck.api';
import { trailerApi, Trailer } from '@/api/trailer.api';
import { driverApi, Driver } from '@/api/driver.api';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const loadSchema = yup.object({
  origin: yup.object({
    name: yup.string().required('Origin name is required'),
    address: yup.string().required('Origin address is required'),
    city: yup.string().required('City is required'),
    state: yup.string().required('State is required'),
    zipCode: yup.string().required('Zip code is required'),
  }),
  destination: yup.object({
    name: yup.string().required('Destination name is required'),
    address: yup.string().required('Destination address is required'),
    city: yup.string().required('City is required'),
    state: yup.string().required('State is required'),
    zipCode: yup.string().required('Zip code is required'),
  }),
  pickupDate: yup.mixed<Date | string>().required('Pickup date is required'),
  deliveryDate: yup.mixed<Date | string>().required('Delivery date is required'),
  miles: yup.number().required('Miles is required').min(0),
  rate: yup.number().required('Rate is required').min(0),
  broker: yup.string().required('Broker is required'),
  weight: yup.number().optional(),
  commodity: yup.string().optional(),
});

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  booked: 'default',
  assigned: 'info',
  on_duty: 'primary',
  in_transit: 'primary',
  arrived_receiver: 'secondary',
  delivered: 'success',
  completed: 'success',
  cancelled: 'error',
};

const LoadsPage: React.FC = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [filteredLoads, setFilteredLoads] = useState<Load[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [assigningLoad, setAssigningLoad] = useState<Load | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const theme = useTheme();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Assignment form state
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoadFormData>({
    resolver: yupResolver(loadSchema),
  });

  // Calculate stats from loads
  const stats = useMemo(() => {
    const total = loads.length;
    const booked = loads.filter(l => l.status === 'booked').length;
    const inTransit = loads.filter(l => ['assigned', 'on_duty', 'in_transit', 'arrived_shipper', 'loading', 'departed_shipper', 'arrived_receiver', 'unloading'].includes(l.status)).length;
    const completed = loads.filter(l => ['delivered', 'completed'].includes(l.status)).length;
    const totalRevenue = loads.filter(l => ['delivered', 'completed'].includes(l.status)).reduce((sum, load) => sum + load.rate, 0);

    return {
      total,
      booked,
      inTransit,
      completed,
      totalRevenue,
    };
  }, [loads]);

  const fetchLoads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadApi.getLoads();
      setLoads(data.loads);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch loads');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const [trucksData, trailersData, driversData] = await Promise.all([
        truckApi.getTrucks('available'),
        trailerApi.getTrailers({ status: 'available' }),
        driverApi.getDrivers('available'),
      ]);
      setTrucks(trucksData);
      setTrailers(trailersData);
      setDrivers(driversData);
    } catch (err: any) {
      console.error('Failed to fetch resources:', err);
    }
  }, []);

  useEffect(() => {
    fetchLoads();
    fetchResources();
  }, [fetchLoads, fetchResources]);

  // Apply filters
  useEffect(() => {
    let result = [...loads];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (load) =>
          load.loadNumber?.toLowerCase().includes(lowerSearch) ||
          load.origin?.city?.toLowerCase().includes(lowerSearch) ||
          load.origin?.state?.toLowerCase().includes(lowerSearch) ||
          load.destination?.city?.toLowerCase().includes(lowerSearch) ||
          load.destination?.state?.toLowerCase().includes(lowerSearch) ||
          load.broker?.toLowerCase().includes(lowerSearch) ||
          load.commodity?.toLowerCase().includes(lowerSearch)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((load) => load.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((load) => load.priority === priorityFilter);
    }

    setFilteredLoads(result);
  }, [loads, searchTerm, statusFilter, priorityFilter]);

  const handleOpenDialog = (load?: Load) => {
    if (load) {
      setEditingLoad(load);
      reset({
        origin: load.origin,
        destination: load.destination,
        pickupDate: new Date(load.pickupDate),
        deliveryDate: new Date(load.deliveryDate),
        miles: load.miles,
        rate: load.rate,
        broker: load.broker,
        weight: load.weight,
        commodity: load.commodity,
      } as LoadFormData);
    } else {
      setEditingLoad(null);
      reset({
        origin: {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
        },
        destination: {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
        },
        pickupDate: new Date(),
        deliveryDate: new Date(),
        miles: 0,
        rate: 0,
        broker: '',
      } as LoadFormData);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLoad(null);
    reset();
  };

  const onSubmit = async (data: LoadFormData) => {
    try {
      if (editingLoad) {
        await loadApi.updateLoad(editingLoad._id, data);
        setSuccess('Load updated successfully');
      } else {
        await loadApi.createLoad(data);
        setSuccess('Load created successfully');
      }
      handleCloseDialog();
      fetchLoads();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save load');
    }
  };

  const handleOpenAssignDialog = (load: Load) => {
    setAssigningLoad(load);
    setSelectedDriver(null);
    setSelectedTruck(null);
    setSelectedTrailer(null);
    fetchResources(); // Refresh available resources
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
      setError('Please select Driver, Truck, and Trailer');
      return;
    }

    try {
      await loadApi.assignLoad(assigningLoad._id, {
        driverId: selectedDriver._id,
        truckId: selectedTruck._id,
        trailerId: selectedTrailer._id,
      });
      setSuccess('Load assigned successfully!');
      handleCloseAssignDialog();
      fetchLoads();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to assign load');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this load?')) return;

    try {
      await loadApi.deleteLoad(id);
      setSuccess('Load deleted successfully');
      fetchLoads();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete load');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'loadNumber',
      headerName: 'Load #',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600} color="primary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'origin',
      headerName: 'Origin',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params) => `${params.value.city}, ${params.value.state}`,
    },
    {
      field: 'destination',
      headerName: 'Destination',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params) => `${params.value.city}, ${params.value.state}`,
    },
    {
      field: 'pickupDate',
      headerName: 'Pickup',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'deliveryDate',
      headerName: 'Delivery',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.value.replace('_', ' ').toUpperCase()}
          color={statusColors[params.value] || 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'driverId',
      headerName: 'Driver',
      flex: 1,
      minWidth: 120,
      renderCell: (params) =>
        params.value ? (
          <Typography variant="body2">{params.value.name}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Unassigned
          </Typography>
        ),
    },
    {
      field: 'rate',
      headerName: 'Rate',
      flex: 0.7,
      minWidth: 90,
      renderCell: (params) => `$${params.value.toLocaleString()}`,
    },
    {
      field: 'broker',
      headerName: 'Broker',
      flex: 1,
      minWidth: 110,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            icon={<Visibility />}
            label="View"
            onClick={() => handleOpenDialog(params.row as Load)}
          />,
        ];

        if (params.row.status === 'booked') {
          actions.push(
            <GridActionsCellItem
              icon={<Assignment />}
              label="Assign"
              onClick={() => handleOpenAssignDialog(params.row as Load)}
              showInMenu
            />
          );
        }

        actions.push(
          <GridActionsCellItem
            icon={<Edit />}
            label="Edit"
            onClick={() => handleOpenDialog(params.row as Load)}
            showInMenu
          />,
          <GridActionsCellItem
            icon={<Delete />}
            label="Delete"
            onClick={() => handleDelete(params.row._id)}
            showInMenu
          />
        );

        return actions;
      },
    },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ 
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header - Responsive: stacks on mobile, row on desktop */}
        <Box sx={{ 
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2,
          mb: 0,
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                <LocalShipping sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main' }} />
                <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                  Loads Management
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ ml: { xs: 0, sm: '44px' } }}>
                Manage your freight operations and track deliveries
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                minWidth: { sm: 160 },
                height: 44,
                boxShadow: theme.shadows[3],
                '&:hover': {
                  boxShadow: theme.shadows[6],
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a4196 100%)',
                },
              }}
            >
              Create Load
            </Button>
          </Box>
        </Box>

        {/* Content Area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError(null)} 
              sx={{ 
                mb: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'error.main',
              }}
              variant="outlined"
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert 
              severity="success" 
              onClose={() => setSuccess(null)} 
              sx={{ 
                mb: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'success.main',
              }}
              variant="outlined"
            >
              {success}
            </Alert>
          )}

          {/* Stats Summary */}
          {loads.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={6} md={3}>
              <StatsCard
                title="Total Loads"
                value={stats.total}
                icon={<Assignment />}
                color={theme.palette.primary.main}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatsCard
                title="Booked"
                value={stats.booked}
                icon={<PendingActions />}
                color={theme.palette.warning.main}
                subtitle="Awaiting assignment"
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatsCard
                title="In Transit"
                value={stats.inTransit}
                icon={<LocalShipping />}
                color={theme.palette.info.main}
                subtitle="On the road"
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatsCard
                title="Completed"
                value={stats.completed}
                icon={<CheckCircle />}
                color={theme.palette.success.main}
                subtitle={`$${stats.totalRevenue.toLocaleString()} revenue`}
              />
            </Grid>
          </Grid>
          )}

          {/* Search and Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search by load#, origin, destination, broker..."
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
              <MenuItem value="booked">Booked</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="in_transit">In Transit</MenuItem>
              <MenuItem value="arrived_shipper">Arrived Shipper</MenuItem>
              <MenuItem value="loading">Loading</MenuItem>
              <MenuItem value="departed_shipper">Departed Shipper</MenuItem>
              <MenuItem value="arrived_receiver">Arrived Receiver</MenuItem>
              <MenuItem value="unloading">Unloading</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>

            <TextField
              select
              label="Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="all">All Priority</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </TextField>

            {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }}
              >
                Clear
              </Button>
            )}
          </Box>

          <Card 
            sx={{ 
              width: '100%',
              minHeight: 900,
              height: filteredLoads.length > 10 ? filteredLoads.length * 52 + 150 : 900,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: theme.shadows[2],
            transition: 'box-shadow 0.2s ease',
            '&:hover': {
              boxShadow: theme.shadows[4],
            },
          }}
        >
          {!loading && filteredLoads.length === 0 ? (
            <EmptyState
              icon={<Assignment />}
              title={loads.length === 0 ? "No Loads Yet" : "No Results Found"}
              description={loads.length === 0 ? "Get started by creating your first load. Add origin, destination, and trip details to begin managing your freight." : "Try adjusting your search or filters"}
              actionLabel={loads.length === 0 ? "Create First Load" : undefined}
              onAction={loads.length === 0 ? () => handleOpenDialog() : undefined}
            />
          ) : (
            <DataGrid
              rows={filteredLoads}
              columns={columns}
              loading={loading}
              getRowId={(row) => row._id}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
              autoHeight={false}
              sx={{
                width: '100%',
                height: '100%',
                border: 'none',
                '& .MuiDataGrid-main': {
                  width: '100%',
                },
                '& .MuiDataGrid-cell': {
                  padding: '12px 16px',
                  fontSize: '0.875rem',
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-columnHeaders': {
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  backgroundColor: 'background.default',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                },
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .MuiDataGrid-cell:focus-within': {
                  outline: 'none',
                },
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  '&:nth-of-type(even)': {
                    bgcolor: 'action.hover',
                    opacity: 0.5,
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.default',
                },
                '& .MuiDataGrid-virtualScroller': {
                  overflow: 'auto !important',
                },
              }}
            />
          )}
        </Card>

        {/* Create/Edit Load Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingLoad ? 'Edit Load' : 'Create New Load'}
          </DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Origin Section */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Origin Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="origin.name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Shipper Name *"
                            error={!!errors.origin?.name}
                            helperText={errors.origin?.name?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="origin.address"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Address *"
                            error={!!errors.origin?.address}
                            helperText={errors.origin?.address?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="origin.city"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="City *"
                            error={!!errors.origin?.city}
                            helperText={errors.origin?.city?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Controller
                        name="origin.state"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="State *"
                            error={!!errors.origin?.state}
                            helperText={errors.origin?.state?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Controller
                        name="origin.zipCode"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Zip *"
                            error={!!errors.origin?.zipCode}
                            helperText={errors.origin?.zipCode?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                {/* Destination Section */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Destination Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="destination.name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Receiver Name *"
                            error={!!errors.destination?.name}
                            helperText={errors.destination?.name?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="destination.address"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Address *"
                            error={!!errors.destination?.address}
                            helperText={errors.destination?.address?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="destination.city"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="City *"
                            error={!!errors.destination?.city}
                            helperText={errors.destination?.city?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Controller
                        name="destination.state"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="State *"
                            error={!!errors.destination?.state}
                            helperText={errors.destination?.state?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Controller
                        name="destination.zipCode"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Zip *"
                            error={!!errors.destination?.zipCode}
                            helperText={errors.destination?.zipCode?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                {/* Load Details */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Load Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="pickupDate"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Pickup Date *"
                            type="date"
                            error={!!errors.pickupDate}
                            helperText={errors.pickupDate?.message}
                            disabled={isSubmitting}
                            InputLabelProps={{ shrink: true }}
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="deliveryDate"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Delivery Date *"
                            type="date"
                            error={!!errors.deliveryDate}
                            helperText={errors.deliveryDate?.message}
                            disabled={isSubmitting}
                            InputLabelProps={{ shrink: true }}
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="miles"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Miles *"
                            type="number"
                            error={!!errors.miles}
                            helperText={errors.miles?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="rate"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Rate ($) *"
                            type="number"
                            error={!!errors.rate}
                            helperText={errors.rate?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="weight"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Weight (lbs)"
                            type="number"
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller
                        name="broker"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Broker *"
                            error={!!errors.broker}
                            helperText={errors.broker?.message}
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller
                        name="commodity"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Commodity"
                            disabled={isSubmitting}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>
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
                {editingLoad ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Assignment Dialog */}
        <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box>
              <Typography variant="h6">Assign Load</Typography>
              {assigningLoad && (
                <Typography variant="body2" color="text.secondary">
                  Load #{assigningLoad.loadNumber} • {assigningLoad.origin.city}, {assigningLoad.origin.state} → {assigningLoad.destination.city}, {assigningLoad.destination.state}
                </Typography>
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Stepper activeStep={selectedDriver && selectedTruck && selectedTrailer ? 3 : selectedDriver && selectedTruck ? 2 : selectedDriver ? 1 : 0}>
                <Step>
                  <StepLabel>Select Driver</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Select Truck</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Select Trailer</StepLabel>
                </Step>
              </Stepper>

              <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Autocomplete
                  options={drivers}
                  getOptionLabel={(option) => `${option.userId.name} - License: ${option.licenseNumber}`}
                  value={selectedDriver}
                  onChange={(_, value) => setSelectedDriver(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Driver *"
                      helperText={`${drivers.length} available drivers`}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {option.userId.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          License: {option.licenseNumber} • {option.userId.phone}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />

                <Autocomplete
                  options={trucks}
                  getOptionLabel={(option) => `${option.unitNumber} - ${option.make} ${option.model} (${option.year})`}
                  value={selectedTruck}
                  onChange={(_, value) => setSelectedTruck(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Truck *"
                      helperText={`${trucks.length} available trucks`}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {option.unitNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.make} {option.model} ({option.year}) • VIN: {option.vin}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />

                <Autocomplete
                  options={trailers}
                  getOptionLabel={(option) => `${option.unitNumber} - ${option.type.replace('_', ' ').toUpperCase()}`}
                  value={selectedTrailer}
                  onChange={(_, value) => setSelectedTrailer(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Trailer *"
                      helperText={`${trailers.length} available trailers`}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {option.unitNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.type.replace('_', ' ').toUpperCase()} • VIN: {option.vin}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />
              </Box>

              {selectedDriver && selectedTruck && selectedTrailer && (
                <Alert severity="success" sx={{ mt: 3 }}>
                  Ready to assign! This will update the status of the driver, truck, and trailer.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseAssignDialog}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAssignLoad}
              disabled={!selectedDriver || !selectedTruck || !selectedTrailer}
              startIcon={<Assignment />}
            >
              Assign Load
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default LoadsPage;
