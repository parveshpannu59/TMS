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
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, PhotoCamera, AttachFile } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

interface ReceiverOffloadDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const ReceiverOffloadDialog: React.FC<ReceiverOffloadDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [quantity, setQuantity] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [bolAcknowledged, setBolAcknowledged] = useState(false);
  const [podFile, setPodFile] = useState<File | null>(null);
  const [podPhoto, setPodPhoto] = useState<File | null>(null);
  const [podPhotoPreview, setPodPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPodFile(file);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Photo size should be less than 10MB');
        return;
      }
      setPodPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPodPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!bolAcknowledged) {
      setError('Please acknowledge BOL receipt');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: Upload files to server and get URLs
      const podDocumentUrl = podFile ? '' : undefined;
      const podPhotoUrl = podPhotoPreview || undefined;

      await loadApi.receiverOffload(load.id, {
        quantity,
        additionalDetails,
        bolAcknowledged: true,
        podDocument: podDocumentUrl,
        podPhoto: podPhotoUrl,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete offload');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuantity('');
    setAdditionalDetails('');
    setBolAcknowledged(false);
    setPodFile(null);
    setPodPhoto(null);
    setPodPhotoPreview(null);
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
          <Typography variant="h6">Receiver Offload</Typography>
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
            label="Quantity (Optional)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity delivered"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Details (Optional)"
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="Any additional notes or details"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={bolAcknowledged}
                onChange={(e) => setBolAcknowledged(e.target.checked)}
                required
              />
            }
            label="I acknowledge receipt of the Bill of Lading (BOL) *"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Upload Proof of Delivery Document (Optional)
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              startIcon={<AttachFile />}
              onClick={() => fileInputRef.current?.click()}
              fullWidth
            >
              {podFile ? podFile.name : 'Upload POD Document'}
            </Button>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Upload Proof of Delivery Photo (Optional)
            </Typography>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            {podPhotoPreview ? (
              <Box>
                <img
                  src={podPhotoPreview}
                  alt="POD"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                />
                <Button
                  size="small"
                  onClick={() => {
                    setPodPhoto(null);
                    setPodPhotoPreview(null);
                  }}
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => photoInputRef.current?.click()}
                fullWidth
              >
                Take/Upload POD Photo
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !bolAcknowledged}
        >
          {loading ? <CircularProgress size={16} /> : 'Complete Offload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
