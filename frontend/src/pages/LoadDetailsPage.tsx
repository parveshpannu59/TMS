import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone,
  Email,
  LocationOn,
  LocalShipping,
  Assignment,
} from '@mui/icons-material';
import { loadApi } from '@api/all.api';
import type { Load } from '../types/all.types';
import { LoadStatus } from '../types/all.types';
import { format } from 'date-fns';
import LoadMapView from '@components/loads/LoadMapView';
import EditLoadDialog from '@components/dialogs/EditLoadDialog';
import { useAuth } from '@hooks/useAuth';
import { useTranslation } from 'react-i18next';

const LoadDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLoad();
    }
  }, [id]);

  const fetchLoad = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadData = await loadApi.getLoadById(id!);
      setLoad(loadData);
    } catch (err: any) {
      setError(err.response?.data?.message || t('loads.failedToFetchDetails', { defaultValue: 'Failed to fetch load details' }));
      console.error('Error fetching load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!load || !window.confirm(t('loads.confirmDelete', { loadNumber: load.loadNumber, defaultValue: `Are you sure you want to delete load ${load.loadNumber}?` }))) {
      return;
    }
    try {
      await loadApi.deleteLoad(load.id);
      navigate('/loads');
    } catch (err: any) {
      setError(err.response?.data?.message || t('loads.failedToDelete', { defaultValue: 'Failed to delete load' }));
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
    return status.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !load) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/loads')}>
          {t('loads.backToLoads', { defaultValue: 'Back to Loads' })}
        </Button>
      </Box>
    );
  }

  if (!load) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">{t('loads.loadNotFound', { defaultValue: 'Load not found' })}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/loads')} sx={{ mt: 2 }}>
          {t('loads.backToLoads', { defaultValue: 'Back to Loads' })}
        </Button>
      </Box>
    );
  }

  const canEdit = user?.role === 'owner' || user?.role === 'dispatcher';

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            startIcon={<ArrowBack />} 
            onClick={() => navigate('/loads')}
            size={isMobile ? 'small' : 'medium'}
          >
            {t('common.back', { defaultValue: 'Back' })}
          </Button>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            {t('loads.load')} {load.loadNumber}
          </Typography>
          <Chip
            label={getStatusLabel(load.status)}
            color={getStatusColor(load.status)}
            size="small"
          />
        </Box>
        {canEdit && (
          <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditDialogOpen(true)}
              fullWidth={isMobile}
              size={isMobile ? 'small' : 'medium'}
            >
              {t('common.edit')}
            </Button>
            {user?.role === 'owner' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                fullWidth={isMobile}
                size={isMobile ? 'small' : 'medium'}
              >
                {t('common.delete')}
              </Button>
            )}
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column - Details */}
        <Grid item xs={12} lg={6}>
          {/* Customer Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('loads.customerInformation')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography>
                  <strong>{t('common.name')}:</strong> {load.customerName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone fontSize="small" color="action" />
                  <Typography>{load.customerContact}</Typography>
                </Box>
                {load.customerEmail && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" color="action" />
                    <Typography>{load.customerEmail}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('loads.locations', { defaultValue: 'Locations' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('loads.pickupLocation')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                      <LocationOn fontSize="small" color="primary" />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {load.pickupLocation.city}, {load.pickupLocation.state}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {load.pickupLocation.address}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('loads.pincode')}: {load.pickupLocation.pincode}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('loads.deliveryLocation')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                      <LocationOn fontSize="small" color="error" />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {load.deliveryLocation.city}, {load.deliveryLocation.state}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {load.deliveryLocation.address}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('loads.pincode')}: {load.deliveryLocation.pincode}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('loads.assignment', { defaultValue: 'Assignment' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocalShipping fontSize="small" color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('loads.driver')}
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {load.driver?.name || t('loads.unassigned')}
                  </Typography>
                  {load.driver?.phone && (
                    <Typography variant="caption" color="text.secondary">
                      {load.driver.phone}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Assignment fontSize="small" color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('loads.truck')}
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {load.truck?.truckNumber || t('loads.unassigned')}
                  </Typography>
                  {load.truck && (
                    <Typography variant="caption" color="text.secondary">
                      {load.truck.make} {load.truck.model}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Cargo & Financial Information */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('loads.cargoFinancialDetails', { defaultValue: 'Cargo & Financial Details' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('loads.cargoType')}
                  </Typography>
                  <Typography variant="body2">{load.cargoType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('loads.weight')}
                  </Typography>
                  <Typography variant="body2">{load.weight} kg</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('loads.distance', { defaultValue: 'Distance' })}
                  </Typography>
                  <Typography variant="body2">{load.distance} km</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('loads.loadType')}
                  </Typography>
                  <Typography variant="body2">{load.loadType}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('loads.rate')}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    ₹{load.rate.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('loads.advancePaid', { defaultValue: 'Advance Paid' })}
                  </Typography>
                  <Typography variant="body1">₹{load.advancePaid.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('loads.balanceDue')}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="error">
                    ₹{load.balance.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('loads.fuelAdvance', { defaultValue: 'Fuel Advance' })}
                  </Typography>
                  <Typography variant="body1">₹{load.fuelAdvance.toLocaleString()}</Typography>
                </Grid>
              </Grid>
              {load.specialInstructions && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('loads.specialInstructions', { defaultValue: 'Special Instructions' })}
                  </Typography>
                  <Typography variant="body2">{load.specialInstructions}</Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Map & Dates */}
        <Grid item xs={12} lg={6}>
          {/* GPS Map View */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('loads.locationTracking', { defaultValue: 'Location Tracking' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <LoadMapView load={load} />
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('loads.schedule', { defaultValue: 'Schedule' })}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('loads.pickupDate')}
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(load.pickupDate), 'dd MMM yyyy, hh:mm a')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('loads.expectedDelivery', { defaultValue: 'Expected Delivery' })}
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(load.expectedDeliveryDate), 'dd MMM yyyy, hh:mm a')}
                  </Typography>
                </Box>
                {load.actualDeliveryDate && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('loads.actualDelivery', { defaultValue: 'Actual Delivery' })}
                    </Typography>
                    <Typography variant="body1" color="success.main">
                      {format(new Date(load.actualDeliveryDate), 'dd MMM yyyy, hh:mm a')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <EditLoadDialog
        open={editDialogOpen}
        load={load}
        onClose={() => setEditDialogOpen(false)}
        onSuccess={() => {
          fetchLoad();
          setEditDialogOpen(false);
        }}
      />
    </Box>
  );
};

export default LoadDetailsPage;
