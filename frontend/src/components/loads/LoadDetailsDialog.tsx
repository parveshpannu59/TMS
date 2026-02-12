import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Stack,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Close,
  LocalShipping,
  Person,
  Description,
  AttachMoney,
  Timeline as TimelineIcon,
  Speed,
  LocationOn,
  CalendarToday,
  Map as MapIcon,
} from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import { getApiOrigin } from '@/api/client';
import type { Load } from '@/api/load.api';

const TripTrackingMap = lazy(() => import('@/components/common/TripTrackingMap'));
const DocumentAnalyzer = lazy(() => import('@/components/common/DocumentAnalyzer'));

/** Build a full URL for backend-served files */
const fileUrl = (path: string | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${getApiOrigin()}${path}`;
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  booked: 'default',
  rate_confirmed: 'info',
  assigned: 'info',
  trip_accepted: 'primary',
  trip_started: 'warning',
  shipper_check_in: 'warning',
  shipper_load_in: 'warning',
  shipper_load_out: 'secondary',
  in_transit: 'primary',
  receiver_check_in: 'secondary',
  receiver_offload: 'secondary',
  delivered: 'warning',
  completed: 'success',
  cancelled: 'error',
};

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

interface LoadDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load | null;
}

export const LoadDetailsDialog: React.FC<LoadDetailsDialogProps> = ({ open, onClose, load }) => {
  const [tabValue, setTabValue] = useState(0);
  const [fullLoad, setFullLoad] = useState<any>(null);
  const [expenses, setExpenses] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [showDocAnalyzer, setShowDocAnalyzer] = useState(false);

  const loadId = (load as any)?._id || (load as any)?.id;

  const fetchTrackingData = useCallback(async () => {
    if (!loadId) return;
    try {
      const data = await loadApi.getLocationHistory(loadId);
      setTrackingData(data);
    } catch { /* ignore */ }
  }, [loadId]);

  useEffect(() => {
    if (open && load) {
      setTabValue(0);
      setLoading(true);
      Promise.all([
        loadApi.getLoadById(loadId).catch(() => null),
        loadApi.getLoadExpenses(loadId).catch(() => null),
        loadApi.getLocationHistory(loadId).catch(() => null),
      ]).then(([loadData, expenseData, locationData]) => {
        setFullLoad(loadData);
        setExpenses(expenseData);
        setTrackingData(locationData);
      }).finally(() => setLoading(false));
    }
  }, [open, load, loadId]);

  if (!load) return null;

  const ld = fullLoad || load;
  const pickup = ld.pickupLocation || ld.origin;
  const delivery = ld.deliveryLocation || ld.destination;
  const driver = ld.driverId;
  const driverName = typeof driver === 'object' ? driver?.name : null;
  const driverPhone = typeof driver === 'object' ? driver?.phone : null;
  const driverEmail = typeof driver === 'object' ? driver?.email : null;

  const formatDate = (d: any) => d ? new Date(d).toLocaleString() : '—';
  const formatDateShort = (d: any) => d ? new Date(d).toLocaleDateString() : '—';
  const formatLocation = (loc: any) => {
    if (!loc) return '—';
    const parts = [loc.address, loc.city, loc.state, loc.pincode].filter(Boolean);
    return parts.join(', ') || '—';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShipping color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={700}>Load #{ld.loadNumber}</Typography>
              <Chip
                label={(ld.status || '').replace(/_/g, ' ').toUpperCase()}
                color={STATUS_COLORS[ld.status] || 'default'}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <>
            {/* ─── Delivered Review Banner ─── */}
            {ld.status === 'delivered' && (
              <Alert
                severity="warning"
                variant="filled"
                sx={{ mb: 2, borderRadius: 2 }}
                icon={false}
              >
                <Typography fontWeight={700} gutterBottom>
                  🚚 Trip Delivered — Awaiting Your Review
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  The driver has completed delivery. Please review the trip details, documents, and expenses below, then confirm completion from the Loads table to approve payment.
                </Typography>
              </Alert>
            )}

            {/* ─── Payment Status Banner ─── */}
            {ld.status === 'completed' && (ld as any).paymentStatus && (ld as any).paymentStatus !== 'paid' && (
              <Alert
                severity="info"
                variant="outlined"
                sx={{ mb: 2, borderRadius: 2 }}
              >
                <Typography fontWeight={600}>
                  Payment Status: {((ld as any).paymentStatus || '').toUpperCase()}
                  {(ld as any).paymentAmount ? ` — $${(ld as any).paymentAmount}` : ''}
                </Typography>
                {(ld as any).reviewNotes && (
                  <Typography variant="body2" color="text.secondary">Review Notes: {(ld as any).reviewNotes}</Typography>
                )}
              </Alert>
            )}

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">Rate</Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">${(ld.rate || 0).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">Distance</Typography>
                    <Typography variant="h6" fontWeight={700}>{ld.distance ? `${ld.distance} mi` : '—'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">Weight</Typography>
                    <Typography variant="h6" fontWeight={700}>{ld.weight ? `${ld.weight.toLocaleString()} lbs` : '—'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">Expenses</Typography>
                    <Typography variant="h6" fontWeight={700} color="error.main">${expenses?.summary?.total?.toLocaleString() || '0'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Overview" icon={<LocationOn />} iconPosition="start" sx={{ minHeight: 48 }} />
              <Tab label="Driver & Vehicle" icon={<Person />} iconPosition="start" sx={{ minHeight: 48 }} />
              <Tab label="Documents" icon={<Description />} iconPosition="start" sx={{ minHeight: 48 }} />
              <Tab label="Expenses" icon={<AttachMoney />} iconPosition="start" sx={{ minHeight: 48 }} />
              <Tab label="Timeline" icon={<TimelineIcon />} iconPosition="start" sx={{ minHeight: 48 }} />
              <Tab label="Trip Details" icon={<Speed />} iconPosition="start" sx={{ minHeight: 48 }} />
              <Tab label="Live Tracking" icon={<MapIcon />} iconPosition="start" sx={{ minHeight: 48 }} />
            </Tabs>

            {/* Tab 0: Overview */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                {/* Pickup */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="error.main" fontWeight={700} gutterBottom>
                        PICK UP
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>{pickup?.city || '—'}, {pickup?.state || ''}</Typography>
                      <Typography variant="body2" color="text.secondary">{formatLocation(pickup)}</Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Pickup Date</Typography>
                          <Typography variant="body2" fontWeight={600}>{formatDateShort(ld.pickupDate)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Stop #</Typography>
                          <Typography variant="body2" fontWeight={600}>1</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Delivery */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="success.main" fontWeight={700} gutterBottom>
                        DELIVERY
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>{delivery?.city || '—'}, {delivery?.state || ''}</Typography>
                      <Typography variant="body2" color="text.secondary">{formatLocation(delivery)}</Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Expected Delivery</Typography>
                          <Typography variant="body2" fontWeight={600}>{formatDateShort(ld.expectedDeliveryDate)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Actual Delivery</Typography>
                          <Typography variant="body2" fontWeight={600}>{formatDateShort(ld.actualDeliveryDate)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Cargo Details */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Cargo Details</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Cargo Type</Typography>
                          <Typography variant="body2" fontWeight={600}>{ld.cargoType || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Description</Typography>
                          <Typography variant="body2">{ld.cargoDescription || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Load Type</Typography>
                          <Typography variant="body2" fontWeight={600}>{ld.loadType || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Customer</Typography>
                          <Typography variant="body2" fontWeight={600}>{ld.customerName || '—'}</Typography>
                        </Grid>
                      </Grid>
                      {ld.specialInstructions && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">Special Instructions</Typography>
                          <Typography variant="body2">{ld.specialInstructions}</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 1: Driver & Vehicle */}
            <TabPanel value={tabValue} index={1}>
              <Stack spacing={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>Driver Information</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">Driver Name</Typography>
                        <Typography variant="body2" fontWeight={600}>{driverName || '—'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">Phone</Typography>
                        <Typography variant="body2">{driverPhone || '—'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">Email</Typography>
                        <Typography variant="body2">{driverEmail || '—'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>Vehicle Information</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">Truck</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {typeof ld.truckId === 'object' ? `${ld.truckId?.unitNumber || ''} - ${ld.truckId?.make || ''} ${ld.truckId?.model || ''}` : ld.truckId || '—'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">Trailer</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {typeof ld.trailerId === 'object' ? `${ld.trailerId?.unitNumber || ''} - ${ld.trailerId?.type || ''}` : ld.trailerId || '—'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">Assigned At</Typography>
                        <Typography variant="body2">{formatDate(ld.assignedAt)}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {ld.driverFormDetails && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Driver Form Details</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Pickup Ref #</Typography>
                          <Typography variant="body2" fontWeight={600}>{ld.driverFormDetails.pickupReferenceNumber || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Pickup Place</Typography>
                          <Typography variant="body2">{ld.driverFormDetails.pickupPlace || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Dropoff Ref #</Typography>
                          <Typography variant="body2" fontWeight={600}>{ld.driverFormDetails.dropoffReferenceNumber || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Dropoff Location</Typography>
                          <Typography variant="body2">{ld.driverFormDetails.dropoffLocation || '—'}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </TabPanel>

            {/* Tab 2: Documents */}
            <TabPanel value={tabValue} index={2}>
              <Stack spacing={2}>
                {ld.documents?.bol || ld.documents?.pod || (ld.documents?.others?.length > 0) ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Uploaded Documents</Typography>
                      <Stack spacing={1.5}>
                        {ld.documents.bol && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Description color="primary" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Bill of Lading (BOL)</Typography>
                                <Typography variant="caption" color="text.secondary">Uploaded during trip</Typography>
                              </Box>
                            </Box>
                            <Button size="small" variant="outlined" onClick={() => window.open(fileUrl(ld.documents.bol), '_blank')}>View</Button>
                          </Box>
                        )}
                        {ld.documents.pod && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Description color="success" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Proof of Delivery (POD)</Typography>
                                <Typography variant="caption" color="text.secondary">Uploaded at offload</Typography>
                              </Box>
                            </Box>
                            <Button size="small" variant="outlined" onClick={() => window.open(fileUrl(ld.documents.pod), '_blank')}>View</Button>
                          </Box>
                        )}
                        {ld.documents.lr && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Description color="info" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Lorry Receipt (LR)</Typography>
                                <Typography variant="caption" color="text.secondary">Transport document</Typography>
                              </Box>
                            </Box>
                            <Button size="small" variant="outlined" onClick={() => window.open(fileUrl(ld.documents.lr), '_blank')}>View</Button>
                          </Box>
                        )}
                        {ld.documents.others?.map((doc: string, i: number) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Description />
                              <Typography variant="body2" fontWeight={600}>Document {i + 1}</Typography>
                            </Box>
                            <Button size="small" variant="outlined" onClick={() => window.open(fileUrl(doc), '_blank')}>View</Button>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                ) : (
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <Description sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">No documents uploaded yet</Typography>
                      <Typography variant="caption" color="text.disabled">Documents will appear here when the driver uploads BOL, POD, or other files</Typography>
                    </CardContent>
                  </Card>
                )}

                {/* Document Analyzer */}
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => setShowDocAnalyzer(true)}
                      startIcon={<Description />}
                      sx={{ borderRadius: 2 }}
                    >
                      Analyze Document (PDF / Image)
                    </Button>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                      Upload any BOL, POD, Invoice, or Receipt to extract data automatically
                    </Typography>
                  </CardContent>
                </Card>

                {/* Odometer Photos */}
                {(ld.tripStartDetails?.startingPhoto || ld.tripCompletionDetails?.endingPhoto) && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Odometer Photos</Typography>
                      <Grid container spacing={2}>
                        {ld.tripStartDetails?.startingPhoto && (
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Starting Odometer</Typography>
                            <Button size="small" fullWidth variant="outlined" sx={{ mt: 0.5 }} onClick={() => window.open(fileUrl(ld.tripStartDetails.startingPhoto), '_blank')}>
                              View Photo
                            </Button>
                          </Grid>
                        )}
                        {ld.tripCompletionDetails?.endingPhoto && (
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Ending Odometer</Typography>
                            <Button size="small" fullWidth variant="outlined" sx={{ mt: 0.5 }} onClick={() => window.open(fileUrl(ld.tripCompletionDetails.endingPhoto), '_blank')}>
                              View Photo
                            </Button>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </TabPanel>

            {/* Tab 3: Expenses */}
            <TabPanel value={tabValue} index={3}>
              <Stack spacing={2}>
                {/* Summary */}
                {expenses?.summary && (
                  <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Expense Summary</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Total</Typography>
                          <Typography variant="h6" fontWeight={700} color="error.main">${expenses.summary.total?.toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Fuel</Typography>
                          <Typography variant="body1" fontWeight={600}>${expenses.summary.fuel?.toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Tolls</Typography>
                          <Typography variant="body1" fontWeight={600}>${expenses.summary.tolls?.toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Other</Typography>
                          <Typography variant="body1" fontWeight={600}>${expenses.summary.other?.toLocaleString()}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Individual Expenses */}
                {expenses?.expenses?.length > 0 ? (
                  expenses.expenses.map((exp: any, idx: number) => {
                    // Parse description for structured info (legacy format: "key: val | key: val")
                    const descParts = (exp.description || '').split(' | ').filter((p: string) => p && !p.startsWith('/uploads') && !p.includes('Odometer Before Photo:') && !p.includes('Odometer After Photo:'));
                    const cleanDesc = descParts.filter((p: string) => !p.startsWith('Station:') && !p.startsWith('Qty:') && !p.startsWith('Odometer') && !p.startsWith('Paid by:') && !p.startsWith('Repair:') && !p.startsWith('Start:') && !p.startsWith('End:') && !p.startsWith('Downtime:'));
                    
                    // Extract photo URLs from description (legacy)
                    const photoUrlsFromDesc: string[] = [];
                    (exp.description || '').split(' | ').forEach((p: string) => {
                      const match = p.match(/Photo:\s*(\/uploads\/[^\s|]+)/);
                      if (match) photoUrlsFromDesc.push(match[1]);
                    });
                    
                    return (
                      <Card key={exp._id || idx} variant="outlined">
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          {/* Header row */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Chip label={exp.category} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                              <Chip label={exp.paidBy || 'driver'} size="small" variant="outlined" color={exp.paidBy === 'driver' ? 'warning' : 'default'} sx={{ textTransform: 'capitalize' }} />
                              {exp.reimbursementStatus === 'pending' && (
                                <Chip label="Reimbursement Pending" size="small" color="warning" />
                              )}
                            </Box>
                            <Typography variant="h6" fontWeight={700}>${exp.amount?.toLocaleString()}</Typography>
                          </Box>

                          {/* Structured details */}
                          <Grid container spacing={1} sx={{ mb: 1 }}>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">Location</Typography>
                              <Typography variant="body2">{exp.fuelStation || exp.location || '—'}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">Date</Typography>
                              <Typography variant="body2">{formatDate(exp.date)}</Typography>
                            </Grid>

                            {/* Fuel-specific */}
                            {exp.category === 'fuel' && exp.fuelQuantity && (
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Fuel Quantity</Typography>
                                <Typography variant="body2" fontWeight={600}>{exp.fuelQuantity} gal</Typography>
                              </Grid>
                            )}
                            {exp.category === 'fuel' && (exp.odometerBefore || exp.odometerAfter) && (
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Odometer</Typography>
                                <Typography variant="body2">{exp.odometerBefore || '—'} → {exp.odometerAfter || '—'}</Typography>
                              </Grid>
                            )}

                            {/* Repair-specific */}
                            {exp.category === 'repair' && exp.repairDowntimeHours && (
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Downtime</Typography>
                                <Typography variant="body2" fontWeight={600} color="error">{exp.repairDowntimeHours}h</Typography>
                              </Grid>
                            )}
                            {exp.category === 'repair' && exp.repairDescription && (
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">Repair Type</Typography>
                                <Typography variant="body2">{exp.repairDescription}</Typography>
                              </Grid>
                            )}
                            {exp.category === 'repair' && exp.repairStartTime && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Repair Period</Typography>
                                <Typography variant="body2">{formatDate(exp.repairStartTime)} — {formatDate(exp.repairEndTime)}</Typography>
                              </Grid>
                            )}
                          </Grid>

                          {/* Notes (clean description without file paths) */}
                          {cleanDesc.length > 0 && cleanDesc.join(' ').trim() && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                              {cleanDesc.join(' | ')}
                            </Typography>
                          )}

                          {/* Attachments: Receipt + Odometer photos */}
                          {(exp.receiptUrl || exp.odometerBeforePhoto || exp.odometerAfterPhoto || photoUrlsFromDesc.length > 0) && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                              {exp.receiptUrl && (
                                <Button size="small" variant="outlined" startIcon={<Description />} onClick={() => window.open(fileUrl(exp.receiptUrl), '_blank')}>
                                  Receipt
                                </Button>
                              )}
                              {exp.odometerBeforePhoto && (
                                <Button size="small" variant="outlined" onClick={() => window.open(fileUrl(exp.odometerBeforePhoto), '_blank')}>
                                  Odometer Before
                                </Button>
                              )}
                              {exp.odometerAfterPhoto && (
                                <Button size="small" variant="outlined" onClick={() => window.open(fileUrl(exp.odometerAfterPhoto), '_blank')}>
                                  Odometer After
                                </Button>
                              )}
                              {/* Legacy: photo URLs embedded in description */}
                              {photoUrlsFromDesc.map((url, i) => (
                                <Button key={i} size="small" variant="outlined" onClick={() => window.open(fileUrl(url), '_blank')}>
                                  Photo {i + 1}
                                </Button>
                              ))}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <AttachMoney sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">No expenses logged</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </TabPanel>

            {/* Tab 4: Timeline */}
            <TabPanel value={tabValue} index={4}>
              {ld.statusHistory?.length > 0 ? (
                <Card variant="outlined">
                  <CardContent>
                    {ld.statusHistory.slice().reverse().map((h: any, i: number) => (
                      <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: i === 0 ? 'success.main' : 'grey.400', flexShrink: 0, mt: 0.5 }} />
                          {i < ld.statusHistory.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'grey.300', my: 0.5 }} />}
                        </Box>
                        <Box sx={{ flex: 1, pb: 1 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                            {h.status?.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <CalendarToday sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                            {formatDate(h.timestamp)}
                          </Typography>
                          {h.notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {h.notes}
                            </Typography>
                          )}
                          {h.lat && h.lng && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <LocationOn sx={{ fontSize: 14, color: 'primary.main' }} />
                              <Typography variant="caption" color="primary.main" fontWeight={500}>
                                {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No timeline events yet</Typography>
                  </CardContent>
                </Card>
              )}
            </TabPanel>

            {/* Tab 5: Trip Details */}
            <TabPanel value={tabValue} index={5}>
              <Stack spacing={2}>
                {/* Odometer Logs */}
                {ld.tripStartDetails && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Odometer Logs</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Starting Mileage</Typography>
                          <Typography variant="body1" fontWeight={700}>{ld.tripStartDetails.startingMileage?.toLocaleString()} mi</Typography>
                        </Grid>
                        {ld.tripCompletionDetails?.endingMileage && (
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Ending Mileage</Typography>
                            <Typography variant="body1" fontWeight={700}>{ld.tripCompletionDetails.endingMileage?.toLocaleString()} mi</Typography>
                          </Grid>
                        )}
                        {ld.tripCompletionDetails?.totalMiles && (
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Total Miles Driven</Typography>
                            <Typography variant="body1" fontWeight={700} color="primary">{ld.tripCompletionDetails.totalMiles?.toLocaleString()} mi</Typography>
                          </Grid>
                        )}
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Trip Started</Typography>
                          <Typography variant="body2">{formatDate(ld.tripStartDetails.tripStartedAt)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Trip Completion */}
                {ld.tripCompletionDetails && (
                  <Card variant="outlined" sx={{ bgcolor: 'success.50' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Trip Completion Summary</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Total Payment</Typography>
                          <Typography variant="h6" fontWeight={700} color="success.main">${ld.tripCompletionDetails.totalPayment?.toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Rate per Mile</Typography>
                          <Typography variant="body1" fontWeight={600}>${ld.tripCompletionDetails.rate?.toFixed(2)}/mi</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Trip Expenses</Typography>
                          <Typography variant="body1" fontWeight={600} color="error">${ld.tripCompletionDetails.expenses?.totalExpenses?.toLocaleString() || '0'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Completed At</Typography>
                          <Typography variant="body2">{formatDate(ld.tripCompletionDetails.completedAt)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Shipper Details */}
                {ld.shipperCheckInDetails && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Shipper Check-in</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">PO Number</Typography>
                          <Typography variant="body2" fontWeight={600}>{ld.shipperCheckInDetails.poNumber || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Reference #</Typography>
                          <Typography variant="body2">{ld.shipperCheckInDetails.referenceNumber || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Check-in Time</Typography>
                          <Typography variant="body2">{formatDate(ld.shipperCheckInDetails.checkInAt)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Receiver Offload */}
                {ld.receiverOffloadDetails && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Receiver Offload</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Offload Time</Typography>
                          <Typography variant="body2">{formatDate(ld.receiverOffloadDetails.offloadAt)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">BOL Acknowledged</Typography>
                          <Chip label={ld.receiverOffloadDetails.bolAcknowledged ? 'Yes' : 'No'} color={ld.receiverOffloadDetails.bolAcknowledged ? 'success' : 'default'} size="small" />
                        </Grid>
                        {ld.receiverOffloadDetails.quantity && (
                          <Grid item xs={6} sm={4}>
                            <Typography variant="caption" color="text.secondary">Quantity</Typography>
                            <Typography variant="body2">{ld.receiverOffloadDetails.quantity}</Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* No trip details yet */}
                {!ld.tripStartDetails && !ld.tripCompletionDetails && (
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <Speed sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">Trip not started yet</Typography>
                      <Typography variant="caption" color="text.disabled">Details will appear once the driver starts the trip</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </TabPanel>

            {/* Tab 6: Live Tracking Map */}
            <TabPanel value={tabValue} index={6}>
              <Stack spacing={2}>
                {/* Status Banner */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<MapIcon />}
                    label={
                      trackingData?.currentLocation
                        ? `Driver is ${(trackingData.status || ld.status || '').replace(/_/g, ' ')}`
                        : 'No live location data'
                    }
                    color={trackingData?.currentLocation ? 'success' : 'default'}
                    variant="outlined"
                  />
                  {trackingData?.driverName && (
                    <Chip
                      icon={<Person />}
                      label={trackingData.driverName}
                      variant="outlined"
                      size="small"
                    />
                  )}
                  {trackingData?.locationHistory?.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {trackingData.locationHistory.length} location points tracked
                    </Typography>
                  )}
                </Box>

                {/* Map */}
                <Suspense fallback={
                  <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8', borderRadius: 2 }}>
                    <CircularProgress />
                  </Box>
                }>
                  <TripTrackingMap
                    currentLocation={trackingData?.currentLocation || null}
                    locationHistory={trackingData?.locationHistory || []}
                    pickupLocation={trackingData?.pickupLocation || pickup}
                    deliveryLocation={trackingData?.deliveryLocation || delivery}
                    driverName={trackingData?.driverName || driverName || 'Driver'}
                    loadNumber={ld.loadNumber}
                    loadId={ld.id || (ld as any)._id}
                    status={trackingData?.status || ld.status}
                    height={400}
                    showRoute={true}
                    autoRefresh={true}
                    onRefresh={fetchTrackingData}
                    onRealtimeLocation={(data) => {
                      // Instant map update via Pusher — append to tracking data
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
                </Suspense>

                {/* Location Details */}
                {trackingData?.currentLocation && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Last Known Location</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Latitude</Typography>
                          <Typography variant="body2" fontWeight={600}>{trackingData.currentLocation.lat?.toFixed(5)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Longitude</Typography>
                          <Typography variant="body2" fontWeight={600}>{trackingData.currentLocation.lng?.toFixed(5)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Last Update</Typography>
                          <Typography variant="body2">{trackingData.currentLocation.timestamp ? new Date(trackingData.currentLocation.timestamp).toLocaleString() : '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Speed</Typography>
                          <Typography variant="body2">{trackingData.currentLocation.speed ? `${(trackingData.currentLocation.speed * 3.6).toFixed(0)} km/h` : '—'}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Location History Summary */}
                {trackingData?.locationHistory?.length > 0 && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Route History ({trackingData.locationHistory.length} points)
                      </Typography>
                      <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                        {trackingData.locationHistory.slice(-20).reverse().map((pt: any, idx: number) => (
                          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider', fontSize: '0.75rem' }}>
                            <Typography variant="caption" color="text.secondary">
                              {pt.timestamp ? new Date(pt.timestamp).toLocaleString() : '—'}
                            </Typography>
                            <Typography variant="caption">
                              {pt.lat?.toFixed(4)}, {pt.lng?.toFixed(4)}
                              {pt.speed ? ` | ${(pt.speed * 3.6).toFixed(0)} km/h` : ''}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* No tracking data */}
                {!trackingData?.currentLocation && (!trackingData?.locationHistory || trackingData.locationHistory.length === 0) && (
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <MapIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">No tracking data available</Typography>
                      <Typography variant="caption" color="text.disabled">
                        Location tracking starts when the driver begins the trip
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </TabPanel>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>

      {/* Document Analyzer Dialog */}
      <Suspense fallback={null}>
        <DocumentAnalyzer
          open={showDocAnalyzer}
          onClose={() => setShowDocAnalyzer(false)}
        />
      </Suspense>
    </Dialog>
  );
};
