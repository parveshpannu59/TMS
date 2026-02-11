import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, LinearProgress, Chip,
  IconButton, Paper, Divider, Alert,
} from '@mui/material';
import {
  CloudUpload, Close, Description, InsertDriveFile,
  CheckCircle, Warning, Analytics, ContentCopy,
} from '@mui/icons-material';
import { loadApi } from '../../api/all.api';

interface AnalysisResult {
  documentType: string;
  summary: string;
  extractedFields: Record<string, string>;
  rawText: string;
  confidence: number;
  wordCount?: number;
  pageInfo?: string;
}

interface DocumentAnalyzerProps {
  open: boolean;
  onClose: () => void;
  /** Optional: pre-selected file to analyze */
  file?: File | null;
  /** Callback when analysis is complete with fields */
  onAnalyzed?: (result: AnalysisResult) => void;
}

const FIELD_LABELS: Record<string, { label: string; icon: string }> = {
  loadNumber: { label: 'Load #', icon: '🔢' },
  bolNumber: { label: 'BOL #', icon: '📋' },
  poNumber: { label: 'PO #', icon: '📝' },
  proNumber: { label: 'PRO #', icon: '🏷️' },
  referenceNumber: { label: 'Reference #', icon: '🔖' },
  invoiceNumber: { label: 'Invoice #', icon: '🧾' },
  shipper: { label: 'Shipper', icon: '📦' },
  consignee: { label: 'Consignee', icon: '🏁' },
  from: { label: 'Ship From', icon: '📍' },
  to: { label: 'Ship To', icon: '🎯' },
  carrier: { label: 'Carrier', icon: '🚛' },
  driver: { label: 'Driver', icon: '👤' },
  truckNumber: { label: 'Truck #', icon: '🚚' },
  trailerNumber: { label: 'Trailer #', icon: '📎' },
  weight: { label: 'Weight', icon: '⚖️' },
  pieces: { label: 'Pieces', icon: '📦' },
  commodity: { label: 'Commodity', icon: '📋' },
  pickupDate: { label: 'Pickup Date', icon: '📅' },
  deliveryDate: { label: 'Delivery Date', icon: '📅' },
  amount: { label: 'Amount', icon: '💰' },
  sealNumber: { label: 'Seal #', icon: '🔒' },
  temperature: { label: 'Temperature', icon: '🌡️' },
};

export default function DocumentAnalyzer({ open, onClose, file: preFile, onAnalyzed }: DocumentAnalyzerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(preFile || null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await loadApi.analyzeDocument(selectedFile);
      setResult(res);
      onAnalyzed?.(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to analyze document');
    } finally {
      setAnalyzing(false);
    }
  }, [selectedFile, onAnalyzed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleCopySummary = useCallback(() => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const confidenceColor = (c: number) => c >= 70 ? 'success' : c >= 40 ? 'warning' : 'error';
  const fieldCount = result ? Object.keys(result.extractedFields).length : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Analytics color="primary" />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          Document Intelligence
        </Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        {/* Upload Area */}
        {!result && (
          <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: selectedFile ? 'primary.main' : 'divider',
              borderRadius: 3,
              p: 4,
              textAlign: 'center',
              bgcolor: selectedFile ? 'primary.50' : 'grey.50',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
            }}
            onClick={() => document.getElementById('doc-analyzer-file-input')?.click()}
          >
            <input
              id="doc-analyzer-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {selectedFile ? (
              <Box>
                <InsertDriveFile sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={700}>{selectedFile.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Unknown type'}
                </Typography>
                <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                  Click to change file
                </Typography>
              </Box>
            ) : (
              <Box>
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Drop a document or click to upload
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supports: PDF, JPG, PNG, WEBP • BOL, POD, Invoice, Rate Con, Receipts
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Analyzing Progress */}
        {analyzing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress sx={{ borderRadius: 2, height: 6 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Reading and analyzing document...
            </Typography>
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Results */}
        {result && (
          <Box sx={{ mt: 1 }}>
            {/* Document Type & Confidence */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description color="primary" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    {result.documentType}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={`${result.confidence}% confidence`}
                    color={confidenceColor(result.confidence)}
                    icon={result.confidence >= 70 ? <CheckCircle /> : <Warning />}
                  />
                  {result.pageInfo && (
                    <Chip size="small" label={result.pageInfo} variant="outlined" />
                  )}
                  {result.wordCount && (
                    <Chip size="small" label={`${result.wordCount} words`} variant="outlined" />
                  )}
                </Box>
              </Box>
            </Paper>

            {/* Extracted Fields */}
            {fieldCount > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Extracted Data ({fieldCount} fields found)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  {Object.entries(result.extractedFields).map(([key, value]) => {
                    const meta = FIELD_LABELS[key] || { label: key.replace(/([A-Z])/g, ' $1').trim(), icon: '📄' };
                    return (
                      <Box key={key} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <Typography sx={{ fontSize: 18, mt: -0.3 }}>{meta.icon}</Typography>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                            {meta.label}
                          </Typography>
                          <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
                            {value}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            )}

            {/* Summary */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Summary</Typography>
                <IconButton size="small" onClick={handleCopySummary} title="Copy summary">
                  <ContentCopy sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              {copied && <Typography variant="caption" color="success.main">Copied!</Typography>}
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                {result.summary}
              </Typography>
            </Paper>

            {/* Raw Text Toggle */}
            {result.rawText && (
              <Box>
                <Button
                  size="small"
                  onClick={() => setShowRawText(!showRawText)}
                  sx={{ textTransform: 'none', mb: 1 }}
                >
                  {showRawText ? 'Hide' : 'Show'} Raw Extracted Text
                </Button>
                {showRawText && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, maxHeight: 200, overflow: 'auto', bgcolor: '#f8f9fa' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', color: '#555' }}>
                      {result.rawText}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        {result ? (
          <>
            <Button onClick={() => { setResult(null); setSelectedFile(null); }} color="inherit">
              Analyze Another
            </Button>
            <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2 }}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button
              variant="contained"
              disabled={!selectedFile || analyzing}
              onClick={handleAnalyze}
              startIcon={<Analytics />}
              sx={{ borderRadius: 2 }}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Document'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
