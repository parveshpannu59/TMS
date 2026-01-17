import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Fab,
  AppBar,
  Toolbar,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  useMediaQuery,
  Stack,
  Avatar,
  Badge,
} from '@mui/material';
import {
  DirectionsCar,
  Assignment,
  CheckCircle,
  LocationOn,
  Message,
  Warning,
  Menu as MenuIcon,
  Send,
  PhotoCamera,
  AttachFile,
  Cancel,
  Refresh,
  AccountCircle,
  LocalShipping,
  Money,
  Route,
  AccessTime,
} from '@mui/icons-material';
import { useAuth } from '@hooks/useAuth';
import { loadApi } from '@/api/all.api';
import { messageApi } from '@/api/message.api';
import { driverApi } from '@/api/driver.api';
import type { Load, LoadStatus } from '@/types/all.types';
import { DriverFormDialog } from '@/components/driver/DriverFormDialog';
import { StartTripDialog } from '@/components/driver/StartTripDialog';
import { ShipperCheckInDialog } from '@/components/driver/ShipperCheckInDialog';
import { LoadOutDialog } from '@/components/driver/LoadOutDialog';
import { ReceiverOffloadDialog } from '@/components/driver/ReceiverOffloadDialog';
import { EndTripDialog } from '@/components/driver/EndTripDialog';

const DriverDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { user } = useAuth();
  
  const [currentLoad, setCurrentLoad] = useState<Load | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [driver, setDriver] = useState<any>(null); // Driver record
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bottomNav, setBottomNav] = useState(0);
  const [sosDialogOpen, setSosDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [sosMessage, setSosMessage] = useState('');
  const [sosLocation, setSosLocation] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Dialog states
  const [driverFormDialogOpen, setDriverFormDialogOpen] = useState(false);
  const [startTripDialogOpen, setStartTripDialogOpen] = useState(false);
  const [shipperCheckInDialogOpen, setShipperCheckInDialogOpen] = useState(false);
  const [loadOutDialogOpen, setLoadOutDialogOpen] = useState(false);
  const [receiverOffloadDialogOpen, setReceiverOffloadDialogOpen] = useState(false);
  const [endTripDialogOpen, setEndTripDialogOpen] = useState(false);

  // First, fetch the driver record for current user
  const fetchDriver = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const allDrivers = await driverApi.getDrivers();
      // Find driver linked to current user
      // Driver might be linked via userId field or we need to match by email/phone
      const currentDriver = allDrivers.find((d: any) => {
        // Check if driver has userId that matches user.id
        const driverUserId = typeof d.userId === 'string' 
          ? d.userId 
          : (d.userId as any)?.id || (d.userId as any)?._id;
        
        // Also check by email/phone as fallback
        return driverUserId === user.id || 
               d.email === user.email || 
               (d.userId?.email === user.email);
      });
      return currentDriver || null;
    } catch (err) {
      console.error('Failed to fetch driver:', err);
      return null;
    }
  }, [user]);

  // Fetch driver's current and assigned loads
  const fetchLoads = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, get the driver record for current user
      const currentDriver = await fetchDriver();
      setDriver(currentDriver);
      
      if (!currentDriver) {
        setError('Driver profile not found. Please contact administrator.');
        setLoads([]);
        return;
      }

      const driverId = currentDriver.id || currentDriver._id;
      if (!driverId) {
        setError('Invalid driver ID');
        setLoads([]);
        return;
      }

      const response = await loadApi.getAllLoads();
      // Filter loads assigned to current driver using driver._id
      const driverLoads = response.filter(
        (load: Load) => {
          const loadDriverId = typeof load.driverId === 'string' 
            ? load.driverId 
            : (load.driverId as any)?.id || (load.driverId as any)?._id || load.driverId;
          return loadDriverId === driverId;
        }
      );
      setLoads(driverLoads);
      
      // Get current active load
      const activeLoad = driverLoads.find(
        (load: Load) =>
          !['completed', 'cancelled', 'delivered'].includes(load.status)
      ) || null;
      setCurrentLoad(activeLoad);
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch loads');
    } finally {
      setLoading(false);
    }
  }, [user, fetchDriver]);

  // Fetch unread message count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await messageApi.getUnreadCount();
      setUnreadCount(data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  useEffect(() => {
    fetchLoads();
    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLoads();
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchLoads, fetchUnreadCount]);

  // Get status color and label
  const getStatusInfo = (status: LoadStatus) => {
    const statusMap: Record<string, { color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; label: string }> = {
      booked: { color: 'default', label: 'Booked' },
      rate_confirmed: { color: 'info', label: 'Rate Confirmed' },
      assigned: { color: 'info', label: 'Assigned' },
      trip_accepted: { color: 'primary', label: 'Trip Accepted' },
      trip_started: { color: 'primary', label: 'Trip Started' },
      shipper_check_in: { color: 'info', label: 'Shipper Check-in' },
      shipper_load_in: { color: 'info', label: 'Load In' },
      shipper_load_out: { color: 'info', label: 'Load Out' },
      in_transit: { color: 'primary', label: 'In Transit' },
      receiver_check_in: { color: 'secondary', label: 'Receiver Check-in' },
      receiver_offload: { color: 'secondary', label: 'Offloaded' },
      delivered: { color: 'success', label: 'Delivered' },
      completed: { color: 'success', label: 'Completed' },
      cancelled: { color: 'error', label: 'Cancelled' },
    };
    return statusMap[status] || { color: 'default', label: status };
  };

  // Handle SOS
  const handleSOS = async () => {
    if (!currentLoad || !sosMessage.trim()) return;
    
    try {
      // TODO: Call SOS endpoint when available
      // For now, using a generic API call
      await loadApi.sendSOS(currentLoad.id, {
        message: sosMessage,
        location: sosLocation,
        emergencyType: 'emergency',
      });
      setSosDialogOpen(false);
      setSosMessage('');
      setSosLocation('');
      fetchLoads();
    } catch (err: any) {
      setError(err.message || 'Failed to send SOS');
    }
  };

  // Get next action based on status
  const getNextAction = (load: Load) => {
    const status = load.status;
    const actions: Record<string, { label: string; action: () => void; color: 'primary' | 'success' | 'warning' | 'info' }> = {
      trip_accepted: { 
        label: load.driverFormDetails ? 'Start Trip' : 'Fill Trip Form', 
        action: () => load.driverFormDetails ? handleStartTrip(load) : handleDriverForm(load), 
        color: 'primary' 
      },
      in_transit: { label: 'Start Trip', action: () => handleStartTrip(load), color: 'primary' },
      trip_started: { label: 'Check-in Shipper', action: () => handleShipperCheckIn(load), color: 'info' },
      shipper_check_in: { label: 'Load In', action: () => handleLoadIn(load), color: 'info' },
      shipper_load_in: { label: 'Load Out', action: () => handleLoadOut(load), color: 'info' },
      shipper_load_out: { label: 'Check-in Receiver', action: () => handleReceiverCheckIn(load), color: 'secondary' },
      receiver_check_in: { label: 'Offload', action: () => handleOffload(load), color: 'secondary' },
      receiver_offload: { label: 'End Trip', action: () => handleEndTrip(load), color: 'success' },
    };
    return actions[status];
  };

  const handleDriverForm = async (load: Load) => {
    setDriverFormDialogOpen(true);
  };

  const handleStartTrip = async (load: Load) => {
    setStartTripDialogOpen(true);
  };

  const handleShipperCheckIn = async (load: Load) => {
    setShipperCheckInDialogOpen(true);
  };

  const handleLoadIn = async (load: Load) => {
    try {
      await loadApi.shipperLoadIn(load.id);
      fetchLoads();
    } catch (err: any) {
      setError(err.message || 'Failed to update load status');
    }
  };

  const handleLoadOut = async (load: Load) => {
    setLoadOutDialogOpen(true);
  };

  const handleReceiverCheckIn = async (load: Load) => {
    try {
      await loadApi.receiverCheckIn(load.id);
      fetchLoads();
    } catch (err: any) {
      setError(err.message || 'Failed to check in at receiver');
    }
  };

  const handleOffload = async (load: Load) => {
    setReceiverOffloadDialogOpen(true);
  };

  const handleEndTrip = async (load: Load) => {
    setEndTripDialogOpen(true);
  };

  if (loading && !currentLoad) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const statusInfo = currentLoad ? getStatusInfo(currentLoad.status) : null;
  const nextAction = currentLoad ? getNextAction(currentLoad) : null;

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      pb: { xs: '80px', sm: 0 }, // Space for bottom navigation on mobile
    }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar sx={{ minHeight: '56px !important', px: 2 }}>
            <IconButton edge="start" color="inherit" sx={{ mr: 1 }}>
              <AccountCircle />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1rem' }}>
              {user?.name || 'Driver'}
            </Typography>
            <IconButton color="inherit" onClick={() => fetchLoads()}>
              <Refresh />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 3 }, mt: { xs: '56px', sm: 0 } }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Current Load Card - Main Focus for Driver */}
        {currentLoad ? (
          <Card sx={{ mb: 3, borderRadius: { xs: 0, sm: 2 }, boxShadow: { xs: 0, sm: 2 } }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    {currentLoad.loadNumber}
                  </Typography>
                  <Chip
                    label={statusInfo?.label || currentLoad.status}
                    color={statusInfo?.color || 'default'}
                    size="small"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                  />
                </Box>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  ${currentLoad.rate?.toLocaleString() || '0'}
                </Typography>
              </Box>

              {/* Route Info */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <LocationOn color="primary" sx={{ mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        PICKUP
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {currentLoad.pickupLocation?.city || 'N/A'}, {currentLoad.pickupLocation?.state || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {currentLoad.pickupDate ? new Date(currentLoad.pickupDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <LocationOn color="success" sx={{ mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        DELIVERY
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {currentLoad.deliveryLocation?.city || 'N/A'}, {currentLoad.deliveryLocation?.state || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {currentLoad.expectedDeliveryDate ? new Date(currentLoad.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Distance and Details */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Distance
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {currentLoad.distance || 0} mi
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Weight
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {currentLoad.weight || 0} kg
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Cargo
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {currentLoad.cargoType || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Load Type
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {currentLoad.loadType || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Trip Progress Timeline */}
              {currentLoad.tripStartDetails && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    TRIP DETAILS
                  </Typography>
                  <Typography variant="body2">
                    Starting Mileage: {currentLoad.tripStartDetails.startingMileage?.toLocaleString() || 'N/A'}
                  </Typography>
                  {currentLoad.tripCompletionDetails && (
                    <Typography variant="body2">
                      Ending Mileage: {currentLoad.tripCompletionDetails.endingMileage?.toLocaleString() || 'N/A'}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Primary Action Button */}
              {nextAction && (
                <Button
                  fullWidth
                  variant="contained"
                  color={nextAction.color}
                  size="large"
                  onClick={nextAction.action}
                  sx={{
                    mb: 2,
                    py: 1.5,
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    fontWeight: 600,
                  }}
                >
                  {nextAction.label}
                </Button>
              )}

              {/* Quick Actions */}
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PhotoCamera />}
                    size="small"
                    sx={{ py: 1 }}
                  >
                    Photo
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AttachFile />}
                    size="small"
                    sx={{ py: 1 }}
                  >
                    Documents
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ mb: 3, textAlign: 'center', py: 6 }}>
            <CardContent>
              <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Active Load
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You don't have any assigned loads at the moment.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Recent Loads - Compact List for Mobile */}
        {loads.length > 1 && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Recent Loads
              </Typography>
              <List sx={{ p: 0 }}>
                {loads.slice(0, 5).map((load, idx) => {
                  const statusInfo = getStatusInfo(load.status);
                  return (
                    <React.Fragment key={load.id}>
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemIcon>
                          <LocalShipping color={statusInfo?.color} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={500}>
                              {load.loadNumber}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Chip
                                label={statusInfo?.label}
                                color={statusInfo?.color}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', mr: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary" component="span">
                                ${load.rate?.toLocaleString() || '0'}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {idx < loads.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Earnings Summary - Mobile Optimized */}
        <Grid container spacing={2} sx={{ mb: { xs: 0, sm: 3 } }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Money color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight={700}>
                  ${currentLoad?.rate?.toLocaleString() || '0'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current Load
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Route color="success" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight={700}>
                  {currentLoad?.distance || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Miles
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <CheckCircle color="info" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight={700}>
                  {loads.filter((l) => l.status === 'completed').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <AccessTime color="warning" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight={700}>
                  {loads.filter((l) => !['completed', 'cancelled'].includes(l.status)).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* SOS Floating Action Button - Mobile Only */}
      {isMobile && (
        <Fab
          color="error"
          aria-label="SOS"
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 24 },
            right: 16,
            zIndex: 1000,
          }}
          onClick={() => setSosDialogOpen(true)}
        >
          <Warning />
        </Fab>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
          }}
          elevation={3}
        >
          <BottomNavigation
            value={bottomNav}
            onChange={(_, newValue) => setBottomNav(newValue)}
            showLabels
          >
            <BottomNavigationAction label="Home" icon={<DirectionsCar />} />
            <BottomNavigationAction
              label="Messages"
              icon={
                <Badge badgeContent={unreadCount} color="error">
                  <Message />
                </Badge>
              }
              onClick={() => setMessageDialogOpen(true)}
            />
            <BottomNavigationAction label="Loads" icon={<Assignment />} />
            <BottomNavigationAction label="Profile" icon={<AccountCircle />} />
          </BottomNavigation>
        </Paper>
      )}

      {/* SOS Dialog */}
      <Dialog
        open={sosDialogOpen}
        onClose={() => setSosDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            <Typography variant="h6">Emergency SOS Alert</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This will notify the owner and dispatcher immediately!
          </Alert>
          <TextField
            fullWidth
            label="Emergency Message"
            multiline
            rows={3}
            value={sosMessage}
            onChange={(e) => setSosMessage(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Describe your emergency situation..."
          />
          <TextField
            fullWidth
            label="Current Location (Optional)"
            value={sosLocation}
            onChange={(e) => setSosLocation(e.target.value)}
            placeholder="Enter your current location"
          />
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
          <Button onClick={() => setSosDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSOS}
            disabled={!sosMessage.trim()}
          >
            Send SOS
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Dialog - Placeholder */}
      <Dialog
        open={messageDialogOpen}
        onClose={() => setMessageDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle>Messages</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            Messaging feature coming soon...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Trip Workflow Dialogs */}
      {currentLoad && (
        <>
          <DriverFormDialog
            open={driverFormDialogOpen}
            onClose={() => setDriverFormDialogOpen(false)}
            load={currentLoad}
            onSuccess={() => {
              fetchLoads();
              setDriverFormDialogOpen(false);
            }}
          />

          <StartTripDialog
            open={startTripDialogOpen}
            onClose={() => setStartTripDialogOpen(false)}
            load={currentLoad}
            onSuccess={() => {
              fetchLoads();
              setStartTripDialogOpen(false);
            }}
          />

          <ShipperCheckInDialog
            open={shipperCheckInDialogOpen}
            onClose={() => setShipperCheckInDialogOpen(false)}
            load={currentLoad}
            onSuccess={() => {
              fetchLoads();
              setShipperCheckInDialogOpen(false);
            }}
          />

          <LoadOutDialog
            open={loadOutDialogOpen}
            onClose={() => setLoadOutDialogOpen(false)}
            load={currentLoad}
            onSuccess={() => {
              fetchLoads();
              setLoadOutDialogOpen(false);
            }}
          />

          <ReceiverOffloadDialog
            open={receiverOffloadDialogOpen}
            onClose={() => setReceiverOffloadDialogOpen(false)}
            load={currentLoad}
            onSuccess={() => {
              fetchLoads();
              setReceiverOffloadDialogOpen(false);
            }}
          />

          <EndTripDialog
            open={endTripDialogOpen}
            onClose={() => setEndTripDialogOpen(false)}
            load={currentLoad}
            onSuccess={() => {
              fetchLoads();
              setEndTripDialogOpen(false);
            }}
          />
        </>
      )}
    </Box>
  );
};

export default DriverDashboard;
