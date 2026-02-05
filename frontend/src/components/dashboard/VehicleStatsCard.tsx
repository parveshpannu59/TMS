import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { DirectionsCar, Close as CloseIcon, LocalShipping, RvHookup } from '@mui/icons-material';
import { vehicleApi, Vehicle, VehicleStats } from '@/api/vehicle.api';
import { getApiOrigin } from '@/api/client';
import { useTranslation } from 'react-i18next';

export const VehicleStatsCard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [assignedVehicles, setAssignedVehicles] = useState<Vehicle[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await vehicleApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch vehicle stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async () => {
    setDialogOpen(true);
    setDialogLoading(true);
    try {
      const [available, assigned] = await Promise.all([
        vehicleApi.getByStatus('available'),
        vehicleApi.getByStatus('assigned'),
      ]);
      setAvailableVehicles(available);
      setAssignedVehicles(assigned);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setDialogLoading(false);
    }
  };

  const VehicleRow: React.FC<{ vehicle: Vehicle; showStatus?: boolean }> = ({ vehicle, showStatus }) => (
    <TableRow>
      <TableCell>
        <Avatar
          src={vehicle.vehicleImage ? `${getApiOrigin()}${vehicle.vehicleImage}` : undefined}
          sx={{ width: 40, height: 40 }}
        >
          {vehicle.vehicleType === 'truck' ? <LocalShipping /> : <RvHookup />}
        </Avatar>
      </TableCell>
      <TableCell>
        <Chip
          label={vehicle.vehicleType === 'truck' ? 'Truck' : 'Trailer'}
          size="small"
          color={vehicle.vehicleType === 'truck' ? 'primary' : 'secondary'}
        />
      </TableCell>
      <TableCell>{vehicle.vehicleName}</TableCell>
      <TableCell>{vehicle.registrationNumber}</TableCell>
      {showStatus && (
        <TableCell>
          <Chip
            label={vehicle.status?.replace('_', ' ')}
            size="small"
            color={vehicle.status === 'on_road' ? 'warning' : 'info'}
          />
        </TableCell>
      )}
      {showStatus && (
        <TableCell align="center">
          {vehicle.currentLoadId ? 1 : 0}
        </TableCell>
      )}
    </TableRow>
  );

  if (loading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  return (
    <>
      <Card
        sx={{
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.3s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
        onClick={handleCardClick}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Vehicles
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {stats?.totalActive || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Active
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <DirectionsCar sx={{ fontSize: 32 }} />
            </Avatar>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Available
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {stats?.available || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Assigned
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {stats?.assigned || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Out for Delivery
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {stats?.outForDelivery || 0}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Vehicle Details
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label={`Available (${availableVehicles.length})`} />
            <Tab label={`Assigned (${assignedVehicles.length})`} />
          </Tabs>

          {dialogLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              {tabValue === 0 && (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Image</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Reg No</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {availableVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography color="text.secondary">No available vehicles</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      availableVehicles.map((vehicle) => (
                        <VehicleRow key={vehicle._id || vehicle.id} vehicle={vehicle} />
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {tabValue === 1 && (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Image</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Reg No</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Shipments</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignedVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary">No assigned vehicles</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedVehicles.map((vehicle) => (
                        <VehicleRow key={vehicle._id || vehicle.id} vehicle={vehicle} showStatus />
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
