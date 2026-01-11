import React, { useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import {
  LocalShipping,
  People,
  Assignment,
  CheckCircle,
} from '@mui/icons-material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useAuth } from '@hooks/useAuth';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon, color }) => {
  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: 2,
              bgcolor: `${color}.lighter`,
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

const DashboardComponent: React.FC = React.memo(() => {
  const { user } = useAuth();

  const stats = useMemo(
    () => [
      { title: 'Active Loads', value: 12, icon: <Assignment sx={{ fontSize: 32 }} />, color: 'primary' },
      { title: 'Total Drivers', value: 8, icon: <People sx={{ fontSize: 32 }} />, color: 'success' },
      { title: 'Total Trucks', value: 10, icon: <LocalShipping sx={{ fontSize: 32 }} />, color: 'info' },
      { title: 'Completed Today', value: 5, icon: <CheckCircle sx={{ fontSize: 32 }} />, color: 'warning' },
    ],
    []
  );

  return (
    <DashboardLayout>
      <Box>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Here's what's happening with your fleet today
        </Typography>

        <Grid container spacing={3}>
          {stats.map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.title}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dashboard functionality coming soon...
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </DashboardLayout>
  );
});

DashboardComponent.displayName = 'Dashboard';

export default DashboardComponent;