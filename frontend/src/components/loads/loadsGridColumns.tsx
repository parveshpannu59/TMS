import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GridColDef } from '@mui/x-data-grid';
import { Chip, Typography } from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  Assignment,
  PendingActions,
  CheckCircle,
} from '@mui/icons-material';
import { GridActionsCellItem } from '@mui/x-data-grid';
import type { Load } from '@/api/load.api';
import type { Driver } from '@/api/driver.api';
import type { Truck } from '@/api/truck.api';
import type { Trailer } from '@/api/trailer.api';

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  booked: 'default',
  rate_confirmed: 'info',
  assigned: 'info',
  trip_accepted: 'primary',
  in_transit: 'primary',
  arrived_receiver: 'secondary',
  delivered: 'success',
  completed: 'success',
  cancelled: 'error',
};

type ColumnFactoryParams = {
  onView: (load: Load) => void;
  onEdit: (load: Load) => void;
  onDelete: (id: string) => void;
  onAssign: (load: Load) => void;
  onUnassign: (load: Load) => void;
  onOpenNotes: (notes: string, title: string) => void;
  onConfirmRate?: (load: Load) => void;
};

export function getLoadsGridColumns(params: ColumnFactoryParams & { t: (key: string, opts?: { defaultValue?: string }) => string }): GridColDef[] {
  const { t, onView, onEdit, onDelete, onAssign, onUnassign, onOpenNotes } = params;
  const onConfirmRate = params.onConfirmRate ?? null;

  return [
    {
      field: 'loadNumber',
      headerName: t('loads.loadNumber'),
      flex: 0.8,
      minWidth: 100,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} color="primary">
          {p.value}
        </Typography>
      ),
    },
    {
      field: 'pickupLocation',
      headerName: t('loads.origin', { defaultValue: 'Origin' }),
      flex: 1.2,
      minWidth: 130,
      valueGetter: (p) => {
        if (!p.row) return '-';
        const loc = p.row.pickupLocation || p.row.origin;
        if (!loc) return '-';
        return `${loc.city || ''}, ${loc.state || ''}`.trim() || '-';
      },
      renderCell: (p) => {
        if (!p.row) return '-';
        const loc = p.row.pickupLocation || p.row.origin;
        if (!loc?.city) return '-';
        return `${loc.city}, ${loc.state || ''}`;
      },
    },
    {
      field: 'deliveryLocation',
      headerName: t('loads.destination', { defaultValue: 'Destination' }),
      flex: 1.2,
      minWidth: 130,
      valueGetter: (p) => {
        if (!p.row) return '-';
        const loc = p.row.deliveryLocation || p.row.destination;
        if (!loc) return '-';
        return `${loc.city || ''}, ${loc.state || ''}`.trim() || '-';
      },
      renderCell: (p) => {
        if (!p.row) return '-';
        const loc = p.row.deliveryLocation || p.row.destination;
        if (!loc?.city) return '-';
        return `${loc.city}, ${loc.state || ''}`;
      },
    },
    {
      field: 'pickupDate',
      headerName: t('loads.pickupDate'),
      flex: 0.8,
      minWidth: 100,
      renderCell: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '-'),
    },
    {
      field: 'deliveryDate',
      headerName: t('loads.deliveryDate'),
      flex: 0.8,
      minWidth: 100,
      renderCell: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '-'),
    },
    {
      field: 'status',
      headerName: t('common.status'),
      flex: 1,
      minWidth: 120,
      renderCell: (p) => (
        <Chip
          label={(p.value || '').replace('_', ' ').toUpperCase()}
          color={STATUS_COLORS[p.value as string] || 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'driverId',
      headerName: t('loads.driver', { defaultValue: 'Driver' }),
      flex: 1,
      minWidth: 120,
      renderCell: (p) => {
        const dr = p.value as Driver | string | undefined;
        const name = typeof dr === 'object' && dr?.name ? dr.name : '-';
        return (
          <Typography variant="body2" color={name === '-' ? 'text.secondary' : 'text.primary'}>
            {name || t('loads.unassigned', { defaultValue: 'Unassigned' })}
          </Typography>
        );
      },
    },
    {
      field: 'rate',
      headerName: t('loads.rate'),
      flex: 0.7,
      minWidth: 90,
      renderCell: (p) => `$${(p.value ?? 0).toLocaleString()}`,
    },
    {
      field: 'broker',
      headerName: t('loads.broker', { defaultValue: 'Broker' }),
      flex: 1,
      minWidth: 110,
    },
    {
      field: 'notes',
      headerName: t('common.notes'),
      flex: 1.5,
      minWidth: 150,
      renderCell: (p) => {
        const notes = (p.row?.notes ?? p.row?.internalNotes ?? (p.row as Record<string, unknown>)?.specialInstructions) ?? '';
        const truncated = typeof notes === 'string' && notes.length > 50 ? notes.slice(0, 50) + '...' : notes;
        return (
          <Typography
            variant="body2"
            color="text.secondary"
            fontStyle={!notes ? 'italic' : undefined}
            onClick={() => notes && onOpenNotes(notes, `Notes - Load #${p.row?.loadNumber ?? 'N/A'}`)}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: notes ? 'pointer' : 'default',
              '&:hover': notes ? { color: 'primary.main', textDecoration: 'underline' } : {},
            }}
          >
            {truncated || t('common.noNotes')}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('common.actions'),
      width: 120,
      getActions: (p) => {
        const row = p.row as Load;
        const rowId = row._id || '';
        const actions: React.ReactNode[] = [
          <GridActionsCellItem key={`${rowId}-view`} icon={<Visibility />} label={t('common.view')} onClick={() => onView(row)} />,
        ];
        if (row.status === 'booked' && onConfirmRate) {
          actions.push(
            <GridActionsCellItem
              key={`${rowId}-confirmRate`}
              icon={<CheckCircle />}
              label={t('loads.confirmRate', { defaultValue: 'Confirm Rate' })}
              onClick={() => onConfirmRate(row)}
            />
          );
        }
        if (row.status === 'booked' || row.status === 'rate_confirmed') {
          actions.push(
            <GridActionsCellItem key={`${rowId}-assign`} icon={<Assignment />} label={t('loads.assignDriver')} onClick={() => onAssign(row)} />
          );
        }
        if (row.status === 'assigned' || row.status === 'trip_accepted') {
          actions.push(
            <GridActionsCellItem
              key={`${rowId}-unassign`}
              icon={<PendingActions />}
              label={t('loads.unassignReassign')}
              onClick={() => onUnassign(row)}
              showInMenu
            />
          );
        }
        actions.push(
          <GridActionsCellItem key={`${rowId}-edit`} icon={<Edit />} label={t('common.edit')} onClick={() => onEdit(row)} showInMenu />,
          <GridActionsCellItem key={`${rowId}-delete`} icon={<Delete />} label={t('common.delete')} onClick={() => onDelete(row._id)} showInMenu />
        );
        return actions;
      },
    },
  ];
}

export function useLoadsGridColumns(params: ColumnFactoryParams): GridColDef[] {
  const { t } = useTranslation();
  return useMemo(
    () => getLoadsGridColumns({ ...params, t }),
    [t, params.onView, params.onEdit, params.onDelete, params.onAssign, params.onUnassign, params.onOpenNotes, params.onConfirmRate]
  );
}
