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
  Description,
  Info,
  RateReview,
  Payments,
  SwapHoriz,
} from '@mui/icons-material';
import { GridActionsCellItem } from '@mui/x-data-grid';
import type { Load } from '@/api/load.api';
import type { Driver } from '@/api/driver.api';
import type { Truck } from '@/api/truck.api';
import type { Trailer } from '@/api/trailer.api';

// Smart location formatter — handles city/state, address, or name fields
function fmtLocation(loc: any): string {
  if (!loc) return '-';
  if (loc.city && loc.city.trim()) return `${loc.city}, ${loc.state || ''}`.replace(/,\s*$/, '');
  if (loc.address && loc.address.trim()) {
    // Truncate long addresses
    return loc.address.length > 35 ? loc.address.substring(0, 35) + '...' : loc.address;
  }
  if (loc.name && loc.name.trim()) {
    return loc.name.length > 35 ? loc.name.substring(0, 35) + '...' : loc.name;
  }
  return '-';
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  booked: 'default',
  rate_confirmed: 'info',
  assigned: 'info',
  trip_accepted: 'primary',
  in_transit: 'primary',
  arrived_receiver: 'secondary',
  delivered: 'warning',
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
  onEditAssignment?: (load: Load) => void;
  onViewTripDetails?: (load: Load) => void;
  onReviewCompletion?: (load: Load) => void;
  onManagePayment?: (load: Load) => void;
};

export function getLoadsGridColumns(params: ColumnFactoryParams & { t: (key: string, opts?: { defaultValue?: string }) => string }): GridColDef[] {
  const { t, onView, onEdit, onDelete, onAssign, onUnassign, onOpenNotes } = params;
  const onConfirmRate = params.onConfirmRate ?? null;
  const onEditAssignment = params.onEditAssignment ?? null;
  const onViewTripDetails = params.onViewTripDetails ?? null;
  const onReviewCompletion = params.onReviewCompletion ?? null;
  const onManagePayment = params.onManagePayment ?? null;

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
        return fmtLocation(loc);
      },
      renderCell: (p) => {
        if (!p.row) return '-';
        const loc = p.row.pickupLocation || p.row.origin;
        return fmtLocation(loc);
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
        return fmtLocation(loc);
      },
      renderCell: (p) => {
        if (!p.row) return '-';
        const loc = p.row.deliveryLocation || p.row.destination;
        return fmtLocation(loc);
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
      field: 'expectedDeliveryDate',
      headerName: t('loads.deliveryDate'),
      flex: 0.8,
      minWidth: 100,
      renderCell: (p) => {
        const actual = p.row?.actualDeliveryDate;
        const expected = p.row?.expectedDeliveryDate;
        const date = actual || expected;
        return date ? new Date(date).toLocaleDateString() : '-';
      },
    },
    {
      field: 'status',
      headerName: t('common.status'),
      flex: 1,
      minWidth: 120,
      renderCell: (p) => {
        const status = p.value as string || '';
        const label = status === 'delivered'
          ? 'DELIVERED'
          : status.replace(/_/g, ' ').toUpperCase();
        return (
          <Chip
            label={label}
            color={STATUS_COLORS[status] || 'default'}
            size="small"
            sx={status === 'delivered' ? { animation: 'pulse 2s infinite', fontWeight: 700 } : undefined}
          />
        );
      },
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
      field: 'documents',
      headerName: 'Docs',
      flex: 0.5,
      minWidth: 70,
      renderCell: (p) => {
        const docs = p.row?.documents;
        const hasDoc = docs?.bol || docs?.pod || (docs?.others?.length > 0);
        const count = (docs?.bol ? 1 : 0) + (docs?.pod ? 1 : 0) + (docs?.others?.length || 0);
        return (
          <Typography
            variant="body2"
            color={hasDoc ? 'success.main' : 'text.disabled'}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}
          >
            <Description fontSize="small" />
            {hasDoc ? count : 0}
          </Typography>
        );
      },
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
        // Trip Details action for loads with active/completed trips
        if (onViewTripDetails && ['assigned', 'trip_accepted', 'trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload', 'delivered', 'completed'].includes(row.status)) {
          actions.push(
            <GridActionsCellItem key={`${rowId}-tripDetails`} icon={<Info />} label="Trip Details" onClick={() => onViewTripDetails(row)} />
          );
        }
        // Confirm Rate: available for booked loads and assigned loads (triggers driver notification)
        if ((row.status === 'booked' || row.status === 'assigned') && onConfirmRate) {
          actions.push(
            <GridActionsCellItem
              key={`${rowId}-confirmRate`}
              icon={<CheckCircle />}
              label={row.status === 'assigned'
                ? t('loads.confirmRateNotify', { defaultValue: 'Confirm Rate & Notify Driver' })
                : t('loads.confirmRate', { defaultValue: 'Confirm Rate' })}
              onClick={() => onConfirmRate(row)}
            />
          );
        }
        // Assign Driver: booked or rate_confirmed (no driver yet)
        if (row.status === 'booked' || row.status === 'rate_confirmed') {
          actions.push(
            <GridActionsCellItem key={`${rowId}-assign`} icon={<Assignment />} label={t('loads.assignDriver')} onClick={() => onAssign(row)} />
          );
        }
        // Edit Assignment: change driver/truck/trailer before rate confirmation
        if (row.status === 'assigned' && onEditAssignment) {
          actions.push(
            <GridActionsCellItem
              key={`${rowId}-editAssignment`}
              icon={<SwapHoriz />}
              label={t('loads.editAssignment', { defaultValue: 'Edit Assignment' })}
              onClick={() => onEditAssignment(row)}
            />
          );
        }
        // Unassign/Reassign
        if (row.status === 'assigned' || row.status === 'rate_confirmed' || row.status === 'trip_accepted') {
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
        // Review & Confirm for delivered loads (awaiting owner review)
        if (row.status === 'delivered' && onReviewCompletion) {
          actions.push(
            <GridActionsCellItem
              key={`${rowId}-review`}
              icon={<RateReview color="warning" />}
              label="Review & Confirm"
              onClick={() => onReviewCompletion(row)}
            />
          );
        }
        // Payment action for completed loads (only when payment is approved, not just pending)
        if (row.status === 'completed' && (row as any).paymentStatus === 'approved' && onManagePayment) {
          actions.push(
            <GridActionsCellItem
              key={`${rowId}-payment`}
              icon={<Payments color="success" />}
              label="Manage Payment"
              onClick={() => onManagePayment(row)}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, params.onView, params.onEdit, params.onDelete, params.onAssign, params.onUnassign, params.onOpenNotes, params.onConfirmRate, params.onEditAssignment, params.onViewTripDetails, params.onReviewCompletion, params.onManagePayment]
  );
}
