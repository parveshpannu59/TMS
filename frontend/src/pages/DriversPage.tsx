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
  Autocomplete,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Add, Edit, Delete, LocalShipping, Search, FilterList } from '@mui/icons-material';
import { InputAdornment } from '@mui/material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { EmptyState } from '@/components/common/EmptyState';
import { driverApi, Driver, DriverFormData } from '@/api/driver.api';
import { userApi } from '@/api/user.api';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const driverSchema = yup.object({
  licenseNumber: yup.string().required('License number is required'),
  licenseExpiry: yup.date().required('License expiry is required'),
  status: yup.string().oneOf(['available', 'on_duty', 'off_duty', 'on_leave']),
});

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  available: 'success',
  on_duty: 'info',
  off_duty: 'warning',
  on_leave: 'error',
};

const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Omit<DriverFormData, 'userId'>>({
    resolver: yupResolver(driverSchema),
    mode: 'onChange',
    defaultValues: {
      licenseNumber: '',
      licenseExpiry: new Date(),
      status: 'off_duty',
    },
  });
  
  // Local state for selected user - managed separately from react-hook-form
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userError, setUserError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await driverApi.getDrivers();
      setDrivers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await userApi.getAllUsers({ limit: 100, role: 'driver' });
      // Set driver role users
      console.log('Fetched users for driver selection:', response.data);
      setUsers(response.data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    fetchUsers();
  }, [fetchDrivers, fetchUsers]);

  // Apply filters
  useEffect(() => {
    let result = [...drivers];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (driver) => {
          // Driver model has name, email, phone directly (not via userId)
          const driverName = (driver as any).name || driver.userId?.name || '';
          const driverEmail = (driver as any).email || driver.userId?.email || '';
          const driverPhone = (driver as any).phone || driver.userId?.phone || '';
          return (
            driverName.toLowerCase().includes(lowerSearch) ||
            driverEmail.toLowerCase().includes(lowerSearch) ||
            driverPhone.toLowerCase().includes(lowerSearch) ||
            driver.licenseNumber?.toLowerCase().includes(lowerSearch)
          );
        }
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((driver) => driver.status === statusFilter);
    }

    setFilteredDrivers(result);
  }, [drivers, searchTerm, statusFilter]);

  const handleOpenDialog = (driver?: Driver) => {
    setUserError(null);
    if (driver) {
      setEditingDriver(driver);
      const userId = typeof driver.userId === 'string' ? driver.userId : driver.userId._id;
      // Find the user object for editing (check both id and _id)
      const user = users.find(u => (u.id || u._id) === userId);
      setSelectedUser(user || null);
      reset({
        licenseNumber: driver.licenseNumber,
        licenseExpiry: new Date(driver.licenseExpiry),
        status: driver.status,
      });
    } else {
      setEditingDriver(null);
      setSelectedUser(null);
      reset({
        licenseNumber: '',
        licenseExpiry: new Date(),
        status: 'off_duty',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDriver(null);
    setSelectedUser(null);
    setUserError(null);
    reset();
  };

  const onSubmit = async (data: Omit<DriverFormData, 'userId'>) => {
    // Manually validate userId
    if (!editingDriver && !selectedUser) {
      setUserError('User is required');
      return;
    }
    
    try {
      setError(null); // Clear previous errors
      setUserError(null);
      
      if (editingDriver) {
        const driverId = editingDriver.id || editingDriver._id;
        if (!driverId) {
          setError('Invalid driver ID for update');
          return;
        }
        // For update, only send the form fields (licenseNumber, licenseExpiry, status)
        await driverApi.updateDriver(driverId, data);
        setSuccess('Driver updated successfully');
      } else {
        // For create, we need to send all required fields
        // Extract user data to build complete driver object
        const userId = selectedUser!.id || selectedUser!._id;
        if (!userId) {
          setError('Invalid user ID');
          return;
        }
        
        // Validate user has required fields
        if (!selectedUser!.phone) {
          setError('Selected user must have a phone number. Please update the user profile first.');
          return;
        }
        
        // Build complete driver data with user info
        // Backend expects CreateDriverData format
        const driverData: any = {
          name: selectedUser!.name || '',
          phone: selectedUser!.phone || '',
          email: selectedUser!.email || '',
          licenseNumber: data.licenseNumber,
          licenseExpiry: data.licenseExpiry,
          // Required fields with placeholder values - these should be updated later
          address: 'Please update address',
          city: 'Please update city',
          state: 'Please update state',
          pincode: '000000',
          emergencyContact: selectedUser!.phone || '0000000000',
          emergencyContactName: selectedUser!.name || 'Please update',
        };
        
        await driverApi.createDriver(driverData);
        setSuccess('Driver created successfully. Please update address and emergency contact details later.');
      }
      handleCloseDialog();
      fetchDrivers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      // Extract error message from API response
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save driver';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      setError('Invalid driver ID');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this driver?')) return;

    try {
      await driverApi.deleteDriver(id);
      setSuccess('Driver deleted successfully');
      fetchDrivers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete driver';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Driver Name',
      flex: 1.2,
      minWidth: 150,
      valueGetter: (params) => {
        if (!params.row) return '-';
        const row = params.row as any;
        return row.name || row.userId?.name || '-';
      },
      renderCell: (params) => {
        if (!params.row) return '-';
        const row = params.row as any;
        return (
          <Typography variant="body2" fontWeight={600}>
            {row.name || row.userId?.name || '-'}
          </Typography>
        );
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.4,
      minWidth: 180,
      valueGetter: (params) => {
        if (!params.row) return '-';
        const row = params.row as any;
        return row.email || row.userId?.email || '-';
      },
      renderCell: (params) => {
        if (!params.row) return '-';
        const row = params.row as any;
        return row.email || row.userId?.email || '-';
      },
    },
    {
      field: 'phone',
      headerName: 'Phone',
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => {
        if (!params.row) return '-';
        const row = params.row as any;
        return row.phone || row.userId?.phone || '-';
      },
      renderCell: (params) => {
        if (!params.row) return '-';
        const row = params.row as any;
        return row.phone || row.userId?.phone || '-';
      },
    },
    {
      field: 'licenseNumber',
      headerName: 'License #',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'licenseExpiry',
      headerName: 'License Expiry',
      flex: 1,
      minWidth: 120,
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
          key="edit"
          icon={<Edit />}
          label="Edit"
          onClick={() => handleOpenDialog(params.row as Driver)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDelete(params.row.id || params.row._id)}
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
              Drivers Management
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
            Add Driver
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
            placeholder="Search by name, email, phone, or license#..."
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
            <MenuItem value="on_duty">On Duty</MenuItem>
            <MenuItem value="off_duty">Off Duty</MenuItem>
            <MenuItem value="on_leave">On Leave</MenuItem>
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
              Clear
            </Button>
          )}
        </Box>

        <Card>
          {!loading && filteredDrivers.length === 0 ? (
            <EmptyState
              icon={<LocalShipping />}
              title={drivers.length === 0 ? "No Drivers Added" : "No Results Found"}
              description={drivers.length === 0 ? "Build your driver roster by linking user accounts with driver profiles. Add license information and track availability." : "Try adjusting your search or filters"}
              actionLabel={drivers.length === 0 ? "Add First Driver" : undefined}
              onAction={drivers.length === 0 ? () => handleOpenDialog() : undefined}
            />
          ) : (
            <Box sx={{ minHeight: 900, height: filteredDrivers.length > 10 ? filteredDrivers.length * 52 + 150 : 900 }}>
              <DataGrid
                rows={filteredDrivers}
                columns={columns}
                loading={loading}
                getRowId={(row) => row.id || row._id || String(Math.random())}
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
            {editingDriver ? 'Edit Driver' : 'Add New Driver'}
          </DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Autocomplete
                  options={users}
                  getOptionLabel={(option: any) => 
                    option?.name ? `${option.name} (${option.email})` : ''
                  }
                  isOptionEqualToValue={(option: any, value: any) => {
                    if (!option || !value) return option === value;
                    // User API returns 'id', not '_id'
                    return (option.id || option._id) === (value.id || value._id);
                  }}
                  onChange={(_, newValue) => {
                    setSelectedUser(newValue);
                    // Clear error when user is selected
                    if (newValue) {
                      setUserError(null);
                    }
                  }}
                  value={selectedUser}
                  clearOnBlur={false}
                  blurOnSelect={true}
                  disabled={isSubmitting || !!editingDriver}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select User *"
                      error={!!userError}
                      helperText={userError}
                      placeholder="Search for a user..."
                    />
                  )}
                />

                <Controller
                  name="licenseNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="License Number *"
                      error={!!errors.licenseNumber}
                      helperText={errors.licenseNumber?.message}
                      disabled={isSubmitting}
                      fullWidth
                    />
                  )}
                />

                <Controller
                  name="licenseExpiry"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="License Expiry *"
                      type="date"
                      error={!!errors.licenseExpiry}
                      helperText={errors.licenseExpiry?.message}
                      disabled={isSubmitting}
                      InputLabelProps={{ shrink: true }}
                      value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
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
                      <MenuItem value="on_duty">On Duty</MenuItem>
                      <MenuItem value="off_duty">Off Duty</MenuItem>
                      <MenuItem value="on_leave">On Leave</MenuItem>
                    </TextField>
                  )}
                />

                {!editingDriver && selectedUser && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                      Driver Details (from selected user)
                    </Typography>
                    <TextField
                      label="Name"
                      value={selectedUser.name || ''}
                      disabled
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Phone"
                      value={selectedUser.phone || 'Not set'}
                      disabled
                      fullWidth
                      size="small"
                      helperText="Phone is required for driver. Please update user profile if missing."
                      error={!selectedUser.phone}
                    />
                    <TextField
                      label="Email"
                      value={selectedUser.email || ''}
                      disabled
                      fullWidth
                      size="small"
                    />
                    {!selectedUser.phone && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Phone number is required for driver. Please ensure the selected user has a phone number in their profile.
                      </Alert>
                    )}
                  </>
                )}
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
                {editingDriver ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default DriversPage;
