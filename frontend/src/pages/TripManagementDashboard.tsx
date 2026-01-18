import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Divider,
  Stack,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  DirectionsCar,
  LocalShipping,
  Assignment,
  Cancel,
  Edit,
  MoreVert,
  Refresh,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { loadApi, driverApi, truckApi, trailerApi } from '@api/all.api';

interface ActiveTrip {
  id: string;
  loadNumber: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverEmail: string;
  truckId: string;
  truckNumber: string;
  truckMake: string;
  truckModel: string;
  trailerId: string;
  trailerNumber: string;
  trailerType: string;
  origin: string;
  destination: string;
  pickupDate: string;
  deliveryDate: string;
  status: string;
  rate: number;
  assignedAt: string;
}

const TripManagementDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [trips, setTrips] = useState<ActiveTrip[]>([]);
  const [assignedCount, setAssignedCount] = useState<number>(0);
  const [inTransitCount, setInTransitCount] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<ActiveTrip | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch loads for target statuses separately and combine
      const statuses = ['assigned', 'trip_started', 'in_transit'];
      const results = await Promise.all(
        statuses.map((status) => loadApi.getAllLoads({ status, limit: 100 }))
      );
      const combined = results.flat().filter(Boolean);
      const assignedLoads = Array.isArray(combined) ? combined : [];

      // Filter to only assigned trips and transform data
      const activeTrips = assignedLoads
        .filter((load: any) => load.driverId) // Only loads with assigned drivers
        .map((load: any) => ({
          id: load.id || load._id,
          loadNumber: load.loadNumber,
          driverId: typeof load.driverId === 'string' ? load.driverId : load.driverId?.id,
          driverName: load.driverId?.name || 'Unassigned',
          driverPhone: load.driverId?.phone || '-',
          driverEmail: load.driverId?.email || '-',
          truckId: typeof load.truckId === 'string' ? load.truckId : load.truckId?.id,
          truckNumber: load.truckId?.unitNumber || load.truckId?.truckNumber || '-',
          truckMake: load.truckId?.make || '-',
          truckModel: load.truckId?.model || '-',
          trailerId: typeof load.trailerId === 'string' ? load.trailerId : load.trailerId?.id,
          trailerNumber: load.trailerId?.unitNumber || '-',
          trailerType: load.trailerId?.type || '-',
          origin: load.pickupLocation?.city || load.origin?.city || '-',
          destination: load.deliveryLocation?.city || load.destination?.city || '-',
          pickupDate: load.pickupDate,
          deliveryDate: load.expectedDeliveryDate,
          status: load.status,
          rate: load.rate,
          assignedAt: load.statusHistory?.find((h: any) => h.status === 'assigned')?.timestamp || load.createdAt,
        }));

      setTrips(activeTrips);

      // Compute summary stats
      const assigned = activeTrips.filter((t) => t.status === 'assigned').length;
      const inTransit = activeTrips.filter((t) => t.status === 'in_transit' || t.status === 'trip_started').length;
      const total = activeTrips.reduce((sum, t) => sum + (Number(t.rate) || 0), 0);
      setAssignedCount(assigned);
      setInTransitCount(inTransit);
      setTotalValue(total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trips');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, trip: ActiveTrip) => {
    setSelectedTrip(trip);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = (trip: ActiveTrip) => {
    setSelectedTrip(trip);
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTrip(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'info';
      case 'trip_started':
        return 'warning';
      case 'in_transit':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'loadNumber',
      headerName: 'Load #',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600} color="primary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'driverName',
      headerName: 'Driver',
      flex: 1.2,
      minWidth: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {params.row.driverName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.driverPhone}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'truckNumber',
      headerName: 'Truck',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {params.row.truckNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.truckMake} {params.row.truckModel}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'trailerNumber',
      headerName: 'Trailer',
      flex: 0.9,
      minWidth: 100,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {params.row.trailerNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.trailerType}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'route',
      headerName: 'Route',
      flex: 1.2,
      minWidth: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {params.row.origin} → {params.row.destination}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(params.row.pickupDate).toLocaleDateString()}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => (
        <Chip
          label={params.value?.replace(/_/g, ' ').toUpperCase()}
          color={getStatusColor(params.value)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'rate',
      headerName: 'Rate',
      flex: 0.8,
      minWidth: 90,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>
          ₹{params.value?.toLocaleString()}
        </Typography>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              📋 Trip Management Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View all active driver-load-truck-trailer assignments
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchTrips}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Active Trips
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {trips.length}
                    </Typography>
                  </Box>
                  <DirectionsCar sx={{ fontSize: 40, color: 'primary.main', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Assigned
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {assignedCount}
                    </Typography>
                  </Box>
                  <Assignment sx={{ fontSize: 40, color: 'info.main', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      In Transit
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {inTransitCount}
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, color: 'warning.main', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Total Value
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      ₹{totalValue.toLocaleString()}
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, color: 'success.main', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Data Grid */}
        <Card>
          <CardHeader title="Active Trips" subheader="Driver • Truck • Trailer • Load Assignments" />
          <Divider />
          <Box sx={{ height: 600, width: '100%' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : trips.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">No active trips</Typography>
              </Box>
            ) : (
              <DataGrid
                rows={trips}
                columns={columns}
                pageSizeOptions={[5, 10, 20]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                disableRowSelectionOnClick
              />
            )}
          </Box>
        </Card>

        {/* Details Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>Trip Details</DialogTitle>
          {selectedTrip && (
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 2 }}>
                {/* Load Info */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    📦 Load Information
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Load Number
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {selectedTrip.loadNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Chip
                            label={selectedTrip.status?.replace(/_/g, ' ').toUpperCase()}
                            color={getStatusColor(selectedTrip.status)}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Rate
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            ₹{selectedTrip.rate.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Route
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {selectedTrip.origin} → {selectedTrip.destination}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Pickup Date
                          </Typography>
                          <Typography variant="body2">
                            {new Date(selectedTrip.pickupDate).toLocaleDateString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Delivery Date
                          </Typography>
                          <Typography variant="body2">
                            {new Date(selectedTrip.deliveryDate).toLocaleDateString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>

                {/* Driver Info */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    👤 Driver Information
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Driver Name
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {selectedTrip.driverName}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography variant="body2">
                            {selectedTrip.driverPhone}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body2">
                            {selectedTrip.driverEmail}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>

                {/* Truck Info */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    🚛 Truck Information
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Unit Number
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {selectedTrip.truckNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Model
                          </Typography>
                          <Typography variant="body2">
                            {selectedTrip.truckMake} {selectedTrip.truckModel}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>

                {/* Trailer Info */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    📦 Trailer Information
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Unit Number
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {selectedTrip.trailerNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Type
                          </Typography>
                          <Typography variant="body2">
                            {selectedTrip.trailerType}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </DialogContent>
          )}
          <DialogActions>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default TripManagementDashboard;
