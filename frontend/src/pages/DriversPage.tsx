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
import { getApiOrigin } from '@/api/client';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslation } from 'react-i18next';

const driverSchema = yup.object({
  licenseNumber: yup.string().required('License number is required'),
  licenseExpiry: yup.date().required('License expiry is required'),
  status: yup.string().oneOf(['active', 'inactive', 'on_trip']).optional(),
  notes: yup.string().optional(),
});

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  inactive: 'error',
  on_trip: 'info',
};

const DriversPage: React.FC = () => {
  const { t } = useTranslation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [notesTitle, setNotesTitle] = useState<string>('Notes');
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
      status: 'active',
      notes: '',
    },
  });
  
  // Local state for selected user - managed separately from react-hook-form
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userError, setUserError] = useState<string | null>(null);

  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
        notes: (driver as any).notes || '',
      });
    } else {
      setEditingDriver(null);
      setSelectedUser(null);
      reset({
        licenseNumber: '',
        licenseExpiry: new Date(),
        status: 'active',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDriver(null);
    setSelectedUser(null);
    setUserError(null);
    setImageFile(null);
    setImagePreview(null);
    reset();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
        // For update, send all form fields including notes
        const updateData = {
          licenseNumber: data.licenseNumber,
          licenseExpiry: data.licenseExpiry,
          status: data.status,
          notes: data.notes || '',
        };
        await driverApi.updateDriver(driverId, updateData);
        
        // Upload image if new one selected
        if (imageFile) {
          await driverApi.uploadPhoto(driverId, imageFile);
          // Clear image states after upload
          setImageFile(null);
          setImagePreview(null);
        }
        
        setSuccess('Driver updated successfully');
        // Refresh drivers list to show updated data
        await fetchDrivers();
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
          userId, // Link driver profile to user account for login
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
        
        const created = await driverApi.createDriver(driverData);
        
        // Upload image if provided
        if (imageFile) {
          const createdId = (created as any)._id || (created as any).id;
          if (createdId) {
            await driverApi.uploadPhoto(createdId, imageFile);
          }
        }
        
        setSuccess('Driver created successfully. Please update address and emergency contact details later.');
      }
      handleCloseDialog();
      fetchDrivers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      // Extract error message from API response
      console.error('Error saving driver:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save driver';
      setError(errorMessage);
      console.error('Error details:', {
        message: errorMessage,
        response: err.response?.data,
        status: err.response?.status,
      });
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
      field: 'photo',
      headerName: t('drivers.photo', { defaultValue: 'Photo' }),
      width: 70,
      sortable: false,
      renderCell: (params) => {
        const row = params.row as any;
        const photoUrl = row.documents?.photo 
          ? `${getApiOrigin()}${row.documents.photo}` 
          : null;
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={row.name || 'Driver'}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                {(row.name || 'D').charAt(0).toUpperCase()}
              </Box>
            )}
          </Box>
        );
      },
    },
    {
      field: 'name',
      headerName: t('drivers.driverName'),
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
      headerName: t('common.email'),
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
      headerName: t('common.phone'),
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
      headerName: t('drivers.licenseShort'),
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'licenseExpiry',
      headerName: t('drivers.licenseExpiry'),
      flex: 1,
      minWidth: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'status',
      headerName: t('common.status'),
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const statusLabels: Record<string, string> = {
          active: t('common.active'),
          inactive: t('common.inactive'),
          on_trip: t('drivers.onTrip'),
        };
        return (
          <Chip
            label={statusLabels[params.value] || params.value}
            color={statusColors[params.value] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'currentLoadId',
      headerName: t('drivers.currentLoad'),
      flex: 1.2,
      minWidth: 130,
      renderCell: (params) =>
        params.value ? (
          <Typography variant="body2" color="primary">
            {params.value.loadNumber || t('loads.assigned')}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        ),
    },
    {
      field: 'notes',
      headerName: t('common.notes'),
      flex: 1.5,
      minWidth: 150,
      renderCell: (params) => {
        if (!params || !params.row) {
          return (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              {t('common.noNotes')}
            </Typography>
          );
        }
        const row = params.row as any;
        const driverName = row.name || row.userId?.name || 'Driver';
        const notes = row.notes || '';
        if (!notes) {
          return (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              {t('common.noNotes')}
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
                setNotesTitle(`Notes - ${driverName}`);
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
      headerName: t('common.actions'),
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label={t('common.edit')}
          onClick={() => handleOpenDialog(params.row as Driver)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label={t('common.delete')}
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
              {t('drivers.title')}
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
            {t('drivers.addDriver')}
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
            placeholder={t('drivers.searchPlaceholder', { defaultValue: 'Search by name, email, phone, or license#...' })}
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
            <MenuItem value="active">{t('common.active')}</MenuItem>
            <MenuItem value="inactive">{t('common.inactive')}</MenuItem>
            <MenuItem value="on_trip">{t('drivers.onTrip')}</MenuItem>
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
          {!loading && filteredDrivers.length === 0 ? (
            <EmptyState
              icon={<LocalShipping />}
              title={drivers.length === 0 ? t('drivers.noDriversAdded', { defaultValue: 'No Drivers Added' }) : t('common.noResultsFound', { defaultValue: 'No Results Found' })}
              description={drivers.length === 0 ? t('drivers.noDriversDescription', { defaultValue: 'Build your driver roster by linking user accounts with driver profiles. Add license information and track availability.' }) : t('common.tryAdjustingFilters', { defaultValue: 'Try adjusting your search or filters' })}
              actionLabel={drivers.length === 0 ? t('drivers.addFirstDriver', { defaultValue: 'Add First Driver' }) : undefined}
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
            {editingDriver ? t('drivers.editDriver') : t('drivers.addNewDriver')}
          </DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
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
                      label={t('drivers.selectUserRequired', { defaultValue: 'Select User *' })}
                      error={!!userError}
                      helperText={userError}
                      placeholder={t('drivers.searchForUser', { defaultValue: 'Search for a user...' })}
                    />
                  )}
                />

                {/* Driver Photo Upload */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Driver Photo
                  </Typography>
                  {(imagePreview || (editingDriver?.documents?.photo)) && (
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                      <img
                        src={imagePreview || `${getApiOrigin()}${editingDriver?.documents?.photo}`}
                        alt="Driver"
                        style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }}
                        onError={(e) => {
                          console.error('Failed to load image:', editingDriver?.documents?.photo);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </Box>
                  )}
                  <Button variant="outlined" component="label" fullWidth>
                    {imageFile ? imageFile.name : 'Upload Photo'}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                  </Button>
                </Box>

                <Controller
                  name="licenseNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('drivers.licenseNumberRequired', { defaultValue: 'License Number *' })}
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
                      label={t('drivers.licenseExpiryRequired', { defaultValue: 'License Expiry *' })}
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
                      label={t('common.status')}
                      disabled={isSubmitting}
                      fullWidth
                    >
                      <MenuItem value="active">{t('common.active')}</MenuItem>
                      <MenuItem value="inactive">{t('common.inactive')}</MenuItem>
                      <MenuItem value="on_trip">{t('drivers.onTrip')}</MenuItem>
                    </TextField>
                  )}
                />

                {!editingDriver && selectedUser && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                      {t('drivers.driverDetailsFromUser', { defaultValue: 'Driver Details (from selected user)' })}
                    </Typography>
                    <TextField
                      label={t('common.name')}
                      value={selectedUser.name || ''}
                      disabled
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label={t('common.phone')}
                      value={selectedUser.phone || t('common.notSet', { defaultValue: 'Not set' })}
                      disabled
                      fullWidth
                      size="small"
                      helperText={t('drivers.phoneRequiredHelper', { defaultValue: 'Phone is required for driver. Please update user profile if missing.' })}
                      error={!selectedUser.phone}
                    />
                    <TextField
                      label={t('common.email')}
                      value={selectedUser.email || ''}
                      disabled
                      fullWidth
                      size="small"
                    />
                    {!selectedUser.phone && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {t('drivers.phoneRequiredAlert', { defaultValue: 'Phone number is required for driver. Please ensure the selected user has a phone number in their profile.' })}
                      </Alert>
                    )}
                  </>
                )}

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {t('drivers.additionalNotes')}
                  </Typography>
                </Box>

                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('common.notes')}
                      disabled={isSubmitting}
                      fullWidth
                      multiline
                      rows={4}
                      placeholder={t('drivers.notesPlaceholder')}
                      helperText={t('drivers.notesHelper')}
                    />
                  )}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting && <CircularProgress size={16} />}
              >
                {editingDriver ? t('common.update') : t('common.create')}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Notes View Dialog */}
        <Dialog open={openNotesDialog} onClose={() => setOpenNotesDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{notesTitle}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={10}
              value={selectedNotes}
              disabled
              sx={{
                mt: 1,
                '& .MuiInputBase-input': {
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNotesDialog(false)} variant="contained">
              {t('common.close')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default DriversPage;
