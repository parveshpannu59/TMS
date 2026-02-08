import { memo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { CriticalTrip } from '../../types/dashboard.types';
import { useNavigate } from 'react-router-dom';

interface CriticalTripsProps {
  trips: CriticalTrip[];
}

export const CriticalTrips = memo(({ trips }: CriticalTripsProps) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const getConfig = (severity: CriticalTrip['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          color: '#ef4444',
          bg: alpha('#ef4444', 0.08),
          border: alpha('#ef4444', 0.2),
          icon: <ErrorOutlineIcon sx={{ fontSize: 20 }} />,
          label: 'CRITICAL',
        };
      case 'warning':
        return {
          color: '#f59e0b',
          bg: alpha('#f59e0b', 0.08),
          border: alpha('#f59e0b', 0.2),
          icon: <WarningAmberIcon sx={{ fontSize: 20 }} />,
          label: 'WARNING',
        };
      default:
        return {
          color: '#3b82f6',
          bg: alpha('#3b82f6', 0.08),
          border: alpha('#3b82f6', 0.2),
          icon: <AccessTimeIcon sx={{ fontSize: 20 }} />,
          label: 'INFO',
        };
    }
  };

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 3,
        height: '100%',
        background: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.6)
          : '#fff',
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              borderRadius: 2,
              p: 0.8,
              display: 'flex',
              color: 'white',
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Critical Trips
          </Typography>
          {trips.length > 0 && (
            <Chip
              label={trips.length}
              size="small"
              sx={{
                bgcolor: alpha('#ef4444', 0.1),
                color: '#ef4444',
                fontWeight: 700,
                height: 22,
                fontSize: '0.7rem',
              }}
            />
          )}
        </Box>
        <Button
          size="small"
          onClick={() => navigate('/loads')}
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.78rem',
            color: '#3b82f6',
          }}
        >
          View All
        </Button>
      </Box>

      {trips.length === 0 ? (
        <Box
          sx={{
            py: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: alpha('#22c55e', 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#22c55e' }} />
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            All trips on schedule
          </Typography>
          <Typography variant="caption" color="text.disabled">
            No delayed or critical trips at the moment
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {trips.map((trip) => {
            const config = getConfig(trip.severity);
            return (
              <Box
                key={trip.id}
                onClick={() => navigate(`/loads/${trip.tripId}`)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: config.bg,
                  border: `1px solid ${config.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateX(6px)',
                    boxShadow: `0 4px 14px ${alpha(config.color, 0.2)}`,
                  },
                }}
              >
                {/* Severity indicator */}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: alpha(config.color, 0.15),
                    color: config.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {config.icon}
                </Box>

                {/* Trip info */}
                <Box flex={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.3}>
                    <Typography variant="body2" fontWeight={700} sx={{ color: config.color }}>
                      {trip.tripId}
                    </Typography>
                    <Chip
                      label={config.label}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        bgcolor: alpha(config.color, 0.15),
                        color: config.color,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {trip.route}
                  </Typography>
                </Box>

                {/* Meta */}
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1.5, flexShrink: 0 }}>
                  {trip.driverName && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {trip.driverName}
                      </Typography>
                    </Box>
                  )}
                  {trip.truckNumber && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <LocalShippingIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {trip.truckNumber}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Time */}
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ flexShrink: 0, fontSize: '0.68rem' }}
                >
                  {trip.timestamp}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
});

CriticalTrips.displayName = 'CriticalTrips';
