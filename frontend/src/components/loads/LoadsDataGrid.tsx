import { memo } from 'react';
import { Card } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Assignment } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { EmptyState } from '@/components/common/EmptyState';
import { useTranslation } from 'react-i18next';
import { useLoadsGridColumns } from './loadsGridColumns';
import type { Load } from '@/api/load.api';

type LoadsDataGridProps = {
  loads: Load[];
  filteredLoads: Load[];
  loading: boolean;
  onView: (load: Load) => void;
  onEdit: (load: Load) => void;
  onDelete: (id: string) => void;
  onAssign: (load: Load) => void;
  onUnassign: (load: Load) => void;
  onOpenNotes: (notes: string, title: string) => void;
  onConfirmRate?: (load: Load) => void;
  onAddLoad: () => void;
};

export const LoadsDataGrid = memo<LoadsDataGridProps>(function LoadsDataGrid({
  loads,
  filteredLoads,
  loading,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onUnassign,
  onOpenNotes,
  onConfirmRate,
  onAddLoad,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const columns = useLoadsGridColumns({
    onView,
    onEdit,
    onDelete,
    onAssign,
    onUnassign,
    onOpenNotes,
    onConfirmRate,
  });

  return (
    <Card
      sx={{
        width: '100%',
        minHeight: 900,
        height: filteredLoads.length > 10 ? filteredLoads.length * 52 + 150 : 900,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: theme.shadows[2],
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: theme.shadows[4] },
      }}
    >
      {!loading && filteredLoads.length === 0 ? (
        <EmptyState
          icon={<Assignment />}
          title={loads.length === 0 ? 'No Loads Yet' : 'No Results Found'}
          description={
            loads.length === 0
              ? t('loads.noLoadsDescription', {
                  defaultValue:
                    'Get started by creating your first load. Add origin, destination, and trip details to begin managing your freight.',
                })
              : t('common.tryAdjustingFilters')
          }
          actionLabel={loads.length === 0 ? 'Create First Load' : undefined}
          onAction={loads.length === 0 ? onAddLoad : undefined}
        />
      ) : (
        <DataGrid
          rows={filteredLoads}
          columns={columns}
          loading={loading}
          getRowId={(row) => row._id}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          autoHeight={false}
          sx={{
            width: '100%',
            height: '100%',
            border: 'none',
            '& .MuiDataGrid-main': { width: '100%' },
            '& .MuiDataGrid-cell': { padding: '12px 16px', fontSize: '0.875rem', borderColor: 'divider' },
            '& .MuiDataGrid-columnHeaders': {
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: 'background.default',
              borderBottom: '2px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              '&:nth-of-type(even)': { bgcolor: 'action.hover', opacity: 0.5 },
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
            },
            '& .MuiDataGrid-virtualScroller': { overflow: 'auto !important' },
          }}
        />
      )}
    </Card>
  );
});
