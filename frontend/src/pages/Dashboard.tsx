import { Suspense, useMemo, useCallback, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Skeleton,
  alpha,
  useTheme,
  Chip,
  LinearProgress,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RouteIcon from '@mui/icons-material/Route';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DescriptionIcon from '@mui/icons-material/Description';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SpeedIcon from '@mui/icons-material/Speed';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';

import { useDashboard } from '../hooks/useDashboard';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { KPICard } from '../components/dashboard/KPICard';
import { VehicleStatsCard } from '../components/dashboard/VehicleStatsCard';
import { LoadStatusChart } from '../components/dashboard/LoadStatusChart';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { CriticalTrips } from '../components/dashboard/CriticalTrips';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useTranslation } from 'react-i18next';

// ─── Mini Donut Component ──────────────────────────
const MiniDonut = ({
  data,
  size = 100,
  innerRadius = 30,
  outerRadius = 45,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) => {
  const theme = useTheme();
  return (
    <Box sx={{ width: size, height: size, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerValue !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1, fontSize: '0.9rem' }}>
            {centerValue}
          </Typography>
          {centerLabel && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.55rem' }}>
              {centerLabel}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── Revenue/Expense Bar Comparison ──────────────────────────
const FinancialComparisonBar = ({
  revenue,
  expenses,
  profit,
  margin,
}: {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
}) => {
  const theme = useTheme();
  const maxVal = Math.max(revenue, expenses) || 1;

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 3,
        background: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.6)
          : '#fff',
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        height: '100%',
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: 2,
            p: 0.8,
            display: 'flex',
            color: 'white',
          }}
        >
          <TrendingUpIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>
          Financial Overview
        </Typography>
      </Box>

      {/* Revenue */}
      <Box mb={2.5}>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="body2" fontWeight={500} color="text.secondary">
            Revenue
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ color: '#22c55e' }}>
            ${revenue.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ height: 10, borderRadius: 5, bgcolor: alpha('#22c55e', 0.1), overflow: 'hidden' }}>
          <Box
            sx={{
              height: '100%',
              width: `${(revenue / maxVal) * 100}%`,
              borderRadius: 5,
              background: 'linear-gradient(90deg, #22c55e, #4ade80)',
              transition: 'width 1s ease',
            }}
          />
        </Box>
      </Box>

      {/* Expenses */}
      <Box mb={2.5}>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="body2" fontWeight={500} color="text.secondary">
            Expenses
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ color: '#ef4444' }}>
            ${expenses.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ height: 10, borderRadius: 5, bgcolor: alpha('#ef4444', 0.1), overflow: 'hidden' }}>
          <Box
            sx={{
              height: '100%',
              width: `${(expenses / maxVal) * 100}%`,
              borderRadius: 5,
              background: 'linear-gradient(90deg, #ef4444, #f87171)',
              transition: 'width 1s ease',
            }}
          />
        </Box>
      </Box>

      {/* Profit summary */}
      <Box
        sx={{
          borderRadius: 2,
          p: 2,
          bgcolor: profit >= 0 ? alpha('#22c55e', 0.06) : alpha('#ef4444', 0.06),
          border: `1px solid ${profit >= 0 ? alpha('#22c55e', 0.15) : alpha('#ef4444', 0.15)}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.65rem' }}>
            Net Profit
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ color: profit >= 0 ? '#22c55e' : '#ef4444' }}>
            ${Math.abs(profit).toLocaleString()}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: profit >= 0 ? alpha('#22c55e', 0.12) : alpha('#ef4444', 0.12),
            borderRadius: 1.5,
            px: 1.2,
            py: 0.4,
          }}
        >
          {profit >= 0 ? (
            <TrendingUpIcon sx={{ fontSize: 16, color: '#22c55e' }} />
          ) : (
            <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />
          )}
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: profit >= 0 ? '#22c55e' : '#ef4444', fontSize: '0.82rem' }}
          >
            {margin.toFixed(1)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ─── Invoice Donut Card ──────────────────────────
const InvoiceDonutCard = ({
  invoices,
}: {
  invoices: {
    total: number;
    paid: number;
    unpaid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  };
}) => {
  const theme = useTheme();
  const donutData = [
    { name: 'Paid', value: invoices.paid || 0, color: '#22c55e' },
    { name: 'Unpaid', value: invoices.unpaid || 0, color: '#f59e0b' },
    { name: 'Overdue', value: invoices.overdue || 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  // If all zero, show a placeholder
  if (donutData.length === 0) {
    donutData.push({ name: 'No Data', value: 1, color: alpha('#94a3b8', 0.2) });
  }

  const stats = [
    { label: 'Total', value: invoices.total, amount: invoices.totalAmount, color: '#3b82f6', icon: <ReceiptIcon sx={{ fontSize: 16 }} /> },
    { label: 'Paid', value: invoices.paid, amount: invoices.paidAmount, color: '#22c55e', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
    { label: 'Unpaid', value: invoices.unpaid, amount: invoices.unpaidAmount, color: '#f59e0b', icon: <PendingActionsIcon sx={{ fontSize: 16 }} /> },
    { label: 'Overdue', value: invoices.overdue, amount: 0, color: '#ef4444', icon: <DescriptionIcon sx={{ fontSize: 16 }} /> },
  ];

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
      <Box display="flex" alignItems="center" gap={1} mb={2.5}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
            borderRadius: 2,
            p: 0.8,
            display: 'flex',
            color: 'white',
          }}
        >
          <ReceiptIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>
          Invoices
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={3}>
        <MiniDonut
          data={donutData}
          size={110}
          innerRadius={35}
          outerRadius={50}
          centerValue={invoices.total}
          centerLabel="Total"
        />

        <Box flex={1}>
          {stats.map((s) => (
            <Box key={s.label} display="flex" alignItems="center" justifyContent="space-between" py={0.6}>
              <Box display="flex" alignItems="center" gap={0.8}>
                <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                  {s.label}
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>
                  {s.value}
                </Typography>
                {s.amount > 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                    ${s.amount.toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Operational Metrics with Mini Donuts ──────────────────────────
const OperationalMetricsCard = ({
  metrics,
}: {
  metrics: {
    totalLoads: number;
    assignedDrivers: number;
    completedLoads: number;
    totalDistanceMiles: number;
    totalDistanceKm: string;
  };
}) => {
  const theme = useTheme();
  const completionRate = metrics.totalLoads > 0
    ? Math.round((metrics.completedLoads / metrics.totalLoads) * 100)
    : 0;

  const items = [
    {
      label: 'Total Loads',
      value: metrics.totalLoads,
      icon: <LocalShippingIcon sx={{ fontSize: 22 }} />,
      color: '#3b82f6',
      donut: [
        { name: 'Completed', value: metrics.completedLoads, color: '#22c55e' },
        { name: 'Active', value: Math.max(metrics.totalLoads - metrics.completedLoads, 0), color: alpha('#3b82f6', 0.2) },
      ],
    },
    {
      label: 'Active Drivers',
      value: metrics.assignedDrivers,
      icon: <PeopleIcon sx={{ fontSize: 22 }} />,
      color: '#8b5cf6',
      donut: null,
    },
    {
      label: 'Completed',
      value: metrics.completedLoads,
      subtitle: `${completionRate}% rate`,
      icon: <CheckCircleIcon sx={{ fontSize: 22 }} />,
      color: '#22c55e',
      donut: null,
    },
    {
      label: 'Distance',
      value: `${metrics.totalDistanceMiles.toFixed(0)} mi`,
      subtitle: `${metrics.totalDistanceKm} km`,
      icon: <RouteIcon sx={{ fontSize: 22 }} />,
      color: '#06b6d4',
      donut: null,
    },
  ];

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 3,
        background: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.6)
          : '#fff',
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2.5}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            borderRadius: 2,
            p: 0.8,
            display: 'flex',
            color: 'white',
          }}
        >
          <SpeedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>
          Operations
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {items.map((item) => (
          <Grid item xs={6} sm={3} key={item.label}>
            <Box
              sx={{
                textAlign: 'center',
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(item.color, 0.04),
                border: `1px solid ${alpha(item.color, 0.08)}`,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: alpha(item.color, 0.08),
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ color: item.color, mb: 0.5, display: 'flex', justifyContent: 'center' }}>
                {item.icon}
              </Box>
              <Typography variant="h5" fontWeight={800}>
                {item.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {item.label}
              </Typography>
              {(item as any).subtitle && (
                <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                  {(item as any).subtitle}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// ─── Main Dashboard ──────────────────────────
const Dashboard = () => {
  const theme = useTheme();
  const [dateRange, setDateRange] = useState('month');
  const { data, loading, error, refetch } = useDashboard(dateRange);
  const { resetLayout, loading: layoutLoading } = useDashboardLayout();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRefresh = useCallback(() => {
    refetch();
    setSuccessMessage(t('dashboard.dashboardRefreshed'));
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [refetch, t]);

  const kpiWidgets = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: 'kpi-loads',
        title: t('dashboard.activeLoads'),
        value: data.kpis.activeLoadsCount,
        subtitle: `${data.kpis.runningLateCount} ${t('dashboard.runningLate')}`,
        trend: data.kpis.trends.loads,
        icon: <LocalShippingIcon />,
        color: 'primary.main',
      },
      {
        id: 'kpi-drivers',
        title: t('dashboard.totalDrivers'),
        value: data.kpis.totalDrivers,
        subtitle: `${data.kpis.availableDrivers} ${t('dashboard.available')}`,
        trend: data.kpis.trends.drivers,
        icon: <PeopleIcon />,
        color: 'success.main',
      },
      {
        id: 'kpi-completed',
        title: t('dashboard.completedToday'),
        value: data.kpis.completedToday,
        subtitle: t('dashboard.onTrackFor', { count: data.kpis.onTrack }),
        icon: <CheckCircleIcon />,
        color: 'warning.main',
      },
    ];
  }, [data, t]);

  if (loading || layoutLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 3 }} />
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2.5} mt={1}>
          {[1, 2].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={handleRefresh}>
              {t('common.retry')}
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data) return null;

  const fm = data.financialMetrics;
  const inv = data.invoices;
  const ops = data.operationalMetrics;

  const dateRangeLabel =
    dateRange === 'today'
      ? t('dashboard.today')
      : dateRange === 'week'
      ? t('dashboard.thisWeek')
      : t('dashboard.thisMonth');

  return (
    <DashboardLayout>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : alpha('#f8fafc', 1),
          minHeight: '100vh',
        }}
      >
        {/* ─── Header ──────────────────────────── */}
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mb={3}
          gap={2}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                background: 'linear-gradient(135deg, #1e293b, #475569)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: theme.palette.mode === 'dark' ? 'unset' : 'transparent',
                fontSize: { xs: '1.4rem', sm: '1.6rem' },
              }}
            >
              {t('dashboard.welcomeBack', { name: user?.name?.split(' ')[0] || 'Owner' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {t('dashboard.fleetOverview', { period: dateRangeLabel })}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: alpha('#3b82f6', 0.06),
                borderRadius: 2,
                px: 0.5,
                border: `1px solid ${alpha('#3b82f6', 0.12)}`,
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 16, color: '#3b82f6', ml: 1 }} />
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                size="small"
                variant="standard"
                disableUnderline
                sx={{
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  '& .MuiSelect-select': { py: 0.8, pl: 0.5 },
                }}
              >
                <MenuItem value="today">{t('dashboard.today')}</MenuItem>
                <MenuItem value="week">{t('dashboard.thisWeek')}</MenuItem>
                <MenuItem value="month">{t('dashboard.thisMonth')}</MenuItem>
              </Select>
            </Box>
            <IconButton
              onClick={handleRefresh}
              size="small"
              sx={{
                bgcolor: alpha('#3b82f6', 0.06),
                border: `1px solid ${alpha('#3b82f6', 0.12)}`,
                '&:hover': { bgcolor: alpha('#3b82f6', 0.12) },
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2, borderRadius: 2 }}>
            {successMessage}
          </Alert>
        )}

        {/* ─── KPI Row ──────────────────────────── */}
        <Grid container spacing={2.5} mb={3}>
          {kpiWidgets.map((widget) => (
            <Grid item xs={12} sm={6} md={3} key={widget.id}>
              <Suspense fallback={<Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} />}>
                <KPICard {...widget} />
              </Suspense>
            </Grid>
          ))}
          <Grid item xs={12} sm={6} md={3}>
            <Suspense fallback={<Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} />}>
              <VehicleStatsCard />
            </Suspense>
          </Grid>
        </Grid>

        {/* ─── Financial + Invoice Row ──────────────────────────── */}
        <Grid container spacing={2.5} mb={3}>
          {/* Financial Comparison */}
          <Grid item xs={12} md={6}>
            {fm && (
              <FinancialComparisonBar
                revenue={fm.totalRevenue}
                expenses={fm.totalExpenses}
                profit={fm.totalProfit}
                margin={fm.profitMargin}
              />
            )}
          </Grid>

          {/* Invoice Donut */}
          <Grid item xs={12} md={6}>
            {inv && <InvoiceDonutCard invoices={inv} />}
          </Grid>
        </Grid>

        {/* ─── Operational Metrics ──────────────────────────── */}
        {ops && (
          <Box mb={3}>
            <OperationalMetricsCard metrics={ops} />
          </Box>
        )}

        {/* ─── Load Status + Recent Activity ──────────────────────────── */}
        <Grid container spacing={2.5} mb={3}>
          <Grid item xs={12} md={6}>
            <Suspense fallback={<Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />}>
              <LoadStatusChart data={data.loadStatus} />
            </Suspense>
          </Grid>
          <Grid item xs={12} md={6}>
            <Suspense fallback={<Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />}>
              <RecentActivity activities={data.recentActivity} />
            </Suspense>
          </Grid>
        </Grid>

        {/* Critical Trips hidden — only shows when there are actual critical/delayed trips */}
        {data.criticalTrips && data.criticalTrips.length > 0 && (
          <Box mb={3}>
            <Suspense fallback={<Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />}>
              <CriticalTrips trips={data.criticalTrips} />
            </Suspense>
          </Box>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default Dashboard;
