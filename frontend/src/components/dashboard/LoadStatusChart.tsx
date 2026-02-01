import { memo } from 'react';
import { Box, Typography, Card, CardContent, useTheme, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { LoadStatus } from '../../types/dashboard.types';

const CHART_COLORS = [
  '#94a3b8', // booked - slate
  '#3b82f6', // assigned - blue
  '#8b5cf6', // trip accepted - violet
  '#22c55e', // trip started - green (driver started - highlight!)
  '#06b6d4', // shipper stages - cyan
  '#f59e0b', // in transit - amber
  '#ef4444', // delayed
  '#10b981', // completed - emerald
];

interface LoadStatusChartProps {
  data: LoadStatus;
}

export const LoadStatusChart = memo(({ data }: LoadStatusChartProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // Build chart data from byStatus if available (richer breakdown)
  const byStatus = data.byStatus;
  const hasBreakdown = byStatus && Object.values(byStatus).some((v) => v > 0);

  const pieData = hasBreakdown
    ? [
        { name: t('dashboard.booked'), value: byStatus!.booked, color: CHART_COLORS[0] },
        { name: t('dashboard.assigned'), value: byStatus!.assigned, color: CHART_COLORS[1] },
        {
          name: t('dashboard.tripAccepted'),
          value: byStatus!.tripAccepted,
          color: CHART_COLORS[2],
        },
        {
          name: t('dashboard.tripStarted'),
          value:
            byStatus!.tripStarted +
            byStatus!.shipperCheckIn +
            byStatus!.shipperLoadIn +
            byStatus!.shipperLoadOut,
          color: CHART_COLORS[3],
        },
        { name: t('dashboard.inTransit'), value: byStatus!.inTransit, color: CHART_COLORS[5] },
        {
          name: t('dashboard.receiverStage'),
          value: byStatus!.receiverCheckIn + byStatus!.receiverOffload,
          color: CHART_COLORS[4],
        },
        { name: t('dashboard.completed'), value: byStatus!.completed, color: CHART_COLORS[7] },
      ].filter((d) => d.value > 0)
    : [
        { name: t('dashboard.pendingLoads'), value: data.pending, color: CHART_COLORS[0] },
        { name: t('dashboard.inTransit'), value: data.inTransit, color: CHART_COLORS[5] },
        { name: t('dashboard.delayed'), value: data.delayed, color: CHART_COLORS[6] },
      ].filter((d) => d.value > 0);

  const barData = hasBreakdown
    ? [
        { stage: t('dashboard.booked'), count: byStatus!.booked, fill: CHART_COLORS[0] },
        { stage: t('dashboard.assigned'), count: byStatus!.assigned, fill: CHART_COLORS[1] },
        {
          stage: t('dashboard.tripAccepted'),
          count: byStatus!.tripAccepted,
          fill: CHART_COLORS[2],
        },
        {
          stage: t('dashboard.tripStarted'),
          count: byStatus!.tripStarted,
          fill: CHART_COLORS[3],
        },
        {
          stage: t('dashboard.shipperCheckIn'),
          count: byStatus!.shipperCheckIn,
          fill: CHART_COLORS[4],
        },
        {
          stage: t('dashboard.shipperLoadOut'),
          count: byStatus!.shipperLoadOut,
          fill: CHART_COLORS[4],
        },
        {
          stage: t('dashboard.inTransit'),
          count: byStatus!.inTransit,
          fill: CHART_COLORS[5],
        },
        {
          stage: t('dashboard.receiverOffload'),
          count: byStatus!.receiverOffload,
          fill: CHART_COLORS[4],
        },
        {
          stage: t('dashboard.completed'),
          count: byStatus!.completed,
          fill: CHART_COLORS[7],
        },
      ].filter((d) => d.count > 0)
    : [
        { stage: t('dashboard.pendingLoads'), count: data.pending, fill: CHART_COLORS[0] },
        { stage: t('dashboard.inTransit'), count: data.inTransit, fill: CHART_COLORS[5] },
        { stage: t('dashboard.delayed'), count: data.delayed, fill: CHART_COLORS[6] },
      ].filter((d) => d.count > 0);

  const chartTotal = pieData.reduce((s, d) => s + d.value, 0);

  if (chartTotal === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            {t('dashboard.loadStatus')}
          </Typography>
          <Box
            sx={{
              height: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            {t('dashboard.noLoadData')}
          </Box>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const label = p.payload?.stage ?? p.name ?? '';
    const val = p.value ?? p.payload?.count ?? 0;
    const pct = chartTotal > 0 ? ((Number(val) / chartTotal) * 100).toFixed(1) : '0';
    return (
      <Box
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          p: 1.5,
          boxShadow: 2,
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="body2" color="primary">
          {val} {Number(val) === 1 ? t('dashboard.load') : t('dashboard.loads')} ({pct}%)
        </Typography>
      </Box>
    );
  };

  return (
    <Card
      sx={{
        height: '100%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            {t('dashboard.loadStatus')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {chartTotal} {t('dashboard.totalLoads')}
          </Typography>
        </Box>

        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
          {/* Pie Chart - Driver journey at a glance */}
          <Box sx={{ flex: 1, minHeight: 220 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {t('dashboard.loadStatusDistribution')}
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          {/* Bar Chart - Detailed breakdown (Driver Accepted, Started highlighted) */}
          <Box sx={{ flex: 1.2, minHeight: 220 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {t('dashboard.loadsByStage')}
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={100}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Legend - highlight Trip Accepted & Trip Started */}
        <Box
          display="flex"
          flexWrap="wrap"
          gap={1}
          mt={1}
          justifyContent="center"
          sx={{ '& .legend-item': { display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 11 } }}
        >
          {pieData.map((d) => (
            <Box key={d.name} className="legend-item">
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: 1,
                  bgcolor: d.color,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {d.name}: {d.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
});

LoadStatusChart.displayName = 'LoadStatusChart';
