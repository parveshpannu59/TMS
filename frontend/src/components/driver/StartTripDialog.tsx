import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { PhotoCamera, Close, CloudUpload } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

interface StartTripDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const StartTripDialog: React.FC<StartTripDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [startingMileage, setStartingMileage] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Photo size should be less than 10MB');
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!startingMileage || !photo) {
      setError('Please enter starting mileage and upload odometer photo');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: Upload photo to server and get URL
      // For now, using a placeholder
      const photoUrl = photoPreview || '';

      await loadApi.startTrip(load.id, {
        startingMileage: parseInt(startingMileage),
        startingPhoto: photoUrl,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStartingMileage('');
    setPhoto(null);
    setPhotoPreview(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Start Trip - {load.loadNumber}</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            fullWidth
            label="Starting Mileage *"
            type="number"
            value={startingMileage}
            onChange={(e) => setStartingMileage(e.target.value)}
            placeholder="Enter odometer reading"
            required
            inputProps={{ min: 0 }}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Upload Odometer/Speedometer Photo *
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            <Box
              sx={{
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: photoPreview ? 'action.selected' : 'background.default',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <Box>
                  <img
                    src={photoPreview}
                    alt="Odometer"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {photo?.name} ({(photo?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Box>
                  <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Click to upload odometer photo
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max size: 10MB
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Alert severity="info">
            Make sure the odometer reading is clearly visible in the photo before submitting.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !startingMileage || !photo}
          startIcon={loading ? <CircularProgress size={16} /> : <CloudUpload />}
        >
          Start Trip
        </Button>
      </DialogActions>
    </Dialog>
  );
};
