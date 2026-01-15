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
  Visibility as ViewIcon,
  LocalShipping as TruckIcon,
  Assignment as LoadIcon,
  CheckCircle as CompleteIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { loadApi } from '@api/all.api';
import type { Load, LoadStats } from '../types/all.types';
import { LoadStatus } from '../types/all.types';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import CreateLoadDialog from '@components/dialogs/CreateLoadDialog';
import EditLoadDialog from '@components/dialogs/EditLoadDialog';

const LoadsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [stats, setStats] = useState<LoadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch loads first (required)
      const loadsData = await loadApi.getAllLoads();
      setLoads(loadsData);
      
      // Try to fetch stats (optional - may fail for some roles)
      try {
        const statsData = await loadApi.getLoadStats();
        setStats(statsData);
      } catch (statsErr: any) {
        // If stats fetch fails (e.g., 403), just log and continue
        // Stats are optional - page can work without them
        if (statsErr.response?.status !== 403) {
          console.warn('Error fetching load stats:', statsErr);
        }
        // Set default stats if fetch fails
        setStats({
          totalLoads: loadsData.length,
          activeLoads: loadsData.filter((l: any) => l.status === 'in_transit' || l.status === 'assigned').length,
          completedLoads: loadsData.filter((l: any) => l.status === 'delivered').length,
          cancelledLoads: loadsData.filter((l: any) => l.status === 'cancelled').length,
          revenue: 0,
          advancePaid: 0,
          balanceDue: 0,
          statusStats: {},
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch loads');
      console.error('Error fetching loads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, []);

  const handleDelete = async () => {
    if (!selectedLoad) return;
    try {
      await loadApi.deleteLoad(selectedLoad.id);
      setDeleteDialogOpen(false);
      setSelectedLoad(null);
      fetchLoads();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete load');
    }
  };

  const getStatusColor = (status: LoadStatus): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case LoadStatus.CREATED:
        return 'default';
      case LoadStatus.ASSIGNED:
        return 'info';
      case LoadStatus.IN_TRANSIT:
        return 'primary';
      case LoadStatus.DELIVERED:
        return 'warning';
      case LoadStatus.COMPLETED:
        return 'success';
      case LoadStatus.CANCELLED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: LoadStatus): string => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredLoads = useMemo(() => {
    if (!searchText) return loads;
    return loads.filter(
      (load) =>
        load.loadNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
        load.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
        load.pickupLocation?.city?.toLowerCase().includes(searchText.toLowerCase()) ||
        load.deliveryLocation?.city?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [loads, searchText]);

  const columns: GridColDef[] = [
    {
      field: 'loadNumber',
      headerName: 'Load #',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="bold">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      width: 180,
    },
    {
      field: 'pickupLocation',
      headerName: 'Pickup',
      width: 150,
      valueGetter: (params: any) => {
        if (!params?.row || !params.row.pickupLocation) return 'N/A';
        return params.row.pickupLocation.city || 'N/A';
      },
    },
    {
      field: 'deliveryLocation',
      headerName: 'Delivery',
      width: 150,
      valueGetter: (params: any) => {
        if (!params?.row || !params.row.deliveryLocation) return 'N/A';
        return params.row.deliveryLocation.city || 'N/A';
      },
    },
    {
      field: 'pickupDate',
      headerName: 'Pickup Date',
      width: 120,
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
      field: 'driver',
      headerName: 'Driver',
      width: 150,
      valueGetter: (params: any) => {
        if (!params?.row) return 'Unassigned';
        return params.row.driver?.name || 'Unassigned';
      },
    },
    {
      field: 'truck',
      headerName: 'Truck',
      width: 120,
      valueGetter: (params: any) => {
        if (!params?.row) return 'Unassigned';
        return params.row.truck?.truckNumber || 'Unassigned';
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return null;
        return (
          <Chip
            label={getStatusLabel(params.value as LoadStatus)}
            color={getStatusColor(params.value as LoadStatus)}
            size="small"
          />
        );
      },
    },
    {
      field: 'rate',
      headerName: 'Rate',
      width: 100,
      valueFormatter: (params: any) => {
        if (params?.value === undefined || params?.value === null) return '₹0';
        return `₹${Number(params.value).toLocaleString()}`;
      },
    },
    {
      field: 'balance',
      headerName: 'Balance',
      width: 100,
      valueFormatter: (params: any) => {
        if (params?.value === undefined || params?.value === null) return '₹0';
        return `₹${Number(params.value).toLocaleString()}`;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const canEdit = user?.role === 'owner' || user?.role === 'dispatcher';
        const canDelete = user?.role === 'owner' || user?.role === 'dispatcher';
        
        return (
          <Box>
            <IconButton
              size="small"
              onClick={() => navigate(`/loads/${params.row.id}`)}
              title="View Details"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
            {canEdit && (
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedLoad(params.row as Load);
                  setEditDialogOpen(true);
                }}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {canDelete && (
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  setSelectedLoad(params.row as Load);
                  setDeleteDialogOpen(true);
                }}
                title="Delete"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      },
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
          Load Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLoads}
            disabled={loading}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'medium'}
          >
            Refresh
          </Button>
          {(user?.role === 'owner' || user?.role === 'dispatcher') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              fullWidth={isMobile}
              size={isMobile ? 'medium' : 'medium'}
            >
              Add Load
            </Button>
          )}
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
                      Total Loads
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.totalLoads}
                    </Typography>
                  </Box>
                  <LoadIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
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
                      Active Loads
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="info.main">
                      {stats.activeLoads}
                    </Typography>
                  </Box>
                  <TruckIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
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
                      Completed
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {stats.completedLoads}
                    </Typography>
                  </Box>
                  <CompleteIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
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
                      Revenue
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      ₹{(stats.revenue / 100000).toFixed(1)}L
                    </Typography>
                  </Box>
                  <MoneyIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
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
          placeholder="Search by load number, customer, or location..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
      </Box>

      {/* Data Grid */}
      <Card>
        <DataGrid
          rows={filteredLoads}
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
        <DialogTitle>Delete Load</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete load <strong>{selectedLoad?.loadNumber}</strong>?
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

      {/* Create Load Dialog */}
      <CreateLoadDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={fetchLoads}
      />

      {/* Edit Load Dialog */}
      <EditLoadDialog
        open={editDialogOpen}
        load={selectedLoad}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedLoad(null);
        }}
        onSuccess={fetchLoads}
      />
    </Box>
  );
};

export default LoadsPage;