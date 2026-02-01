import { memo } from 'react';
import { Box, Button, TextField, MenuItem } from '@mui/material';
import { Search, FilterList } from '@mui/icons-material';
import { InputAdornment } from '@mui/material';
import { useTranslation } from 'react-i18next';

type LoadsFiltersProps = {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onClear: () => void;
};

export const LoadsFilters = memo<LoadsFiltersProps>(function LoadsFilters({
  searchTerm,
  statusFilter,
  priorityFilter,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onClear,
}) {
  const { t } = useTranslation();
  const hasFilters = searchTerm || statusFilter !== 'all' || priorityFilter !== 'all';

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
      <TextField
        id="loads-search"
        placeholder={t('loads.searchPlaceholder', {
          defaultValue: 'Search by load#, origin, destination, broker...',
        })}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ flex: 1, minWidth: 300 }}
        size="small"
      />
      <TextField
        id="loads-status-filter"
        select
        label={t('common.status')}
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        sx={{ minWidth: 150 }}
        size="small"
      >
        <MenuItem value="all">{t('loads.allStatus', { defaultValue: 'All Status' })}</MenuItem>
        <MenuItem value="booked">Booked</MenuItem>
        <MenuItem value="assigned">Assigned</MenuItem>
        <MenuItem value="in_transit">{t('loads.inTransit', { defaultValue: 'In Transit' })}</MenuItem>
        <MenuItem value="arrived_shipper">Arrived Shipper</MenuItem>
        <MenuItem value="loading">Loading</MenuItem>
        <MenuItem value="departed_shipper">Departed Shipper</MenuItem>
        <MenuItem value="arrived_receiver">Arrived Receiver</MenuItem>
        <MenuItem value="unloading">Unloading</MenuItem>
        <MenuItem value="delivered">Delivered</MenuItem>
        <MenuItem value="completed">{t('loads.completed', { defaultValue: 'Completed' })}</MenuItem>
        <MenuItem value="cancelled">Cancelled</MenuItem>
      </TextField>
      <TextField
        id="loads-priority-filter"
        select
        label={t('loads.priority', { defaultValue: 'Priority' })}
        value={priorityFilter}
        onChange={(e) => onPriorityChange(e.target.value)}
        sx={{ minWidth: 150 }}
        size="small"
      >
        <MenuItem value="all">All Priority</MenuItem>
        <MenuItem value="low">Low</MenuItem>
        <MenuItem value="medium">Medium</MenuItem>
        <MenuItem value="high">High</MenuItem>
        <MenuItem value="urgent">Urgent</MenuItem>
      </TextField>
      {hasFilters && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterList />}
          onClick={onClear}
        >
          Clear
        </Button>
      )}
    </Box>
  );
});
