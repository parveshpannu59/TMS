import React, { useMemo, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Avatar,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LocalShipping,
  People,
  Assignment,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Schedule,
} from '@mui/icons-material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useAuth } from '@hooks/useAuth';
import { dashboardApi } from '@/api/dashboardApi';
import { DashboardData } from '@/types/dashboard.types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon, color, trend, subtitle }) => {
  const theme = useTheme();
  const colorMap: Record<string, string> = {
    primary: theme.palette.primary.main,
    success: theme.palette.success.main,
    info: theme.palette.info.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  };

  const bgColor = colorMap[color] || theme.palette.primary.main;

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${bgColor} 0%, ${alpha(bgColor, 0.5)} 100%)`,
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.8125rem', fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.2 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: alpha(bgColor, 0.1),
              color: bgColor,
            }}
          >
            {icon}
          </Avatar>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
            {trend >= 0 ? (
              <TrendingUp sx={{ fontSize: 14, color: theme.palette.success.main }} />
            ) : (
              <TrendingDown sx={{ fontSize: 14, color: theme.palette.error.main }} />
            )}
            <Typography 
              variant="caption" 
              sx={{ 
                color: trend >= 0 ? theme.palette.success.main : theme.palette.error.main, 
                fontWeight: 600 
              }}
            >
              {trend > 0 ? '+' : ''}{trend}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              vs last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

const DashboardComponent: React.FC = React.memo(() => {
  const { user } = useAuth();
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await dashboardApi.getOwnerDashboard();
        setDashboardData(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        // Set fallback data if API fails
        setDashboardData({
          currentDateTime: new Date().toISOString(),
          kpis: {
            activeLoadsCount: 0,
            runningLateCount: 0,
            totalDrivers: 0,
            availableDrivers: 0,
            totalTrucks: 0,
            operationalTrucks: 0,
            completedToday: 0,
            onTrack: 0,
            trends: { loads: 0, drivers: 0, trucks: 0 },
          },
          loadStatus: { pending: 0, inTransit: 0, delayed: 0 },
          recentActivity: [],
          criticalTrips: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    if (!dashboardData) return [];
    const { kpis } = dashboardData;
    return [
      { 
        title: 'Active Loads', 
        value: kpis.activeLoadsCount, 
        icon: <Assignment sx={{ fontSize: 24 }} />, 
        color: 'primary',
        trend: kpis.trends.loads,
        subtitle: `${kpis.runningLateCount} running late`
      },
      { 
        title: 'Total Drivers', 
        value: kpis.totalDrivers, 
        icon: <People sx={{ fontSize: 24 }} />, 
        color: 'success',
        trend: kpis.trends.drivers,
        subtitle: `${kpis.availableDrivers} available`
      },
      { 
        title: 'Total Trucks', 
        value: kpis.totalTrucks, 
        icon: <LocalShipping sx={{ fontSize: 24 }} />, 
        color: 'info',
        trend: kpis.trends.trucks,
        subtitle: `${kpis.operationalTrucks} operational`
      },
      { 
        title: 'Completed Today', 
        value: kpis.completedToday, 
        icon: <CheckCircle sx={{ fontSize: 24 }} />, 
        color: 'warning',
        subtitle: `On track for ${kpis.onTrack}`
      },
    ];
  }, [dashboardData]);

  const quickActions = useMemo(() => {
    if (!dashboardData) return [];
    const { loadStatus } = dashboardData;
    const total = loadStatus.pending + loadStatus.inTransit + loadStatus.delayed || 1;
    return [
      { label: 'Pending Loads', value: loadStatus.pending, color: theme.palette.warning.main, percent: (loadStatus.pending / total) * 100 },
      { label: 'In Transit', value: loadStatus.inTransit, color: theme.palette.info.main, percent: (loadStatus.inTransit / total) * 100 },
      { label: 'Delayed', value: loadStatus.delayed, color: theme.palette.error.main, percent: (loadStatus.delayed / total) * 100 },
    ];
  }, [dashboardData, theme]);

  const recentActivities = useMemo(() => {
    if (!dashboardData?.recentActivity?.length) {
      return [
        { text: 'No recent activity', time: '', status: 'info' },
      ];
    }
    return dashboardData.recentActivity.slice(0, 4).map(activity => ({
      text: activity.message,
      time: new Date(activity.timestamp).toLocaleString(),
      status: activity.type,
    }));
  }, [dashboardData]);

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
          <CircularProgress size={48} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: '100%', height: 'calc(100vh - 120px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header - Compact */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Here's your fleet overview for today
          </Typography>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error} - Showing cached data
          </Alert>
        )}

        {/* Stats Grid - Compact */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {stats.map((stat) => (
            <Grid item xs={12} sm={6} lg={3} key={stat.title}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Bottom Section - Compact Grid */}
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Schedule sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                  <Typography variant="h6" fontWeight={600}>
                    Load Status
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {quickActions.map((action) => (
                    <Box key={action.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {action.label}
                        </Typography>
                        <Chip
                          label={action.value}
                          size="small"
                          sx={{
                            bgcolor: alpha(action.color, 0.1),
                            color: action.color,
                            fontWeight: 600,
                            height: 24,
                          }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={action.percent}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(action.color, 0.1),
                          '& .MuiLinearProgress-bar': {
                            bgcolor: action.color,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUp sx={{ fontSize: 20, color: theme.palette.success.main }} />
                  <Typography variant="h6" fontWeight={600}>
                    Recent Activity
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {recentActivities.map((activity, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: activity.status === 'success' ? theme.palette.success.main 
                            : activity.status === 'error' ? theme.palette.error.main
                            : activity.status === 'warning' ? theme.palette.warning.main
                            : theme.palette.info.main,
                          mt: 0.75,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} sx={{ mb: 0.25 }}>
                          {activity.text}
                        </Typography>
                        {activity.time && (
                          <Typography variant="caption" color="text.secondary">
                            {activity.time}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
});

DashboardComponent.displayName = 'Dashboard';

export default DashboardComponent;
