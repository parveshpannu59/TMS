import { memo } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Alert, 
  AlertTitle, 
  Button,
  Chip 
} from '@mui/material';
import { CriticalTrip } from '../../types/dashboard.types';
import { useNavigate } from 'react-router-dom';

interface CriticalTripsProps {
  trips: CriticalTrip[];
}

export const CriticalTrips = memo(({ trips }: CriticalTripsProps) => {
  const navigate = useNavigate();

  const getSeverity = (severity: CriticalTrip['severity']) => {
    const severityMap = {
      critical: 'error',
      warning: 'warning',
      info: 'info',
    } as const;
    return severityMap[severity];
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            Critical Trips
          </Typography>
          <Button 
            size="small" 
            onClick={() => navigate('/loads')}
            sx={{ textTransform: 'none' }}
          >
            View All
          </Button>
        </Box>
        
        <Box display="flex" flexDirection="column" gap={2}>
          {trips.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No critical trips at the moment
            </Typography>
          ) : (
            trips.map((trip) => (
              <Alert 
                key={trip.id} 
                severity={getSeverity(trip.severity)}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateX(4px)',
                  }
                }}
                onClick={() => navigate(`/loads/${trip.tripId}`)}
              >
                <AlertTitle sx={{ fontWeight: 600 }}>
                  {trip.message}
                </AlertTitle>
                <Typography variant="body2" mb={1}>
                  <strong>{trip.tripId}</strong> • {trip.route}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {trip.driverName && (
                    <Chip 
                      label={`Driver: ${trip.driverName}`} 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  {trip.truckNumber && (
                    <Chip 
                      label={`Truck: ${trip.truckNumber}`} 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  <Chip 
                    label={trip.timestamp} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
              </Alert>
            ))
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

CriticalTrips.displayName = 'CriticalTrips';