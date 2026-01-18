import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  LocalShipping,
  Input,
  Output,
  Assignment,
  CloudUpload,
  PhotoCamera,
  PictureAsPdf,
} from '@mui/icons-material';
import { loadApi } from '../../api/load.api';

interface TripWorkflowProps {
  loadId: string;
  loadNumber: string;
  currentStatus: string;
  onStatusUpdate?: () => void;
}

const TripWorkflow: React.FC<TripWorkflowProps> = ({
  loadId,
  loadNumber,
  currentStatus,
  onStatusUpdate,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Start Trip fields
  const [startingMileage, setStartingMileage] = useState('');
  const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
  const [odometerPhotoPreview, setOdometerPhotoPreview] = useState<string | null>(null);

  // Shipper Check-in fields
  const [shipperCheckInTime, setShipperCheckInTime] = useState('');

  // Load In fields
  const [poNumber, setPoNumber] = useState('');
  const [loadNumberField, setLoadNumberField] = useState(loadNumber);
  const [referenceNumber, setReferenceNumber] = useState('');

  // Load Out fields
  const [bolDocument, setBolDocument] = useState<File | null>(null);
  const [bolFileName, setBolFileName] = useState('');

  // Receiver Check-in fields
  const [receiverCheckInTime, setReceiverCheckInTime] = useState('');

  // Offload fields
  const [podDocument, setPodDocument] = useState<File | null>(null);
  const [podFileName, setPodFileName] = useState('');
  const [receiverNotes, setReceiverNotes] = useState('');

  // End Trip fields
  const [endingMileage, setEndingMileage] = useState('');

  useEffect(() => {
    // Determine active step based on current status
    const statusStepMap: Record<string, number> = {
      assigned: 0,
      trip_accepted: 0,
      trip_started: 1,
      arrived_shipper: 2,
      loading: 3,
      departed_shipper: 4,
      in_transit: 4,
      arrived_receiver: 5,
      unloading: 6,
      delivered: 7,
      completed: 7,
    };
    setActiveStep(statusStepMap[currentStatus] || 0);
  }, [currentStatus]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
    fileNameSetter?: (name: string) => void,
    previewSetter?: (preview: string | null) => void
  ) => {
    const file = event.target.files?.[0] || null;
    setter(file);
    if (fileNameSetter && file) {
      fileNameSetter(file.name);
    }
    if (previewSetter && file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        previewSetter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    // In production, upload to cloud storage (S3, Cloudinary, etc.)
    // For now, convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleStartTrip = async () => {
    if (!startingMileage || !odometerPhoto) {
      setError('Please enter starting mileage and upload odometer photo');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const photoUrl = await uploadFile(odometerPhoto);

      await loadApi.startTrip(loadId, {
        startingMileage: Number(startingMileage),
        startingPhoto: photoUrl,
      });

      setSuccess('Trip started successfully!');
      setActiveStep(1);
      onStatusUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const handleShipperCheckIn = async () => {
    try {
      setLoading(true);
      setError(null);

      await loadApi.shipperCheckIn(loadId, {
        arrivedAt: shipperCheckInTime || new Date().toISOString(),
      });

      setSuccess('Checked in at shipper!');
      setActiveStep(2);
      onStatusUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadIn = async () => {
    if (!poNumber || !loadNumberField || !referenceNumber) {
      setError('Please fill in PO Number, Load Number, and Reference Number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await loadApi.shipperLoadIn(loadId, {
        poNumber,
        loadNumber: loadNumberField,
        referenceNumber,
      });

      setSuccess('Load In confirmed!');
      setActiveStep(3);
      onStatusUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm load in');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadOut = async () => {
    if (!bolDocument) {
      setError('Please upload Bill of Lading (BOL) document');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bolUrl = await uploadFile(bolDocument);

      await loadApi.shipperLoadOut(loadId, {
        bolDocument: bolUrl,
      });

      setSuccess('Load Out confirmed! BOL uploaded.');
      setActiveStep(4);
      onStatusUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm load out');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiverCheckIn = async () => {
    try {
      setLoading(true);
      setError(null);

      await loadApi.receiverCheckIn(loadId, {
        arrivedAt: receiverCheckInTime || new Date().toISOString(),
      });

      setSuccess('Checked in at receiver!');
      setActiveStep(5);
      onStatusUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to check in at receiver');
    } finally {
      setLoading(false);
    }
  };

  const handleOffload = async () => {
    if (!podDocument) {
      setError('Please upload Proof of Delivery (POD)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const podUrl = await uploadFile(podDocument);

      await loadApi.receiverOffload(loadId, {
        podDocument: podUrl,
        notes: receiverNotes,
      });

      setSuccess('Offload confirmed! POD uploaded.');
      setActiveStep(6);
      onStatusUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm offload');
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    if (!endingMileage) {
      setError('Please enter ending mileage');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await loadApi.endTrip(loadId, {
        endingMileage: Number(endingMileage),
      });

      setSuccess('Trip completed successfully!');
      setActiveStep(7);
      onStatusUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to end trip');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      label: 'Start Trip',
      description: 'Upload odometer reading and start your journey',
      icon: <PlayArrow />,
      content: (
        <Box>
          <TextField
            label="Starting Mileage"
            type="number"
            value={startingMileage}
            onChange={(e) => setStartingMileage(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<PhotoCamera />}
            fullWidth
            sx={{ mb: 2 }}
          >
            Upload Odometer/Speedometer Photo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) =>
                handleFileChange(e, setOdometerPhoto, undefined, setOdometerPhotoPreview)
              }
            />
          </Button>
          {odometerPhotoPreview && (
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <img
                src={odometerPhotoPreview}
                alt="Odometer preview"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
              />
            </Box>
          )}
          {odometerPhoto && (
            <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
              ✓ {odometerPhoto.name}
            </Typography>
          )}
          <Button
            variant="contained"
            onClick={handleStartTrip}
            disabled={loading || !startingMileage || !odometerPhoto}
            fullWidth
            startIcon={<PlayArrow />}
          >
            {loading ? <CircularProgress size={24} /> : 'Start Trip'}
          </Button>
        </Box>
      ),
    },
    {
      label: 'Shipper Check-in',
      description: 'Confirm arrival at shipper location',
      icon: <CheckCircle />,
      content: (
        <Box>
          <TextField
            label="Check-in Time"
            type="datetime-local"
            value={shipperCheckInTime}
            onChange={(e) => setShipperCheckInTime(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            onClick={handleShipperCheckIn}
            disabled={loading}
            fullWidth
            startIcon={<CheckCircle />}
          >
            {loading ? <CircularProgress size={24} /> : 'Check In at Shipper'}
          </Button>
        </Box>
      ),
    },
    {
      label: 'Load In',
      description: 'Fill shipper details and confirm load arrival',
      icon: <Input />,
      content: (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="PO Number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Load Number"
                value={loadNumberField}
                onChange={(e) => setLoadNumberField(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Reference Number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                fullWidth
                required
              />
            </Grid>
          </Grid>
          <Button
            variant="contained"
            onClick={handleLoadIn}
            disabled={loading || !poNumber || !loadNumberField || !referenceNumber}
            fullWidth
            sx={{ mt: 2 }}
            startIcon={<Input />}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirm Load In'}
          </Button>
        </Box>
      ),
    },
    {
      label: 'Load Out',
      description: 'Upload BOL and confirm departure from shipper',
      icon: <Output />,
      content: (
        <Box>
          <Button
            variant="outlined"
            component="label"
            startIcon={<PictureAsPdf />}
            fullWidth
            sx={{ mb: 2 }}
          >
            Upload Bill of Lading (BOL) PDF
            <input
              type="file"
              hidden
              accept="application/pdf,image/*"
              onChange={(e) => handleFileChange(e, setBolDocument, setBolFileName)}
            />
          </Button>
          {bolFileName && (
            <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
              ✓ {bolFileName}
            </Typography>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            Tip: If BOL is large, use an online PDF compressor first
          </Alert>
          <Button
            variant="contained"
            onClick={handleLoadOut}
            disabled={loading || !bolDocument}
            fullWidth
            startIcon={<Output />}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirm Load Out'}
          </Button>
        </Box>
      ),
    },
    {
      label: 'In Transit',
      description: 'Load is on the way to receiver',
      icon: <LocalShipping />,
      content: (
        <Box textAlign="center" py={3}>
          <LocalShipping sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Load In Transit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Drive safely to the receiver location
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Receiver Check-in',
      description: 'Confirm arrival at receiver location',
      icon: <CheckCircle />,
      content: (
        <Box>
          <TextField
            label="Check-in Time"
            type="datetime-local"
            value={receiverCheckInTime}
            onChange={(e) => setReceiverCheckInTime(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            onClick={handleReceiverCheckIn}
            disabled={loading}
            fullWidth
            startIcon={<CheckCircle />}
          >
            {loading ? <CircularProgress size={24} /> : 'Check In at Receiver'}
          </Button>
        </Box>
      ),
    },
    {
      label: 'Offload',
      description: 'Upload proof of delivery and confirm unloading',
      icon: <Assignment />,
      content: (
        <Box>
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUpload />}
            fullWidth
            sx={{ mb: 2 }}
          >
            Upload Proof of Delivery (POD)
            <input
              type="file"
              hidden
              accept="application/pdf,image/*"
              onChange={(e) => handleFileChange(e, setPodDocument, setPodFileName)}
            />
          </Button>
          {podFileName && (
            <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
              ✓ {podFileName}
            </Typography>
          )}
          <TextField
            label="Receiver Notes (Optional)"
            value={receiverNotes}
            onChange={(e) => setReceiverNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleOffload}
            disabled={loading || !podDocument}
            fullWidth
            startIcon={<Assignment />}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirm Offload'}
          </Button>
        </Box>
      ),
    },
    {
      label: 'End Trip',
      description: 'Complete the trip and submit final mileage',
      icon: <CheckCircle />,
      content: (
        <Box>
          <TextField
            label="Ending Mileage"
            type="number"
            value={endingMileage}
            onChange={(e) => setEndingMileage(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
          />
          <Button
            variant="contained"
            color="success"
            onClick={handleEndTrip}
            disabled={loading || !endingMileage}
            fullWidth
            startIcon={<CheckCircle />}
          >
            {loading ? <CircularProgress size={24} /> : 'Complete Trip'}
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Trip Workflow - {loadNumber}
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  index === activeStep ? (
                    <Typography variant="caption">{step.description}</Typography>
                  ) : null
                }
                StepIconComponent={() => step.icon}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                {step.content}
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Trip Completed!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Great job! All trip stages completed successfully.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TripWorkflow;
