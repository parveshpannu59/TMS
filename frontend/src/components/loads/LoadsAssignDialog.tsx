import { memo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Autocomplete,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
} from '@mui/material';
import { Assignment, LocalShipping, RvHookup } from '@mui/icons-material';
import type { Load } from '@/api/load.api';
import type { Driver } from '@/api/driver.api';
import type { Truck } from '@/api/truck.api';
import type { Trailer } from '@/api/trailer.api';

type LoadsAssignDialogProps = {
  open: boolean;
  onClose: () => void;
  load: Load | null;
  drivers: Driver[];
  trucks: Truck[];
  trailers: Trailer[];
  selectedDriver: Driver | null;
  selectedTruck: Truck | null;
  selectedTrailer: Trailer | null;
  onDriverChange: (v: Driver | null) => void;
  onTruckChange: (v: Truck | null) => void;
  onTrailerChange: (v: Trailer | null) => void;
  onAssign: () => void;
  mode?: 'assign' | 'edit';
};

export const LoadsAssignDialog = memo<LoadsAssignDialogProps>(function LoadsAssignDialog({
  open,
  onClose,
  load,
  drivers,
  trucks,
  trailers,
  selectedDriver,
  selectedTruck,
  selectedTrailer,
  onDriverChange,
  onTruckChange,
  onTrailerChange,
  onAssign,
  mode = 'assign',
}) {
  const [vehicleType, setVehicleType] = useState<'truck' | 'trailer'>('truck');
  const isEdit = mode === 'edit';

  const l = load as unknown as Record<string, any> | null;
  const pickup = l?.pickupLocation ?? l?.origin;
  const delivery = l?.deliveryLocation ?? l?.destination;
  const pickupAddr = pickup?.address || pickup?.city || '';
  const deliveryAddr = delivery?.address || delivery?.city || '';

  const hasVehicle = vehicleType === 'truck' ? !!selectedTruck : !!selectedTrailer;
  const canAssign = !!selectedDriver && hasVehicle;

  const handleVehicleTypeChange = (_: unknown, val: string | null) => {
    if (!val) return;
    setVehicleType(val as 'truck' | 'trailer');
    // Clear the other selection
    if (val === 'truck') onTrailerChange(null);
    else onTruckChange(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Assignment sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>{isEdit ? 'Edit Assignment' : 'Assign Load'}</Typography>
            {load && (
              <Typography variant="caption" color="text.secondary">
                #{load.loadNumber} {pickupAddr && deliveryAddr ? `• ${pickupAddr} → ${deliveryAddr}` : ''}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>

          {/* 1. Select Driver */}
          <Autocomplete
            options={drivers}
            getOptionLabel={(o) => `${o.name || (o as any).userId?.name || 'Unknown'} - License: ${o.licenseNumber}`}
            value={selectedDriver}
            onChange={(_, v) => onDriverChange(v)}
            size="small"
            renderInput={(p) => (
              <TextField {...p} label="Select Driver *" helperText={`${drivers.length} available drivers`} />
            )}
            renderOption={(props, o) => {
              const { key, ...rest } = props as { key: string; [k: string]: unknown };
              return (
                <li key={key} {...rest}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{o.name || (o as any).userId?.name || 'Unknown'}</Typography>
                    <Typography variant="caption" color="text.secondary">License: {o.licenseNumber}</Typography>
                  </Box>
                </li>
              );
            }}
          />

          {/* 2. Choose: Truck or Trailer */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
              Assign Vehicle *
            </Typography>
            <ToggleButtonGroup
              value={vehicleType}
              exclusive
              onChange={handleVehicleTypeChange}
              fullWidth
              size="small"
              sx={{
                mb: 2,
                '& .MuiToggleButton-root': {
                  py: 1.2, fontWeight: 600, borderRadius: 2, textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: vehicleType === 'truck' ? alpha('#3b82f6', 0.1) : alpha('#6366f1', 0.1),
                    color: vehicleType === 'truck' ? '#3b82f6' : '#6366f1',
                    borderColor: vehicleType === 'truck' ? '#3b82f6' : '#6366f1',
                    '&:hover': {
                      bgcolor: vehicleType === 'truck' ? alpha('#3b82f6', 0.15) : alpha('#6366f1', 0.15),
                    },
                  },
                },
              }}
            >
              <ToggleButton value="truck">
                <LocalShipping sx={{ mr: 1, fontSize: 20 }} /> Truck
              </ToggleButton>
              <ToggleButton value="trailer">
                <RvHookup sx={{ mr: 1, fontSize: 20 }} /> Trailer
              </ToggleButton>
            </ToggleButtonGroup>

            {vehicleType === 'truck' ? (
              <Autocomplete
                options={trucks}
                getOptionLabel={(o) => `${o.unitNumber} - ${o.make} ${o.model} (${o.year})`}
                value={selectedTruck}
                onChange={(_, v) => onTruckChange(v)}
                size="small"
                renderInput={(p) => (
                  <TextField {...p} label="Select Truck *" helperText={`${trucks.length} available trucks`} />
                )}
                renderOption={(props, o) => {
                  const { key, ...rest } = props as { key: string; [k: string]: unknown };
                  return (
                    <li key={key} {...rest}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{o.unitNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">{o.make} {o.model} ({o.year}) • VIN: {o.vin}</Typography>
                      </Box>
                    </li>
                  );
                }}
              />
            ) : (
              <Autocomplete
                options={trailers}
                getOptionLabel={(o) => `${o.unitNumber} - ${(o.type || '').replace('_', ' ').toUpperCase()}`}
                value={selectedTrailer}
                onChange={(_, v) => onTrailerChange(v)}
                size="small"
                renderInput={(p) => (
                  <TextField {...p} label="Select Trailer *" helperText={`${trailers.length} available trailers`} />
                )}
                renderOption={(props, o) => {
                  const { key, ...rest } = props as { key: string; [k: string]: unknown };
                  return (
                    <li key={key} {...rest}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{o.unitNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">{(o.type || '').replace('_', ' ').toUpperCase()} • VIN: {o.vin}</Typography>
                      </Box>
                    </li>
                  );
                }}
              />
            )}
          </Box>

          {canAssign && (
            <Alert severity="success" sx={{ py: 0.5 }}>
              Ready to assign to <strong>{(selectedDriver as any)?.name}</strong> with {vehicleType === 'truck' ? `Truck ${(selectedTruck as any)?.unitNumber}` : `Trailer ${(selectedTrailer as any)?.unitNumber}`}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onAssign} disabled={!canAssign} startIcon={<Assignment />}
          sx={{ fontWeight: 700 }}
        >
          {isEdit ? 'Update Assignment' : 'Assign Load'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});
