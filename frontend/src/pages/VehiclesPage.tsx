import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Avatar,
  Chip,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  LocalShipping,
  RvHookup,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { vehicleApi, Vehicle, CreateVehicleData } from '@/api/vehicle.api';
import { getApiOrigin } from '@/api/client';
import { useTranslation } from 'react-i18next';
import VehicleDocumentsDialog from '@/components/dialogs/VehicleDocumentsDialog';

type VehicleTypeFilter = 'all' | 'truck' | 'trailer';

const VehiclesPage: React.FC = () => {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleTypeFilter>('all');
  
  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [documentsVehicle, setDocumentsVehicle] = useState<Vehicle | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateVehicleData>({
    vehicleType: 'truck',
    unitNumber: '',
    vehicleName: '',
    registrationNumber: '',
    make: '',
    vehicleModel: '',
    year: new Date().getFullYear(),
    vin: '',
    capacity: '',
    trailerType: '',
    notes: '',
  });
  
  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const params = vehicleTypeFilter !== 'all' ? { vehicleType: vehicleTypeFilter } : {};
      const data = await vehicleApi.getAll(params);
      setVehicles(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  }, [vehicleTypeFilter]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleAddOpen = () => {
    setFormData({
      vehicleType: vehicleTypeFilter === 'all' ? 'truck' : vehicleTypeFilter,
      unitNumber: '',
      vehicleName: '',
      registrationNumber: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      capacity: '',
      trailerType: '',
      notes: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setAddDialogOpen(true);
  };

  const handleEditOpen = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      vehicleType: vehicle.vehicleType,
      unitNumber: vehicle.unitNumber,
      vehicleName: vehicle.vehicleName,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make || '',
      vehicleModel: vehicle.vehicleModel || '',
      year: vehicle.year,
      vin: vehicle.vin,
      capacity: vehicle.capacity || '',
      trailerType: vehicle.trailerType || '',
      notes: vehicle.notes || '',
    });
    setImageFile(null);
    setImagePreview(vehicle.vehicleImage ? `${getApiOrigin()}${vehicle.vehicleImage}` : null);
    setEditDialogOpen(true);
  };

  const handleDeleteOpen = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteConfirmOpen(true);
  };

  const handleDocumentsOpen = (vehicle: Vehicle) => {
    setDocumentsVehicle(vehicle);
    setDocumentsDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      if (editDialogOpen && selectedVehicle) {
        // Update existing vehicle
        const updated = await vehicleApi.update(selectedVehicle._id || selectedVehicle.id!, formData);
        
        // Upload image if new one selected
        if (imageFile) {
          await vehicleApi.uploadImage(updated._id || updated.id!, imageFile);
        }
        
        setSuccess('Vehicle updated successfully');
        setEditDialogOpen(false);
      } else {
        // Create new vehicle
        const created = await vehicleApi.create(formData);
        
        // Upload image if provided
        if (imageFile) {
          await vehicleApi.uploadImage(created._id || created.id!, imageFile);
        }
        
        setSuccess('Vehicle added successfully');
        setAddDialogOpen(false);
      }
      
      fetchVehicles();
    } catch (err: any) {
      setError(err?.message || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!vehicleToDelete) return;
    
    try {
      await vehicleApi.delete(vehicleToDelete._id || vehicleToDelete.id!);
      setSuccess('Vehicle deleted successfully');
      setDeleteConfirmOpen(false);
      setVehicleToDelete(null);
      fetchVehicles();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete vehicle');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'vehicleImage',
      headerName: 'Image',
      width: 80,
      renderCell: (params) => (
        <Avatar
          src={params.value ? `${getApiOrigin()}${params.value}` : undefined}
          sx={{ width: 48, height: 48 }}
        >
          {params.row.vehicleType === 'truck' ? <LocalShipping /> : <RvHookup />}
        </Avatar>
      ),
    },
    { field: 'vehicleType', headerName: 'Type', width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value === 'truck' ? 'Truck' : 'Trailer'}
          size="small"
          color={params.value === 'truck' ? 'primary' : 'secondary'}
        />
      ),
    },
    { field: 'vehicleName', headerName: 'Name', width: 180 },
    { field: 'registrationNumber', headerName: 'Reg No', width: 130 },
    { field: 'unitNumber', headerName: 'Unit No', width: 100 },
    { field: 'make', headerName: 'Make', width: 120 },
    { field: 'model', headerName: 'Model', width: 120 },
    { field: 'capacity', headerName: 'Capacity', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
          available: 'success',
          assigned: 'warning',
          on_road: 'info',
          out_for_delivery: 'info',
          in_maintenance: 'error',
          out_of_service: 'default',
        };
        return (
          <Chip
            label={params.value.replace('_', ' ')}
            size="small"
            color={statusColors[params.value] || 'default'}
          />
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 140,
      getActions: (params) => [
        <GridActionsCellItem
          key="docs"
          icon={<ViewIcon color="primary" />}
          label="View Documents"
          onClick={() => handleDocumentsOpen(params.row)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEditOpen(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDeleteOpen(params.row)}
        />,
      ],
    },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Vehicles
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddOpen}
          >
            Add Vehicle
          </Button>
        </Box>

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

        <Card sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Filter by Type:
            </Typography>
            <ToggleButtonGroup
              value={vehicleTypeFilter}
              exclusive
              onChange={(_, value) => value && setVehicleTypeFilter(value)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="truck">Trucks</ToggleButton>
              <ToggleButton value="trailer">Trailers</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Card>

        <Card>
          <DataGrid
            rows={vehicles}
            columns={columns}
            loading={loading}
            getRowId={(row) => row._id || row.id}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            disableRowSelectionOnClick
          />
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog
          open={addDialogOpen || editDialogOpen}
          onClose={() => {
            setAddDialogOpen(false);
            setEditDialogOpen(false);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editDialogOpen ? 'Edit Vehicle' : 'Add New Vehicle'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Vehicle Image */}
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />
                  <Avatar
                    src={imagePreview || undefined}
                    sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                  >
                    {formData.vehicleType === 'truck' ? <LocalShipping sx={{ fontSize: 60 }} /> : <RvHookup sx={{ fontSize: 60 }} />}
                  </Avatar>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Upload Vehicle Image
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Max 5MB • JPG, PNG
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Vehicle Type</InputLabel>
                  <Select
                    value={formData.vehicleType}
                    label="Vehicle Type"
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as 'truck' | 'trailer' })}
                  >
                    <MenuItem value="truck">Truck</MenuItem>
                    <MenuItem value="trailer">Trailer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Vehicle Name"
                  value={formData.vehicleName}
                  onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Unit Number"
                  value={formData.unitNumber}
                  onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Registration Number"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="VIN"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Model"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Capacity"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  fullWidth
                  placeholder="e.g., 2500 Kg"
                />
              </Grid>

              {formData.vehicleType === 'trailer' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Trailer Type</InputLabel>
                    <Select
                      value={formData.trailerType}
                      label="Trailer Type"
                      onChange={(e) => setFormData({ ...formData, trailerType: e.target.value })}
                    >
                      <MenuItem value="dry_van">Dry Van</MenuItem>
                      <MenuItem value="reefer">Reefer</MenuItem>
                      <MenuItem value="flatbed">Flatbed</MenuItem>
                      <MenuItem value="step_deck">Step Deck</MenuItem>
                      <MenuItem value="lowboy">Lowboy</MenuItem>
                      <MenuItem value="tanker">Tanker</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setAddDialogOpen(false); setEditDialogOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained">
              {editDialogOpen ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {vehicleToDelete?.vehicleName}?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Vehicle Documents Dialog */}
        <VehicleDocumentsDialog
          open={documentsDialogOpen}
          onClose={() => {
            setDocumentsDialogOpen(false);
            setDocumentsVehicle(null);
          }}
          vehicle={documentsVehicle}
        />
      </Box>
    </DashboardLayout>
  );
};

export default VehiclesPage;
