import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Link,
} from '@mui/material';
import { Close, AttachFile, Description } from '@mui/icons-material';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';

interface LoadOutDialogProps {
  open: boolean;
  onClose: () => void;
  load: Load;
  onSuccess: () => void;
}

export const LoadOutDialog: React.FC<LoadOutDialogProps> = ({
  open,
  onClose,
  load,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [bolFile, setBolFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if PDF and size
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        setError('PDF size is too large (max 25MB). Please compress it first.');
        return;
      }
      setBolFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!bolFile) {
      setError('Please upload Bill of Lading (BOL) document');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bolUrl = await loadApi.uploadLoadDocument(load.id, bolFile);

      await loadApi.shipperLoadOut(load.id, {
        bolDocument: bolUrl,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete load out');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBolFile(null);
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
          <Typography variant="h6">Load Out - Upload BOL</Typography>
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
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Upload Bill of Lading (BOL) PDF *
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Box
              sx={{
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: bolFile ? 'action.selected' : 'background.default',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {bolFile ? (
                <Box>
                  <Description sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="body2" fontWeight={500}>
                    {bolFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(bolFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBolFile(null);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Box>
                  <AttachFile sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Click to upload BOL PDF
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max size: 25MB (compress if larger)
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {bolFile && bolFile.size > 20 * 1024 * 1024 && (
            <Alert severity="warning">
              <Typography variant="body2" sx={{ mb: 1 }}>
                Large file detected ({((bolFile.size / 1024 / 1024).toFixed(2))} MB). 
                Consider compressing before upload:
              </Typography>
              <Link href="https://www.ilovepdf.com/compress-pdf" target="_blank" rel="noopener">
                Compress PDF Online
              </Link>
            </Alert>
          )}

          <Alert severity="info">
            Upload the Bill of Lading document before leaving the shipper location.
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
          disabled={loading || !bolFile}
          startIcon={loading ? <CircularProgress size={16} /> : <AttachFile />}
        >
          Complete Load Out
        </Button>
      </DialogActions>
    </Dialog>
  );
};
