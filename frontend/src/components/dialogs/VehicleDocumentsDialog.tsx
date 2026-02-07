import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Button,
  Chip,
  Card,
  CardContent,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Description as DocIcon,
  History as HistoryIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import {
  vehicleApi,
  Vehicle,
  VehicleDocumentData,
  VehicleDocumentType,
  DocumentStatus,
} from '@/api/vehicle.api';
import { getApiOrigin } from '@/api/client';

interface VehicleDocumentsDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

const DOC_TYPE_LABELS: Record<VehicleDocumentType, string> = {
  registration: 'Registration',
  inspection: 'Inspection',
  title: 'Title',
};

const DOC_TYPE_DESCRIPTIONS: Record<VehicleDocumentType, string> = {
  registration: 'Vehicle registration / Cab card / Plate renewal receipt',
  inspection: 'Annual or quarterly safety inspection report',
  title: 'Certificate of title for the vehicle',
};

const STATUS_CONFIG: Record<DocumentStatus, { color: 'success' | 'error' | 'warning' | 'default'; icon: React.ReactElement; label: string }> = {
  active: { color: 'success', icon: <CheckIcon fontSize="small" />, label: 'Active' },
  expired: { color: 'error', icon: <ErrorIcon fontSize="small" />, label: 'Expired' },
  expiring_soon: { color: 'warning', icon: <WarningIcon fontSize="small" />, label: 'Expiring Soon' },
  archived: { color: 'default', icon: <HistoryIcon fontSize="small" />, label: 'Archived' },
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getDaysUntilExpiry = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const VehicleDocumentsDialog: React.FC<VehicleDocumentsDialogProps> = ({
  open,
  onClose,
  vehicle,
}) => {
  const [tabValue, setTabValue] = useState(0); // 0=documents, 1=history
  const [documents, setDocuments] = useState<VehicleDocumentData[]>([]);
  const [history, setHistory] = useState<VehicleDocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload form state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<VehicleDocumentType>('registration');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadIssuedDate, setUploadIssuedDate] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState('');

  // History filter
  const [historyDocTypeFilter, setHistoryDocTypeFilter] = useState<VehicleDocumentType | 'all'>('all');

  const vehicleId = vehicle?._id || vehicle?.id;

  const fetchDocuments = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      const docs = await vehicleApi.getDocuments(vehicleId);
      setDocuments(docs);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const fetchHistory = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      const docType = historyDocTypeFilter === 'all' ? undefined : historyDocTypeFilter;
      const hist = await vehicleApi.getDocumentHistory(vehicleId, docType);
      setHistory(hist);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [vehicleId, historyDocTypeFilter]);

  useEffect(() => {
    if (open && vehicleId) {
      fetchDocuments();
      setTabValue(0);
      setError(null);
      setSuccess(null);
      setPreviewUrl(null);
    }
  }, [open, vehicleId, fetchDocuments]);

  useEffect(() => {
    if (tabValue === 1 && vehicleId) {
      fetchHistory();
    }
  }, [tabValue, vehicleId, fetchHistory]);

  const handleOpenUpload = (docType: VehicleDocumentType) => {
    setUploadDocType(docType);
    setUploadFile(null);
    setUploadExpiryDate('');
    setUploadIssuedDate('');
    setUploadNotes('');
    setUploadOpen(true);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setError('File size must be less than 25MB');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!vehicleId || !uploadFile || !uploadExpiryDate) {
      setError('Please select a file and enter an expiry date');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await vehicleApi.uploadVehicleDoc(
        vehicleId,
        uploadFile,
        uploadDocType,
        uploadExpiryDate,
        uploadIssuedDate || undefined,
        uploadNotes || undefined
      );
      setSuccess(`${DOC_TYPE_LABELS[uploadDocType]} document uploaded successfully`);
      setUploadOpen(false);
      fetchDocuments();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (doc: VehicleDocumentData) => {
    if (!vehicleId) return;
    if (!window.confirm(`Delete ${DOC_TYPE_LABELS[doc.documentType]} v${doc.version}?`)) return;

    try {
      await vehicleApi.deleteVehicleDoc(vehicleId, doc._id);
      setSuccess('Document deleted successfully');
      fetchDocuments();
      if (tabValue === 1) fetchHistory();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete document');
    }
  };

  const handlePreview = (doc: VehicleDocumentData) => {
    const url = `${getApiOrigin()}${doc.filePath}`;
    setPreviewUrl(url);
    setPreviewDocName(`${DOC_TYPE_LABELS[doc.documentType]} - v${doc.version} (${doc.fileName})`);
  };

  const handleDownload = (doc: VehicleDocumentData) => {
    const url = `${getApiOrigin()}${doc.filePath}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDocForType = (type: VehicleDocumentType): VehicleDocumentData | undefined => {
    return documents.find((d) => d.documentType === type && d.isLatest);
  };

  // ── PDF Preview View ──
  if (previewUrl) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
          <IconButton onClick={() => setPreviewUrl(null)} size="small">
            <BackIcon />
          </IconButton>
          <PdfIcon color="error" />
          <Typography variant="subtitle1" sx={{ flex: 1 }} noWrap>
            {previewDocName}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <iframe
            src={previewUrl}
            title="Document Preview"
            style={{
              width: '100%',
              flex: 1,
              border: 'none',
              minHeight: '70vh',
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // ── Upload Form View ──
  if (uploadOpen) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
          <IconButton onClick={() => setUploadOpen(false)} size="small">
            <BackIcon />
          </IconButton>
          <UploadIcon color="primary" />
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            Upload {DOC_TYPE_LABELS[uploadDocType]}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {DOC_TYPE_DESCRIPTIONS[uploadDocType]}
          </Typography>

          <Stack spacing={3}>
            {/* File Input */}
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                sx={{ py: 2, borderStyle: 'dashed' }}
              >
                {uploadFile ? uploadFile.name : 'Select PDF or Image File'}
              </Button>
              {uploadFile && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {formatFileSize(uploadFile.size)} - {uploadFile.type}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Max 25MB - PDF, JPG, PNG, WebP
              </Typography>
            </Box>

            {/* Expiry Date */}
            <TextField
              label="Expiry Date"
              type="date"
              value={uploadExpiryDate}
              onChange={(e) => setUploadExpiryDate(e.target.value)}
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="When does this document expire?"
            />

            {/* Issued Date */}
            <TextField
              label="Issued Date (Optional)"
              type="date"
              value={uploadIssuedDate}
              onChange={(e) => setUploadIssuedDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {/* Notes */}
            <TextField
              label="Notes (Optional)"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Any additional notes about this document..."
            />

            {/* Submit Button */}
            <Button
              variant="contained"
              onClick={handleUploadSubmit}
              disabled={!uploadFile || !uploadExpiryDate || uploading}
              size="large"
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Main Dialog View ──
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { minHeight: '60vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DocIcon color="primary" />
          <Box>
            <Typography variant="h6" component="span">
              Vehicle Documents
            </Typography>
            {vehicle && (
              <Typography variant="body2" color="text.secondary">
                {vehicle.vehicleName} - {vehicle.vehicleType === 'truck' ? 'Truck' : 'Trailer'} ({vehicle.vin})
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Current Documents" icon={<DocIcon />} iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab label="History" icon={<HistoryIcon />} iconPosition="start" sx={{ minHeight: 48 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2 }}>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* ── Tab 0: Current Documents ── */}
        {tabValue === 0 && (
          <Grid container spacing={2}>
            {(['registration', 'inspection', 'title'] as VehicleDocumentType[]).map((docType) => {
              const doc = getDocForType(docType);
              const daysLeft = doc ? getDaysUntilExpiry(doc.expiryDate) : null;
              const statusCfg = doc ? STATUS_CONFIG[doc.status] : null;

              return (
                <Grid item xs={12} key={docType}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: doc
                        ? doc.status === 'expired'
                          ? 'error.main'
                          : doc.status === 'expiring_soon'
                          ? 'warning.main'
                          : 'divider'
                        : 'divider',
                      borderWidth: doc && doc.status !== 'active' ? 2 : 1,
                    }}
                  >
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <PdfIcon
                            sx={{
                              fontSize: 40,
                              color: doc ? (doc.status === 'expired' ? 'error.main' : 'primary.main') : 'text.disabled',
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {DOC_TYPE_LABELS[docType]}
                              </Typography>
                              {doc && statusCfg && (
                                <Chip
                                  icon={statusCfg.icon}
                                  label={statusCfg.label}
                                  size="small"
                                  color={statusCfg.color}
                                  variant="outlined"
                                />
                              )}
                              {doc && doc.version > 1 && (
                                <Chip label={`v${doc.version}`} size="small" variant="outlined" />
                              )}
                            </Box>

                            {doc ? (
                              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>File:</strong> {doc.fileName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Size:</strong> {formatFileSize(doc.fileSize)}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color={
                                    daysLeft !== null && daysLeft < 0
                                      ? 'error.main'
                                      : daysLeft !== null && daysLeft <= 30
                                      ? 'warning.main'
                                      : 'text.secondary'
                                  }
                                  fontWeight={daysLeft !== null && daysLeft <= 30 ? 600 : 400}
                                >
                                  <strong>Expires:</strong> {formatDate(doc.expiryDate)}
                                  {daysLeft !== null && (
                                    <>
                                      {' '}
                                      ({daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : `${daysLeft} days left`})
                                    </>
                                  )}
                                </Typography>
                                {doc.issuedDate && (
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Issued:</strong> {formatDate(doc.issuedDate)}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                No document uploaded yet
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                          {doc && (
                            <>
                              <Tooltip title="Preview Document">
                                <IconButton color="primary" onClick={() => handlePreview(doc)} size="small">
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download">
                                <IconButton color="primary" onClick={() => handleDownload(doc)} size="small">
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton color="error" onClick={() => handleDeleteDoc(doc)} size="small">
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title={doc ? 'Re-upload (New Version)' : 'Upload Document'}>
                            <Button
                              variant={doc ? 'outlined' : 'contained'}
                              size="small"
                              startIcon={doc ? <RefreshIcon /> : <UploadIcon />}
                              onClick={() => handleOpenUpload(docType)}
                              color={doc?.status === 'expired' ? 'error' : doc?.status === 'expiring_soon' ? 'warning' : 'primary'}
                            >
                              {doc ? (doc.status === 'expired' || doc.status === 'expiring_soon' ? 'Renew' : 'Re-upload') : 'Upload'}
                            </Button>
                          </Tooltip>
                        </Box>
                      </Box>

                      {doc?.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                          Note: {doc.notes}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* ── Tab 1: History ── */}
        {tabValue === 1 && (
          <Box>
            {/* Filter */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {(['all', 'registration', 'inspection', 'title'] as const).map((type) => (
                <Chip
                  key={type}
                  label={type === 'all' ? 'All Types' : DOC_TYPE_LABELS[type]}
                  variant={historyDocTypeFilter === type ? 'filled' : 'outlined'}
                  color={historyDocTypeFilter === type ? 'primary' : 'default'}
                  onClick={() => setHistoryDocTypeFilter(type)}
                  size="small"
                />
              ))}
            </Box>

            {history.length === 0 && !loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <HistoryIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No Document History
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload documents from the "Current Documents" tab to build history.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>File Name</TableCell>
                      <TableCell>Expiry Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Uploaded</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((doc) => {
                      const statusCfg = STATUS_CONFIG[doc.status];
                      return (
                        <TableRow
                          key={doc._id}
                          sx={{
                            bgcolor: doc.isLatest ? 'action.selected' : 'transparent',
                            opacity: doc.status === 'archived' ? 0.7 : 1,
                          }}
                        >
                          <TableCell>
                            <Chip
                              label={DOC_TYPE_LABELS[doc.documentType]}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              v{doc.version}
                              {doc.isLatest && (
                                <Chip label="Latest" size="small" color="primary" variant="filled" sx={{ height: 20 }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                              {doc.fileName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color={doc.status === 'expired' ? 'error.main' : 'text.primary'}>
                              {formatDate(doc.expiryDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={statusCfg.icon}
                              label={statusCfg.label}
                              size="small"
                              color={statusCfg.color}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(doc.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatFileSize(doc.fileSize)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Tooltip title="Preview">
                                <IconButton size="small" onClick={() => handlePreview(doc)}>
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download">
                                <IconButton size="small" onClick={() => handleDownload(doc)}>
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDocumentsDialog;
