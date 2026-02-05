import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Tab,
  Tabs,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Build,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Warning,
  Schedule,
  DirectionsCar,
  AttachMoney,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { useTranslation } from 'react-i18next';

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: 'truck' | 'trailer';
  maintenanceType: string;
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue';
  cost?: number;
  vendor?: string;
  mileage?: number;
  notes?: string;
}

const MaintenancePage: React.FC = () => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockData: MaintenanceRecord[] = [
      {
        id: '1',
        vehicleId: 'v1',
        vehicleName: 'Freightliner #101',
        vehicleType: 'truck',
        maintenanceType: 'Oil Change',
        description: 'Regular oil change service',
        scheduledDate: new Date('2026-02-05'),
        status: 'scheduled',
        cost: 250,
        vendor: 'Quick Service',
        mileage: 75000,
      },
      {
        id: '2',
        vehicleId: 'v2',
        vehicleName: 'Kenworth #205',
        vehicleType: 'truck',
        maintenanceType: 'Tire Replacement',
        description: 'Replace front tires',
        scheduledDate: new Date('2026-01-28'),
        completedDate: new Date('2026-01-29'),
        status: 'completed',
        cost: 1200,
        vendor: 'Tire Pro',
        mileage: 82000,
      },
      {
        id: '3',
        vehicleId: 'v3',
        vehicleName: 'Trailer #T-45',
        vehicleType: 'trailer',
        maintenanceType: 'Brake Inspection',
        description: 'Annual brake system inspection',
        scheduledDate: new Date('2026-01-30'),
        status: 'overdue',
        vendor: 'Safety First',
      },
      {
        id: '4',
        vehicleId: 'v4',
        vehicleName: 'Volvo #312',
        vehicleType: 'truck',
        maintenanceType: 'Engine Diagnostic',
        description: 'Check engine light diagnostics',
        scheduledDate: new Date('2026-02-01'),
        status: 'in-progress',
        cost: 450,
        vendor: 'Diesel Doctor',
        mileage: 95000,
      },
    ];
    setMaintenanceRecords(mockData);
  }, []);

  const stats = {
    scheduled: maintenanceRecords.filter(r => r.status === 'scheduled').length,
    inProgress: maintenanceRecords.filter(r => r.status === 'in-progress').length,
    overdue: maintenanceRecords.filter(r => r.status === 'overdue').length,
    completed: maintenanceRecords.filter(r => r.status === 'completed').length,
    totalCost: maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
  };

  const filteredRecords = maintenanceRecords.filter(record => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return record.status === 'scheduled';
    if (tabValue === 2) return record.status === 'in-progress';
    if (tabValue === 3) return record.status === 'overdue';
    if (tabValue === 4) return record.status === 'completed';
    return true;
  });

  const columns: GridColDef[] = [
    {
      field: 'vehicleName',
      headerName: 'Vehicle',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsCar fontSize="small" />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'vehicleType',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'truck' ? 'primary' : 'secondary'}
        />
      ),
    },
    {
      field: 'maintenanceType',
      headerName: 'Service Type',
      width: 150,
    },
    {
      field: 'scheduledDate',
      headerName: 'Scheduled',
      width: 120,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const colors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
          scheduled: 'info',
          'in-progress': 'warning',
          completed: 'success',
          overdue: 'error',
        };
        return (
          <Chip
            label={params.value.replace('-', ' ')}
            size="small"
            color={colors[params.value]}
          />
        );
      },
    },
    {
      field: 'cost',
      headerName: 'Cost',
      width: 100,
      renderCell: (params) => params.value ? `$${params.value}` : '-',
    },
    {
      field: 'vendor',
      headerName: 'Vendor',
      width: 140,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleEdit(params.row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => handleDelete(params.row.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this maintenance record?')) {
      setMaintenanceRecords(prev => prev.filter(r => r.id !== id));
      setSuccess('Maintenance record deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleOpenDialog = () => {
    setEditingRecord(null);
    setOpenDialog(true);
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              <Build sx={{ mr: 1, verticalAlign: 'middle' }} />
              Vehicle Maintenance
            </Typography>
            <Typography color="text.secondary">
              Track and manage vehicle maintenance schedules
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>
            Schedule Maintenance
          </Button>
        </Box>

        {/* Alerts */}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Schedule sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Scheduled
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.scheduled}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Build sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.inProgress}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Warning sx={{ mr: 1, color: 'error.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.overdue}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stats.completed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoney sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Cost
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  ${stats.totalCost.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card>
          <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label={`All (${maintenanceRecords.length})`} />
            <Tab label={`Scheduled (${stats.scheduled})`} />
            <Tab label={`In Progress (${stats.inProgress})`} />
            <Tab label={`Overdue (${stats.overdue})`} />
            <Tab label={`Completed (${stats.completed})`} />
          </Tabs>

          {/* Data Grid */}
          <Box sx={{ height: 500 }}>
            <DataGrid
              rows={filteredRecords}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              sx={{ border: 'none' }}
            />
          </Box>
        </Card>

        {/* Dialog for Add/Edit */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingRecord ? 'Edit Maintenance Record' : 'Schedule Maintenance'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Vehicle"
                select
                fullWidth
                defaultValue=""
              >
                <MenuItem value="v1">Freightliner #101</MenuItem>
                <MenuItem value="v2">Kenworth #205</MenuItem>
                <MenuItem value="v3">Trailer #T-45</MenuItem>
                <MenuItem value="v4">Volvo #312</MenuItem>
              </TextField>
              <TextField
                label="Maintenance Type"
                select
                fullWidth
                defaultValue=""
              >
                <MenuItem value="oil">Oil Change</MenuItem>
                <MenuItem value="tire">Tire Replacement</MenuItem>
                <MenuItem value="brake">Brake Service</MenuItem>
                <MenuItem value="engine">Engine Repair</MenuItem>
                <MenuItem value="inspection">Inspection</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
              <TextField label="Description" fullWidth multiline rows={2} />
              <TextField
                label="Scheduled Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField label="Estimated Cost ($)" type="number" fullWidth />
              <TextField label="Vendor/Service Provider" fullWidth />
              <TextField label="Current Mileage" type="number" fullWidth />
              <TextField label="Notes" fullWidth multiline rows={3} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => {
              setSuccess('Maintenance record saved successfully!');
              setOpenDialog(false);
              setTimeout(() => setSuccess(null), 3000);
            }}>
              {editingRecord ? 'Update' : 'Schedule'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default MaintenancePage;
