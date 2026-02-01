import { memo } from 'react';
import { Grid } from '@mui/material';
import {
  Assignment,
  PendingActions,
  LocalShipping,
  CheckCircle,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { StatsCard } from '@/components/common/StatsCard';
import { useTheme } from '@mui/material/styles';

type LoadsStatsProps = {
  total: number;
  booked: number;
  inTransit: number;
  completed: number;
  totalRevenue: number;
};

export const LoadsStats = memo<LoadsStatsProps>(function LoadsStats({
  total,
  booked,
  inTransit,
  completed,
  totalRevenue,
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={6} sm={6} md={3}>
        <StatsCard
          title={t('loads.totalLoads', { defaultValue: 'Total Loads' })}
          value={total}
          icon={<Assignment />}
          color={theme.palette.primary.main}
        />
      </Grid>
      <Grid item xs={6} sm={6} md={3}>
        <StatsCard
          title={t('loads.booked', { defaultValue: 'Booked' })}
          value={booked}
          icon={<PendingActions />}
          color={theme.palette.warning.main}
          subtitle={t('loads.awaitingAssignment', { defaultValue: 'Awaiting assignment' })}
        />
      </Grid>
      <Grid item xs={6} sm={6} md={3}>
        <StatsCard
          title={t('loads.inTransit', { defaultValue: 'In Transit' })}
          value={inTransit}
          icon={<LocalShipping />}
          color={theme.palette.info.main}
          subtitle={t('loads.onTheRoad', { defaultValue: 'On the road' })}
        />
      </Grid>
      <Grid item xs={6} sm={6} md={3}>
        <StatsCard
          title={t('loads.completed', { defaultValue: 'Completed' })}
          value={completed}
          icon={<CheckCircle />}
          color={theme.palette.success.main}
          subtitle={`$${totalRevenue.toLocaleString()} ${t('loads.revenue', { defaultValue: 'revenue' })}`}
        />
      </Grid>
    </Grid>
  );
});
