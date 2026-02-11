import { memo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { LoadStatus } from '../../types/dashboard.types';

const DONUT_COLORS = [
  '#3b82f6', // booked - blue
  '#8b5cf6', // assigned - purple
  '#a855f7', // trip accepted - violet
  '#22c55e', // trip started - green
  '#06b6d4', // in transit - cyan
  '#f59e0b', // receiver - amber
  '#10b981', // completed - emerald
];

interface LoadStatusChartProps {
  data: LoadStatus;
}

export const LoadStatusChart = memo(({ data }: LoadStatusChartProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const byStatus = data.byStatus;
  const hasBreakdown = byStatus && Object.values(byStatus).some((v) => v > 0);

  const pieData = hasBreakdown
    ? [
        { name: t('dashboard.booked'), value: byStatus!.booked, color: DONUT_COLORS[0] },
        { name: t('dashboard.assigned'), value: byStatus!.assigned, color: DONUT_COLORS[1] },
        { name: t('dashboard.tripAccepted'), value: byStatus!.tripAccepted, color: DONUT_COLORS[2] },
        {
          name: t('dashboard.tripStarted'),
          value: byStatus!.tripStarted + byStatus!.shipperCheckIn + byStatus!.shipperLoadIn + byStatus!.shipperLoadOut,
          color: DONUT_COLORS[3],
        },
        { name: t('dashboard.inTransit'), value: byStatus!.inTransit, color: DONUT_COLORS[4] },
        {
          name: t('dashboard.receiverStage'),
          value: byStatus!.receiverCheckIn + byStatus!.receiverOffload,
          color: DONUT_COLORS[5],
        },
        { name: t('dashboard.completed'), value: byStatus!.completed, color: DONUT_COLORS[6] },
      ].filter((d) => d.value > 0)
    : [
        { name: t('dashboard.pendingLoads'), value: data.pending, color: DONUT_COLORS[0] },
        { name: t('dashboard.inTransit'), value: data.inTransit, color: DONUT_COLORS[4] },
        { name: t('dashboard.delayed'), value: data.delayed, color: '#ef4444' },
      ].filter((d) => d.value > 0);

  const chartTotal = pieData.reduce((s, d) => s + d.value, 0);

  if (chartTotal === 0) {
    return (
      <Box
        sx={{
          borderRadius: 3,
          p: 3,
          height: '100%',
          background: alpha(theme.palette.primary.main, 0.03),
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {t('dashboard.loadStatus')}
        </Typography>
        <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">{t('dashboard.noLoadData')}</Typography>
        </Box>
      </Box>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const pct = chartTotal > 0 ? ((Number(p.value) / chartTotal) * 100).toFixed(1) : '0';
    return (
      <Box
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          p: 1.5,
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
        }}
      >
        <Typography variant="body2" fontWeight={700}>
          {p.name}
        </Typography>
        <Typography variant="body2" color="primary.main">
          {p.value} {Number(p.value) === 1 ? t('dashboard.load') : t('dashboard.loads')} ({pct}%)
        </Typography>
      </Box>
    );
  };

  // Custom center label
  const renderCenterLabel = () => (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
      <tspan
        x="50%"
        dy="-8"
        style={{
          fontSize: '28px',
          fontWeight: 800,
          fill: theme.palette.text.primary,
        }}
      >
        {chartTotal}
      </tspan>
      <tspan
        x="50%"
        dy="22"
        style={{
          fontSize: '11px',
          fontWeight: 500,
          fill: theme.palette.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        } as any}
      >
        {t('dashboard.totalLoads')}
      </tspan>
    </text>
  );

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
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('dashboard.loadStatus')}
        </Typography>
        <Box
          sx={{
            bgcolor: alpha('#3b82f6', 0.1),
            borderRadius: 1.5,
            px: 1.5,
            py: 0.3,
          }}
        >
          <Typography variant="caption" fontWeight={600} sx={{ color: '#3b82f6' }}>
            {chartTotal} {t('dashboard.totalLoads')}
          </Typography>
        </Box>
      </Box>

      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3} alignItems="center">
        {/* Donut Chart */}
        <Box sx={{ width: { xs: '100%', md: '55%' }, minHeight: 220 }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {renderCenterLabel()}
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Legend with progress bars */}
        <Box sx={{ flex: 1, width: '100%' }}>
          {pieData.map((d) => {
            const pct = chartTotal > 0 ? (d.value / chartTotal) * 100 : 0;
            return (
              <Box key={d.name} sx={{ mb: 1.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: d.color,
                        boxShadow: `0 0 6px ${alpha(d.color, 0.4)}`,
                      }}
                    />
                    <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                      {d.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
                    {d.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(d.color, 0.12),
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 3,
                      background: `linear-gradient(90deg, ${d.color}, ${alpha(d.color, 0.7)})`,
                      transition: 'width 1s ease-in-out',
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
});

LoadStatusChart.displayName = 'LoadStatusChart';
