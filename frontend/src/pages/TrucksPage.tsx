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
  LocalShipping as TruckIcon,
  CheckCircle as ActiveIcon,
  Build as ServiceIcon,
  Block as InactiveIcon,
  DirectionsCar as OnTripIcon,
} from '@mui/icons-material';
import { truckApi } from '@api/all.api';
import type { Truck } from '../types/all.types';
import { TruckStatus } from '../types/all.types';
import { format } from 'date-fns';
import CreateTruckDialog from '@components/dialogs/CreateTruckDialog';
import EditTruckDialog from '@components/dialogs/EditTruckDialog';

interface TruckStats {
  totalTrucks: number;
  activeTrucks: number;
  onTripTrucks: number;
  inServiceTrucks: number;
  inactiveTrucks: number;
}

const TrucksPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [stats, setStats] = useState<TruckStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrucks = async () => {
    try {
      setLoading(true);
      setError(null);
      const [trucksData, statsData] = await Promise.all([
        truckApi.getAllTrucks(),
        truckApi.getTruckStats(),
      ]);
      setTrucks(trucksData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch trucks');
      console.error('Error fetching trucks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const handleDelete = async () => {
    if (!selectedTruck) return;
    try {
      await truckApi.deleteTruck(selectedTruck.id);
      setDeleteDialogOpen(false);
      setSelectedTruck(null);
      fetchTrucks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete truck');
    }
  };

  const getStatusColor = (status: TruckStatus): 'default' | 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case TruckStatus.ACTIVE:
        return 'success';
      case TruckStatus.ON_TRIP:
        return 'warning';
      case TruckStatus.IN_SERVICE:
        return 'info';
      case TruckStatus.INACTIVE:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: TruckStatus): string => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredTrucks = useMemo(() => {
    if (!searchText) return trucks;
    return trucks.filter(
      (truck) =>
        truck.truckNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        truck.registrationNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        truck.make.toLowerCase().includes(searchText.toLowerCase()) ||
        truck.model.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [trucks, searchText]);

  const columns: GridColDef[] = [
    {
      field: 'truckNumber',
      headerName: 'Truck #',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="bold">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'make',
      headerName: 'Make',
      width: 120,
    },
    {
      field: 'model',
      headerName: 'Model',
      width: 120,
    },
    {
      field: 'year',
      headerName: 'Year',
      width: 90,
    },
    {
      field: 'truckType',
      headerName: 'Type',
      width: 150,
    },
    {
      field: 'capacity',
      headerName: 'Capacity (tons)',
      width: 130,
      valueFormatter: (params: any) => `${params.value} tons`,
    },
    {
      field: 'registrationNumber',
      headerName: 'Registration',
      width: 140,
    },
    {
      field: 'registrationExpiry',
      headerName: 'Reg. Expiry',
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
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getStatusLabel(params.value as TruckStatus)}
          color={getStatusColor(params.value as TruckStatus)}
          size="small"
        />
      ),
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
              setSelectedTruck(params.row as Truck);
              setEditDialogOpen(true);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setSelectedTruck(params.row as Truck);
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
          Truck Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTrucks}
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
            Add Truck
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
          <Grid item xs={6} sm={4} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Trucks
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.totalTrucks}
                    </Typography>
                  </Box>
                  <TruckIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Active
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {stats.activeTrucks}
                    </Typography>
                  </Box>
                  <ActiveIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      On Trip
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {stats.onTripTrucks}
                    </Typography>
                  </Box>
                  <OnTripIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      In Service
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="info.main">
                      {stats.inServiceTrucks}
                    </Typography>
                  </Box>
                  <ServiceIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Inactive
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="error.main">
                      {stats.inactiveTrucks}
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
          placeholder="Search by truck number, registration, make, or model..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
      </Box>

      {/* Data Grid */}
      <Card>
        <DataGrid
          rows={filteredTrucks}
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
        <DialogTitle>Delete Truck</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete truck <strong>{selectedTruck?.truckNumber}</strong>?
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

      {/* Create Truck Dialog */}
      <CreateTruckDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={fetchTrucks}
      />

      {/* Edit Truck Dialog */}
      <EditTruckDialog
        open={editDialogOpen}
        truck={selectedTruck}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedTruck(null);
        }}
        onSuccess={fetchTrucks}
      />
    </Box>
  );
};

export default TrucksPage;