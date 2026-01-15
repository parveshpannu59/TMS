import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  DirectionsCar as ActiveIcon,
  Block as InactiveIcon,
  LocalShipping as OnTripIcon,
} from '@mui/icons-material';
import { driverApi } from '@api/all.api';
import type { Driver } from '../types/all.types';
import { DriverStatus } from '../types/all.types';
import { format } from 'date-fns';
import CreateDriverDialog from '@components/dialogs/CreateDriverDialog';
import EditDriverDialog from '@components/dialogs/EditDriverDialog';

interface DriverStats {
  totalDrivers: number;
  activeDrivers: number;
  onTripDrivers: number;
  inactiveDrivers: number;
}

const DriversPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const [driversData, statsData] = await Promise.all([
        driverApi.getAllDrivers(),
        driverApi.getDriverStats(),
      ]);
      setDrivers(driversData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch drivers');
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleDelete = async () => {
    if (!selectedDriver) return;
    try {
      await driverApi.deleteDriver(selectedDriver.id);
      setDeleteDialogOpen(false);
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete driver');
    }
  };

  const getStatusColor = (status: DriverStatus): 'default' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case DriverStatus.ACTIVE:
        return 'success';
      case DriverStatus.ON_TRIP:
        return 'warning';
      case DriverStatus.INACTIVE:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: DriverStatus): string => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredDrivers = useMemo(() => {
    if (!searchText) return drivers;
    return drivers.filter(
      (driver) =>
        driver.name.toLowerCase().includes(searchText.toLowerCase()) ||
        driver.phone.includes(searchText) ||
        driver.licenseNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        driver.city.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [drivers, searchText]);

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="bold">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 130,
    },
    {
      field: 'licenseNumber',
      headerName: 'License',
      width: 140,
    },
    {
      field: 'licenseExpiry',
      headerName: 'License Expiry',
      width: 130,
      valueFormatter: (params: any) => {
        if (!params?.value) return 'N/A';
        try {
          const date = new Date(params.value);
          if (isNaN(date.getTime())) return 'N/A';
          return format(date, 'dd MMM yyyy');
        } catch {
          return 'N/A';
        }
      },
    },
    {
      field: 'city',
      headerName: 'City',
      width: 130,
    },
    {
      field: 'state',
      headerName: 'State',
      width: 130,
    },
    {
      field: 'emergencyContact',
      headerName: 'Emergency',
      width: 130,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getStatusLabel(params.value as DriverStatus)}
          color={getStatusColor(params.value as DriverStatus)}
          size="small"
        />
      ),
    },
    {
      field: 'joiningDate',
      headerName: 'Joining Date',
      width: 130,
      valueFormatter: (params: any) => {
        if (!params?.value) return 'N/A';
        try {
          const date = new Date(params.value);
          if (isNaN(date.getTime())) return 'N/A';
          return format(date, 'dd MMM yyyy');
        } catch {
          return 'N/A';
        }
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedDriver(params.row as Driver);
              setEditDialogOpen(true);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setSelectedDriver(params.row as Driver);
              setDeleteDialogOpen(true);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: '1400px', mx: 'auto', width: '100%', p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box 
        sx={{ 
          mb: 3, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2
        }}
      >
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Driver Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDrivers}
            disabled={loading}
            fullWidth={isMobile}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            fullWidth={isMobile}
          >
            Add Driver
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Drivers
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.totalDrivers}
                    </Typography>
                  </Box>
                  <PersonIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Active
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {stats.activeDrivers}
                    </Typography>
                  </Box>
                  <ActiveIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      On Trip
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {stats.onTripDrivers}
                    </Typography>
                  </Box>
                  <OnTripIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Inactive
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="error.main">
                      {stats.inactiveDrivers}
                    </Typography>
                  </Box>
                  <InactiveIcon sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by name, phone, license, or city..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
      </Box>

      {/* Data Grid */}
      <Card>
        <DataGrid
          rows={filteredDrivers}
          columns={columns}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Driver</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete driver <strong>{selectedDriver?.name}</strong>?
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Driver Dialog */}
      <CreateDriverDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={fetchDrivers}
      />

      {/* Edit Driver Dialog */}
      <EditDriverDialog
        open={editDialogOpen}
        driver={selectedDriver}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedDriver(null);
        }}
        onSuccess={fetchDrivers}
      />
    </Box>
  );
};

export default DriversPage;