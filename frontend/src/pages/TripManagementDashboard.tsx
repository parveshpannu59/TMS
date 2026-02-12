import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
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
  Description,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { StatsCard } from '@/components/common/StatsCard';
import { loadApi, driverApi, truckApi, trailerApi } from '@api/all.api';
import { useTranslation } from 'react-i18next';

const TripTrackingMap = lazy(() => import('@/components/common/TripTrackingMap'));
const DocumentAnalyzer = lazy(() => import('@/components/common/DocumentAnalyzer'));

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

// Helper component to load and display tracking map with real-time Pusher updates
function TripTrackingMapSection({ loadId, driverName, loadNumber, status }: { loadId: string; driverName: string; loadNumber: string; status: string }) {
  const [trackingData, setTrackingData] = useState<any>(null);
  const fetchTracking = useCallback(async () => {
    try {
      const data = await loadApi.getLocationHistory(loadId);
      setTrackingData(data);
    } catch { /* ignore */ }
  }, [loadId]);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  return (
    <TripTrackingMap
      currentLocation={trackingData?.currentLocation || null}
      locationHistory={trackingData?.locationHistory || []}
      pickupLocation={trackingData?.pickupLocation || null}
      deliveryLocation={trackingData?.deliveryLocation || null}
      driverName={trackingData?.driverName || driverName}
      loadNumber={loadNumber}
      loadId={loadId}
      status={trackingData?.status || status}
      height={350}
      showRoute={true}
      autoRefresh={true}
      onRefresh={fetchTracking}
      onRealtimeLocation={(data) => {
        // Instant update via Pusher — the map moves the truck immediately
        setTrackingData((prev: any) => {
          if (!prev) return prev;
          const newPoint = { lat: data.lat, lng: data.lng, timestamp: data.timestamp, speed: data.speed, accuracy: data.accuracy };
          return {
            ...prev,
            currentLocation: newPoint,
            locationHistory: [...(prev.locationHistory || []), newPoint],
          };
        });
      }}
    />
  );
}

const TripManagementDashboard: React.FC = () => {
  const { t } = useTranslation();
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

  const [tripDetail, setTripDetail] = useState<any>(null);
  const [tripExpenses, setTripExpenses] = useState<any>(null);
  const [showDocAnalyzer, setShowDocAnalyzer] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleViewDetails = async (trip: ActiveTrip) => {
    setSelectedTrip(trip);
    setOpenDialog(true);
    handleMenuClose();
    // Fetch full load details and expenses
    try {
      setDetailLoading(true);
      const [loadData, expenseData] = await Promise.all([
        loadApi.getLoadById(trip.id),
        loadApi.getLoadExpenses(trip.id).catch(() => null),
      ]);
      setTripDetail(loadData);
      setTripExpenses(expenseData);
    } catch {
      setTripDetail(null);
      setTripExpenses(null);
    } finally {
      setDetailLoading(false);
    }
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
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2.5,
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(6,182,212,0.3)',
            }}>
              <DirectionsCar sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {t('trips.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                {t('trips.subtitle')}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchTrips}
            disabled={loading}
          >
            {t('trips.refresh')}
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
            <StatsCard title={t('trips.activeTrips')} value={trips.length} icon={<DirectionsCar />} color="#3b82f6" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard title={t('trips.assigned')} value={assignedCount} icon={<Assignment />} color="#06b6d4" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard title={t('trips.inTransit')} value={inTransitCount} icon={<LocalShipping />} color="#f59e0b" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard title={t('trips.totalValue')} value={`₹${totalValue.toLocaleString()}`} icon={<LocalShipping />} color="#10b981" />
          </Grid>
        </Grid>

        {/* Data Grid */}
        <Card>
          <CardHeader title={t('trips.activeTrips')} subheader={t('trips.driverTruckTrailerLoad')} />
          <Divider />
          <Box sx={{ height: 600, width: '100%' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : trips.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">{t('trips.noActiveTrips')}</Typography>
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

                {/* Detailed Trip Data - loaded async */}
                {detailLoading && (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>Loading trip details...</Typography>
                  </Box>
                )}

                {/* Odometer Logs */}
                {tripDetail?.tripStartDetails && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      🔢 Odometer Logs
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Starting Mileage</Typography>
                            <Typography variant="body2" fontWeight={600}>{tripDetail.tripStartDetails.startingMileage?.toLocaleString()} mi</Typography>
                          </Grid>
                          {tripDetail.tripCompletionDetails?.endingMileage && (
                            <Grid item xs={12} sm={4}>
                              <Typography variant="caption" color="text.secondary">Ending Mileage</Typography>
                              <Typography variant="body2" fontWeight={600}>{tripDetail.tripCompletionDetails.endingMileage?.toLocaleString()} mi</Typography>
                            </Grid>
                          )}
                          {tripDetail.tripCompletionDetails?.totalMiles && (
                            <Grid item xs={12} sm={4}>
                              <Typography variant="caption" color="text.secondary">Total Miles</Typography>
                              <Typography variant="body2" fontWeight={600} color="primary">{tripDetail.tripCompletionDetails.totalMiles?.toLocaleString()} mi</Typography>
                            </Grid>
                          )}
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Trip Started At</Typography>
                            <Typography variant="body2">{new Date(tripDetail.tripStartDetails.tripStartedAt).toLocaleString()}</Typography>
                          </Grid>
                          {tripDetail.tripStartDetails.startingPhoto && (
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="text.secondary">Odometer Photo</Typography>
                              <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }} onClick={() => window.open(tripDetail.tripStartDetails.startingPhoto, '_blank')}>
                                View Photo
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Expenses: Fuel Records */}
                {tripExpenses?.expenses?.filter((e: any) => e.category === 'fuel').length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      ⛽ Fuel Records
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        {tripExpenses.expenses.filter((e: any) => e.category === 'fuel').map((exp: any, idx: number) => (
                          <Box key={exp._id || idx} sx={{ mb: idx < tripExpenses.expenses.filter((e: any) => e.category === 'fuel').length - 1 ? 2 : 0, pb: 1, borderBottom: idx < tripExpenses.expenses.filter((e: any) => e.category === 'fuel').length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                            <Grid container spacing={1}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Amount</Typography>
                                <Typography variant="body2" fontWeight={600}>${exp.amount?.toLocaleString()}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Station</Typography>
                                <Typography variant="body2">{exp.fuelStation || exp.location || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Quantity</Typography>
                                <Typography variant="body2">{exp.fuelQuantity ? `${exp.fuelQuantity} gal` : '—'}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Paid By</Typography>
                                <Chip label={exp.paidBy || 'driver'} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Expenses: Toll Entries */}
                {tripExpenses?.expenses?.filter((e: any) => e.category === 'toll').length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      🛣️ Toll Entries
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        {tripExpenses.expenses.filter((e: any) => e.category === 'toll').map((exp: any, idx: number) => (
                          <Box key={exp._id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>${exp.amount?.toLocaleString()}</Typography>
                              <Typography variant="caption" color="text.secondary">{exp.location || '—'} | {new Date(exp.date).toLocaleDateString()}</Typography>
                            </Box>
                            <Chip label={exp.paidBy || 'driver'} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Expenses: Maintenance Records */}
                {tripExpenses?.expenses?.filter((e: any) => e.category === 'repair').length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      🔧 Maintenance Records
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        {tripExpenses.expenses.filter((e: any) => e.category === 'repair').map((exp: any, idx: number) => (
                          <Box key={exp._id || idx} sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Grid container spacing={1}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Cost</Typography>
                                <Typography variant="body2" fontWeight={600}>${exp.amount?.toLocaleString()}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Downtime</Typography>
                                <Typography variant="body2">{exp.repairDowntimeHours ? `${exp.repairDowntimeHours}h` : '—'}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Location</Typography>
                                <Typography variant="body2">{exp.location || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Paid By</Typography>
                                <Chip label={exp.paidBy || 'driver'} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                              </Grid>
                              {exp.repairDescription && (
                                <Grid item xs={12}>
                                  <Typography variant="caption" color="text.secondary">Description</Typography>
                                  <Typography variant="body2">{exp.repairDescription}</Typography>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* All Other Expenses */}
                {tripExpenses?.expenses?.filter((e: any) => !['fuel', 'toll', 'repair'].includes(e.category)).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      💰 Other Expenses
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        {tripExpenses.expenses.filter((e: any) => !['fuel', 'toll', 'repair'].includes(e.category)).map((exp: any, idx: number) => (
                          <Box key={exp._id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box>
                              <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{exp.category}: ${exp.amount?.toLocaleString()}</Typography>
                              <Typography variant="caption" color="text.secondary">{exp.location || '—'} | {exp.description || ''}</Typography>
                            </Box>
                            <Chip label={exp.paidBy || 'driver'} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Expense Summary */}
                {tripExpenses?.summary && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      📊 Expense Summary
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Total Expenses</Typography>
                            <Typography variant="body2" fontWeight={700} color="error">${tripExpenses.summary.total?.toLocaleString()}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Fuel</Typography>
                            <Typography variant="body2" fontWeight={600}>${tripExpenses.summary.fuel?.toLocaleString()}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Tolls</Typography>
                            <Typography variant="body2" fontWeight={600}>${tripExpenses.summary.tolls?.toLocaleString()}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Other</Typography>
                            <Typography variant="body2" fontWeight={600}>${tripExpenses.summary.other?.toLocaleString()}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Uploaded Documents */}
                {tripDetail?.documents && (tripDetail.documents.bol || tripDetail.documents.pod || tripDetail.documents.others?.length > 0) && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      📄 Uploaded Documents
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={1}>
                          {tripDetail.documents.bol && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">Bill of Lading (BOL)</Typography>
                              <Button size="small" onClick={() => window.open(tripDetail.documents.bol, '_blank')}>View</Button>
                            </Box>
                          )}
                          {tripDetail.documents.pod && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">Proof of Delivery (POD)</Typography>
                              <Button size="small" onClick={() => window.open(tripDetail.documents.pod, '_blank')}>View</Button>
                            </Box>
                          )}
                          {tripDetail.documents.others?.map((doc: string, i: number) => (
                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">Document {i + 1}</Typography>
                              <Button size="small" onClick={() => window.open(doc, '_blank')}>View</Button>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Live Tracking Map */}
                {selectedTrip && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      📍 Live Driver Tracking
                    </Typography>
                    <Suspense fallback={
                      <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8', borderRadius: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    }>
                      <TripTrackingMapSection loadId={selectedTrip.id} driverName={selectedTrip.driverName} loadNumber={selectedTrip.loadNumber} status={selectedTrip.status} />
                    </Suspense>
                  </Box>
                )}

                {/* Trip Timeline */}
                {tripDetail?.statusHistory?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      📅 Trip Timeline
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        {tripDetail.statusHistory.slice().reverse().map((h: any, i: number) => (
                          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: i === 0 ? 'success.main' : 'grey.400', flexShrink: 0 }} />
                              {i < tripDetail.statusHistory.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'grey.300' }} />}
                            </Box>
                            <Box sx={{ flex: 1, pb: 0.5 }}>
                              <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                                {h.status?.replace(/_/g, ' ')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(h.timestamp).toLocaleString()}
                              </Typography>
                              {h.notes && <Typography variant="caption" display="block">{h.notes}</Typography>}
                              {h.lat && h.lng && (
                                <Typography variant="caption" display="block" color="primary.main" sx={{ fontWeight: 500 }}>
                                  📍 {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Document Analyzer Button */}
                <Box sx={{ textAlign: 'center', pt: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowDocAnalyzer(true)}
                    startIcon={<Description />}
                    sx={{ borderRadius: 2 }}
                  >
                    Analyze Document (PDF / Image)
                  </Button>
                </Box>
              </Stack>
            </DialogContent>
          )}
          <DialogActions>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Document Analyzer Dialog */}
        <Suspense fallback={null}>
          <DocumentAnalyzer
            open={showDocAnalyzer}
            onClose={() => setShowDocAnalyzer(false)}
          />
        </Suspense>
      </Box>
    </DashboardLayout>
  );
};

export default TripManagementDashboard;
