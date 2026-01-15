import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search,
  FilterList,
  Clear,
} from '@mui/icons-material';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'dateRange';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface TableFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterConfig[];
  filterValues: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  searchPlaceholder?: string;
}

export const TableFilters: React.FC<TableFiltersProps> = ({
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  onClearFilters,
  searchPlaceholder = 'Search...',
}) => {
  const hasActiveFilters = Object.values(filterValues).some(
    (value) => value !== '' && value !== 'all' && value !== null && value !== undefined
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Bar */}
        <TextField
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: searchValue && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onSearchChange('')}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: 250 }}
          size="small"
        />

        {/* Dynamic Filters */}
        {filters.map((filter) => {
          if (filter.type === 'select') {
            return (
              <TextField
                key={filter.key}
                select
                label={filter.label}
                value={filterValues[filter.key] || 'all'}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                sx={{ minWidth: 150 }}
                size="small"
              >
                <MenuItem value="all">All {filter.label}</MenuItem>
                {filter.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            );
          }

          if (filter.type === 'date') {
            return (
              <TextField
                key={filter.key}
                type="date"
                label={filter.label}
                value={filterValues[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
                size="small"
              />
            );
          }

          if (filter.type === 'text') {
            return (
              <TextField
                key={filter.key}
                label={filter.label}
                placeholder={filter.placeholder}
                value={filterValues[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                sx={{ minWidth: 150 }}
                size="small"
              />
            );
          }

          return null;
        })}

        {/* Clear Filters Button */}
        {(hasActiveFilters || searchValue) && (
          <Tooltip title="Clear all filters">
            <Chip
              label="Clear Filters"
              onDelete={onClearFilters}
              deleteIcon={<Clear />}
              color="primary"
              variant="outlined"
              sx={{ height: 40 }}
            />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};
