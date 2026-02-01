import { memo } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  Alert,
} from '@mui/material';
import { Assignment } from '@mui/icons-material';
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
}) {
  const pickup = (load as Record<string, unknown>)?.pickupLocation ?? (load as Record<string, unknown>)?.origin;
  const delivery = (load as Record<string, unknown>)?.deliveryLocation ?? (load as Record<string, unknown>)?.destination;
  const pickupCity = (pickup as { city?: string })?.city ?? 'N/A';
  const pickupState = (pickup as { state?: string })?.state ?? '';
  const deliveryCity = (delivery as { city?: string })?.city ?? 'N/A';
  const deliveryState = (delivery as { state?: string })?.state ?? '';
  const canAssign = selectedDriver && selectedTruck && selectedTrailer;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6">Assign Load</Typography>
          {load && (
            <Typography variant="body2" color="text.secondary">
              Load #{load.loadNumber} • {pickupCity}, {pickupState} → {deliveryCity}, {deliveryState}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Stepper activeStep={canAssign ? 3 : selectedDriver && selectedTruck ? 2 : selectedDriver ? 1 : 0}>
            <Step><StepLabel>Select Driver</StepLabel></Step>
            <Step><StepLabel>Select Truck</StepLabel></Step>
            <Step><StepLabel>Select Trailer</StepLabel></Step>
          </Stepper>

          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Autocomplete
              options={drivers}
              getOptionLabel={(o) => `${o.name || (o as Record<string, unknown>).userId?.name || 'Unknown'} - License: ${o.licenseNumber}`}
              value={selectedDriver}
              onChange={(_, v) => onDriverChange(v)}
              renderInput={(p) => (
                <TextField {...p} label="Select Driver *" helperText={`${drivers.length} available drivers`} />
              )}
              renderOption={(props, o) => {
                const { key, ...rest } = props as { key: string; [k: string]: unknown };
                return (
                  <li key={key} {...rest}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{o.name || (o as Record<string, unknown>).userId?.name || 'Unknown'}</Typography>
                      <Typography variant="caption" color="text.secondary">License: {o.licenseNumber} • {o.phone || (o as Record<string, unknown>).userId?.phone || 'N/A'}</Typography>
                    </Box>
                  </li>
                );
              }}
            />

            <Autocomplete
              options={trucks}
              getOptionLabel={(o) => `${o.unitNumber} - ${o.make} ${o.model} (${o.year})`}
              value={selectedTruck}
              onChange={(_, v) => onTruckChange(v)}
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

            <Autocomplete
              options={trailers}
              getOptionLabel={(o) => `${o.unitNumber} - ${(o.type || '').replace('_', ' ').toUpperCase()}`}
              value={selectedTrailer}
              onChange={(_, v) => onTrailerChange(v)}
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
          </Box>

          {canAssign && (
            <Alert severity="success" sx={{ mt: 3 }}>
              Ready to assign! This will update the status of the driver, truck, and trailer.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onAssign} disabled={!canAssign} startIcon={<Assignment />}>
          Assign Load
        </Button>
      </DialogActions>
    </Dialog>
  );
});
