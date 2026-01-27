// import React, { useMemo } from 'react';
// import {
//   Box,
//   Typography,
//   Grid,
//   Card,
//   CardContent,
//   LinearProgress,
//   Chip,
//   Avatar,
//   useTheme,
//   alpha,
// } from '@mui/material';
// import {
//   LocalShipping,
//   People,
//   Assignment,
//   CheckCircle,
//   TrendingUp,
//   Schedule,
//   Warning,
// } from '@mui/icons-material';
// import { DashboardLayout } from '@layouts/DashboardLayout';
// import { useAuth } from '@hooks/useAuth';

// interface StatCardProps {
//   title: string;
//   value: string | number;
//   icon: React.ReactNode;
//   color: string;
//   trend?: number;
//   subtitle?: string;
// }

// const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon, color, trend, subtitle }) => {
//   const theme = useTheme();
//   const colorMap: Record<string, string> = {
//     primary: theme.palette.primary.main,
//     success: theme.palette.success.main,
//     info: theme.palette.info.main,
//     warning: theme.palette.warning.main,
//     error: theme.palette.error.main,
//   };

//   const bgColor = colorMap[color] || theme.palette.primary.main;

//   return (
//     <Card
//       sx={{
//         height: '100%',
//         position: 'relative',
//         overflow: 'hidden',
//         transition: 'all 0.3s ease',
//         '&:hover': {
//           transform: 'translateY(-4px)',
//           boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
//         },
//         '&::before': {
//           content: '""',
//           position: 'absolute',
//           top: 0,
//           left: 0,
//           right: 0,
//           height: '4px',
//           background: `linear-gradient(90deg, ${bgColor} 0%, ${alpha(bgColor, 0.5)} 100%)`,
//         },
//       }}
//     >
//       <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
//         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
//           <Box sx={{ flex: 1 }}>
//             <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.8125rem', fontWeight: 500 }}>
//               {title}
//             </Typography>
//             <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.2 }}>
//               {value}
//             </Typography>
//             {subtitle && (
//               <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
//                 {subtitle}
//               </Typography>
//             )}
//           </Box>
//           <Avatar
//             sx={{
//               width: 48,
//               height: 48,
//               bgcolor: alpha(bgColor, 0.1),
//               color: bgColor,
//             }}
//           >
//             {icon}
//           </Avatar>
//         </Box>
//         {trend !== undefined && (
//           <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
//             <TrendingUp sx={{ fontSize: 14, color: theme.palette.success.main }} />
//             <Typography variant="caption" sx={{ color: theme.palette.success.main, fontWeight: 600 }}>
//               {trend > 0 ? '+' : ''}{trend}%
//             </Typography>
//             <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
//               vs last month
//             </Typography>
//           </Box>
//         )}
//       </CardContent>
//     </Card>
//   );
// });

// StatCard.displayName = 'StatCard';

// const DashboardComponent: React.FC = React.memo(() => {
//   const { user } = useAuth();
//   const theme = useTheme();

//   const stats = useMemo(
//     () => [
//       { 
//         title: 'Active Loads', 
//         value: 12, 
//         icon: <Assignment sx={{ fontSize: 24 }} />, 
//         color: 'primary',
//         trend: 12,
//         subtitle: '8 in transit'
//       },
//       { 
//         title: 'Total Drivers', 
//         value: 8, 
//         icon: <People sx={{ fontSize: 24 }} />, 
//         color: 'success',
//         trend: 5,
//         subtitle: '6 available'
//       },
//       { 
//         title: 'Total Trucks', 
//         value: 10, 
//         icon: <LocalShipping sx={{ fontSize: 24 }} />, 
//         color: 'info',
//         trend: 8,
//         subtitle: '9 operational'
//       },
//       { 
//         title: 'Completed Today', 
//         value: 5, 
//         icon: <CheckCircle sx={{ fontSize: 24 }} />, 
//         color: 'warning',
//         subtitle: 'On track for 12'
//       },
//     ],
//     []
//   );

//   const quickActions = useMemo(
//     () => [
//       { label: 'Pending Loads', value: 3, color: theme.palette.warning.main },
//       { label: 'In Transit', value: 8, color: theme.palette.info.main },
//       { label: 'Delayed', value: 1, color: theme.palette.error.main },
//     ],
//     [theme]
//   );

//   return (
//     <DashboardLayout>
//       <Box sx={{ maxWidth: '100%', height: 'calc(100vh - 120px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
//         {/* Header - Compact */}
//         <Box sx={{ mb: 3 }}>
//           <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
//             Welcome back, {user?.name?.split(' ')[0]}! 👋
//           </Typography>
//           <Typography variant="body2" color="text.secondary">
//             Here's your fleet overview for today
//           </Typography>
//         </Box>

//         {/* Stats Grid - Compact */}
//         <Grid container spacing={2} sx={{ mb: 3 }}>
//           {stats.map((stat) => (
//             <Grid item xs={12} sm={6} lg={3} key={stat.title}>
//               <StatCard {...stat} />
//             </Grid>
//           ))}
//         </Grid>

//         {/* Bottom Section - Compact Grid */}
//         <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
//           {/* Quick Actions */}
//           <Grid item xs={12} md={4}>
//             <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
//               <CardContent sx={{ flex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                   <Schedule sx={{ fontSize: 20, color: theme.palette.primary.main }} />
//                   <Typography variant="h6" fontWeight={600}>
//                     Load Status
//                   </Typography>
//                 </Box>
//                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//                   {quickActions.map((action) => (
//                     <Box key={action.label}>
//                       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
//                         <Typography variant="body2" fontWeight={500}>
//                           {action.label}
//                         </Typography>
//                         <Chip
//                           label={action.value}
//                           size="small"
//                           sx={{
//                             bgcolor: alpha(action.color, 0.1),
//                             color: action.color,
//                             fontWeight: 600,
//                             height: 24,
//                           }}
//                         />
//                       </Box>
//                       <LinearProgress
//                         variant="determinate"
//                         value={(action.value / 12) * 100}
//                         sx={{
//                           height: 6,
//                           borderRadius: 3,
//                           bgcolor: alpha(action.color, 0.1),
//                           '& .MuiLinearProgress-bar': {
//                             bgcolor: action.color,
//                             borderRadius: 3,
//                           },
//                         }}
//                       />
//                     </Box>
//                   ))}
//                 </Box>
//               </CardContent>
//             </Card>
//           </Grid>

//           {/* Recent Activity */}
//           <Grid item xs={12} md={8}>
//             <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
//               <CardContent sx={{ flex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                   <TrendingUp sx={{ fontSize: 20, color: theme.palette.success.main }} />
//                   <Typography variant="h6" fontWeight={600}>
//                     Recent Activity
//                   </Typography>
//                 </Box>
//                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
//                   {[
//                     { text: 'Load #1234 delivered successfully', time: '2 hours ago', status: 'success' },
//                     { text: 'Driver John checked in at warehouse', time: '4 hours ago', status: 'info' },
//                     { text: 'New load assigned to Truck #05', time: '6 hours ago', status: 'primary' },
//                     { text: 'Maintenance scheduled for Truck #08', time: '1 day ago', status: 'warning' },
//                   ].map((activity, index) => (
//                     <Box
//                       key={index}
//                       sx={{
//                         display: 'flex',
//                         alignItems: 'flex-start',
//                         gap: 1.5,
//                         p: 1.5,
//                         borderRadius: 2,
//                         bgcolor: alpha(theme.palette.primary.main, 0.02),
//                         transition: 'all 0.2s ease',
//                         '&:hover': {
//                           bgcolor: alpha(theme.palette.primary.main, 0.05),
//                         },
//                       }}
//                     >
//                       <Box
//                         sx={{
//                           width: 8,
//                           height: 8,
//                           borderRadius: '50%',
//                           bgcolor: theme.palette[activity.status as keyof typeof theme.palette]?.main || theme.palette.primary.main,
//                           mt: 0.75,
//                           flexShrink: 0,
//                         }}
//                       />
//                       <Box sx={{ flex: 1, minWidth: 0 }}>
//                         <Typography variant="body2" fontWeight={500} sx={{ mb: 0.25 }}>
//                           {activity.text}
//                         </Typography>
//                         <Typography variant="caption" color="text.secondary">
//                           {activity.time}
//                         </Typography>
//                       </Box>
//                     </Box>
//                   ))}
//                 </Box>
//               </CardContent>
//             </Card>
//           </Grid>
//         </Grid>
//       </Box>
//     </DashboardLayout>
//   );
// });

// DashboardComponent.displayName = 'Dashboard';

// export default DashboardComponent;
import { Suspense, useMemo, useCallback, useState } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Select, 
  MenuItem, 
  Button,
  IconButton,
  Toolbar,
  Alert,
  Skeleton,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RouteIcon from '@mui/icons-material/Route';
import DescriptionIcon from '@mui/icons-material/Description';
import PendingActionsIcon from '@mui/icons-material/PendingActions';

import { useDashboard } from '../hooks/useDashboard';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { KPICard } from '../components/dashboard/KPICard';
import { LoadStatusChart } from '../components/dashboard/LoadStatusChart';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { CriticalTrips } from '../components/dashboard/CriticalTrips';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [dateRange, setDateRange] = useState('today');
  const { data, loading, error, refetch } = useDashboard(dateRange);
  const { resetLayout, loading: layoutLoading } = useDashboardLayout();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRefresh = useCallback(() => {
    refetch();
    setSuccessMessage('Dashboard refreshed!');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [refetch]);

  const handleResetLayout = useCallback(async () => {
    await resetLayout();
    setSuccessMessage('Dashboard layout reset to default!');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [resetLayout]);

  const kpiWidgets = useMemo(() => {
    if (!data) return [];
    
    return [
      {
        id: 'kpi-loads',
        title: 'Active Loads',
        value: data.kpis.activeLoadsCount,
        subtitle: `${data.kpis.runningLateCount} running late`,
        trend: data.kpis.trends.loads,
        icon: <LocalShippingIcon />,
        color: 'primary.main'
      },
      {
        id: 'kpi-drivers',
        title: 'Total Drivers',
        value: data.kpis.totalDrivers,
        subtitle: `${data.kpis.availableDrivers} available`,
        trend: data.kpis.trends.drivers,
        icon: <PeopleIcon />,
        color: 'success.main'
      },
      {
        id: 'kpi-trucks',
        title: 'Total Trucks',
        value: data.kpis.totalTrucks,
        subtitle: `${data.kpis.operationalTrucks} operational`,
        trend: data.kpis.trends.trucks,
        icon: <LocalShippingIcon />,
        color: 'info.main'
      },
      {
        id: 'kpi-completed',
        title: 'Completed Today',
        value: data.kpis.completedToday,
        subtitle: `On track for ${data.kpis.onTrack}`,
        icon: <CheckCircleIcon />,
        color: 'warning.main'
      }
    ];
  }, [data]);

  // Financial metrics widgets
  const financialWidgets = useMemo(() => {
    if (!data?.financialMetrics) return [];
    
    const fm = data.financialMetrics;
    return [
      {
        id: 'revenue',
        title: t('dashboard.totalRevenue'),
        value: `$${fm.totalRevenue.toLocaleString()}`,
        subtitle: t('dashboard.completedLoads'),
        icon: <AttachMoneyIcon />,
        color: 'success.main',
        trend: undefined
      },
      {
        id: 'profit',
        title: t('dashboard.totalProfit'),
        value: `$${fm.totalProfit.toLocaleString()}`,
        subtitle: `${fm.profitMargin.toFixed(2)}% ${t('dashboard.margin')}`,
        icon: <AccountBalanceIcon />,
        color: fm.totalProfit >= 0 ? 'success.main' : 'error.main',
        trend: undefined
      },
      {
        id: 'distance',
        title: t('dashboard.distanceTraveled'),
        value: `${fm.totalDistanceMiles.toFixed(0)} mi`,
        subtitle: `${fm.totalDistanceKm.toFixed(2)} km`,
        icon: <RouteIcon />,
        color: 'info.main',
        trend: undefined
      }
    ];
  }, [data]);

  // Invoices widgets
  const invoiceWidgets = useMemo(() => {
    if (!data?.invoices) return [];
    
    const inv = data.invoices;
    return [
      {
        id: 'total-invoices',
        title: 'Total Invoices',
        value: inv.total,
        subtitle: `$${inv.totalAmount.toLocaleString()}`,
        icon: <ReceiptIcon />,
        color: 'primary.main'
      },
      {
        id: 'paid-invoices',
        title: 'Paid',
        value: inv.paid,
        subtitle: `$${inv.paidAmount.toLocaleString()}`,
        icon: <CheckCircleIcon />,
        color: 'success.main'
      },
      {
        id: 'unpaid-invoices',
        title: 'Unpaid',
        value: inv.unpaid,
        subtitle: `$${inv.unpaidAmount.toLocaleString()}`,
        icon: <PendingActionsIcon />,
        color: 'warning.main'
      },
      {
        id: 'overdue-invoices',
        title: 'Overdue',
        value: inv.overdue,
        subtitle: 'Requires attention',
        icon: <DescriptionIcon />,
        color: 'error.main'
      }
    ];
  }, [data]);

  // Operational metrics
  const operationalMetrics = data?.operationalMetrics;

  if (loading || layoutLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={{ xs: 2, sm: 3 }}>
        <Typography 
          variant={isMobile ? 'h5' : 'h4'} 
          gutterBottom 
          fontWeight={700}
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
        >
          {t('dashboard.welcomeBack', { name: user?.name })} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.fleetOverview', { 
            period: dateRange === 'today' ? t('dashboard.today') : 
                    dateRange === 'week' ? t('dashboard.thisWeek') : 
                    dateRange === 'month' ? t('dashboard.thisMonth') : 
                    t('dashboard.today')
          })}
        </Typography>
      </Box>

      {/* Toolbar */}
      <Toolbar sx={{ px: 0, mb: 2, minHeight: '48px !important' }}>
        <Select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="today">{t('dashboard.today')}</MenuItem>
          <MenuItem value="week">{t('dashboard.thisWeek')}</MenuItem>
          <MenuItem value="month">{t('dashboard.thisMonth')}</MenuItem>
        </Select>
        
        <Box flexGrow={1} />
        
        <IconButton 
          onClick={handleRefresh} 
          size="small" 
          sx={{ mr: 1 }}
          title="Refresh"
        >
          <RefreshIcon />
        </IconButton>
        <IconButton 
          onClick={handleResetLayout} 
          size="small"
          title="Reset Layout"
        >
          <SettingsIcon />
        </IconButton>
      </Toolbar>

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* KPI Cards - Operational */}
      <Grid container spacing={{ xs: 2, sm: 3 }} mb={3}>
        {kpiWidgets.map((widget) => (
          <Grid item xs={12} sm={6} md={3} key={widget.id}>
            <Suspense fallback={<Skeleton variant="rectangular" height={120} />}>
              <KPICard {...widget} />
            </Suspense>
          </Grid>
        ))}
      </Grid>

      {/* Financial Metrics */}
      {data?.financialMetrics && (
        <Grid container spacing={{ xs: 2, sm: 3 }} mb={3}>
          <Grid item xs={12}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t('dashboard.financialOverview')}
            </Typography>
          </Grid>
          {financialWidgets.map((widget) => (
            <Grid item xs={12} sm={6} md={4} key={widget.id}>
              <Suspense fallback={<Skeleton variant="rectangular" height={120} />}>
                <KPICard {...widget} />
              </Suspense>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Invoices Summary */}
      {data?.invoices && (
        <Grid container spacing={{ xs: 2, sm: 3 }} mb={3}>
          <Grid item xs={12}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t('dashboard.invoicesSummary')}
            </Typography>
          </Grid>
          {invoiceWidgets.map((widget) => (
            <Grid item xs={12} sm={6} md={3} key={widget.id}>
              <Suspense fallback={<Skeleton variant="rectangular" height={120} />}>
                <KPICard {...widget} />
              </Suspense>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Operational Metrics */}
      {operationalMetrics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Operational Metrics
            </Typography>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Total Loads
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {operationalMetrics.totalLoads}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Assigned Drivers
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {operationalMetrics.assignedDrivers}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Completed Loads
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {operationalMetrics.completedLoads}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Total Distance
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {operationalMetrics.totalDistanceMiles.toFixed(0)} mi
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {operationalMetrics.totalDistanceKm} km
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

        {/* Main Content Grid */}
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Load Status Chart */}
          <Grid item xs={12} md={6}>
            <Suspense fallback={<Skeleton variant="rectangular" height={250} />}>
              <LoadStatusChart data={data.loadStatus} />
            </Suspense>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Suspense fallback={<Skeleton variant="rectangular" height={250} />}>
              <RecentActivity activities={data.recentActivity} />
            </Suspense>
          </Grid>

          {/* Critical Trips */}
          <Grid item xs={12}>
            <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
              <CriticalTrips trips={data.criticalTrips} />
            </Suspense>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default Dashboard;