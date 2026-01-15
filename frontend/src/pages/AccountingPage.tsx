import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  AccountBalance,
  TrendingUp,
  MonetizationOn,
  Receipt,
  AttachMoney,
  PendingActions,
  CheckCircle,
  Description,
} from '@mui/icons-material';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { loadApi, Load } from '@/api/load.api';
import { useAuth } from '@hooks/useAuth';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

interface AccountingSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalDriverPay: number;
  netProfit: number;
  invoicesPaid: number;
  invoicesPending: number;
  invoicesSubmitted: number;
}

const AccountingPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dateFilter, setDateFilter] = useState('this_month');
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const theme = useTheme();

  const [summary, setSummary] = useState<AccountingSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalDriverPay: 0,
    netProfit: 0,
    invoicesPaid: 0,
    invoicesPending: 0,
    invoicesSubmitted: 0,
  });

  const fetchLoads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadApi.getLoads();
      setLoads(data.loads);
      
      // Calculate summary
      const completedLoads = data.loads.filter(l => l.status === 'completed' || l.status === 'delivered');
      const totalRevenue = completedLoads.reduce((sum, load) => sum + load.rate, 0);
      const totalDriverPay = completedLoads.reduce((sum, load) => sum + (load.driverRate || 0), 0);
      const totalExpenses = totalDriverPay * 0.2; // Estimated 20% additional expenses
      const netProfit = totalRevenue - totalExpenses - totalDriverPay;
      
      setSummary({
        totalRevenue,
        totalExpenses,
        totalDriverPay,
        netProfit,
        invoicesPaid: completedLoads.filter(l => l.status === 'completed').length,
        invoicesPending: data.loads.filter(l => l.status === 'delivered').length,
        invoicesSubmitted: completedLoads.length,
      });
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch accounting data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  const summaryCards = [
    {
      title: 'Total Trip Revenue',
      value: `$${summary.totalRevenue.toLocaleString()}`,
      icon: <MonetizationOn />,
      color: theme.palette.primary.main,
      subtitle: `${summary.invoicesSubmitted} trips`,
    },
    {
      title: 'Total Trip Expenses',
      value: `$${summary.totalExpenses.toLocaleString()}`,
      icon: <Receipt />,
      color: theme.palette.error.main,
      subtitle: 'Fuel, tolls, fees',
    },
    {
      title: 'Total Driver Pay',
      value: `$${summary.totalDriverPay.toLocaleString()}`,
      icon: <AttachMoney />,
      color: theme.palette.warning.main,
      subtitle: `${summary.invoicesPaid} drivers paid`,
    },
    {
      title: 'Net Profit',
      value: `$${summary.netProfit.toLocaleString()}`,
      icon: <TrendingUp />,
      color: summary.netProfit >= 0 ? theme.palette.success.main : theme.palette.error.main,
      subtitle: `${((summary.netProfit / summary.totalRevenue) * 100 || 0).toFixed(1)}% margin`,
    },
  ];

  const tripsColumns: GridColDef[] = [
    {
      field: 'loadNumber',
      headerName: 'Trip ID',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600} color="primary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'driverId',
      headerName: 'Driver',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params) => params.value?.name || 'Unassigned',
    },
    {
      field: 'broker',
      headerName: 'Broker',
      flex: 1.2,
      minWidth: 130,
    },
    {
      field: 'origin',
      headerName: 'Origin',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => `${params.value.city}, ${params.value.state}`,
    },
    {
      field: 'destination',
      headerName: 'Destination',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => `${params.value.city}, ${params.value.state}`,
    },
    {
      field: 'rate',
      headerName: 'Revenue',
      flex: 0.9,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600} color="success.main">
          ${params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'driverRate',
      headerName: 'Driver Pay',
      flex: 0.9,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2">
          ${(params.value || 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'profit',
      headerName: 'Profit',
      flex: 0.9,
      minWidth: 100,
      renderCell: (params) => {
        const profit = params.row.rate - (params.row.driverRate || 0) - (params.row.rate * 0.2);
        return (
          <Typography 
            variant="body2" 
            fontWeight={600}
            color={profit >= 0 ? 'success.main' : 'error.main'}
          >
            ${profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Invoice Status',
      flex: 1.1,
      minWidth: 120,
      renderCell: (params) => {
        const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'info' | 'default' }> = {
          completed: { label: 'Paid', color: 'success' },
          delivered: { label: 'Pending', color: 'warning' },
          in_transit: { label: 'In Transit', color: 'info' },
          booked: { label: 'Booked', color: 'default' },
        };
        const status = statusMap[params.value] || { label: params.value, color: 'default' };
        return <Chip label={status.label} color={status.color} size="small" />;
      },
    },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountBalance sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700}>
              Accounting Dashboard
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={dateFilter}
              label="Period"
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="this_week">This Week</MenuItem>
              <MenuItem value="this_month">This Month</MenuItem>
              <MenuItem value="last_month">Last Month</MenuItem>
              <MenuItem value="this_quarter">This Quarter</MenuItem>
              <MenuItem value="this_year">This Year</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          {summaryCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(card.color, 0.1)} 0%, ${alpha(card.color, 0.05)} 100%)`,
                  borderLeft: `4px solid ${card.color}`,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {card.title}
                    </Typography>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(card.color, 0.1),
                        color: card.color,
                      }}
                    >
                      {card.icon}
                    </Box>
                  </Box>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Invoice Status Summary */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ color: 'success.main' }} />
                  <Typography variant="h5" fontWeight={700}>
                    {summary.invoicesPaid}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Invoices Paid
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <PendingActions sx={{ color: 'warning.main' }} />
                  <Typography variant="h5" fontWeight={700}>
                    {summary.invoicesPending}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Invoices Pending
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <Description sx={{ color: 'info.main' }} />
                  <Typography variant="h5" fontWeight={700}>
                    {summary.invoicesSubmitted}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Total Invoices
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="Trips & Invoices" />
              <Tab label="Expenses" />
              <Tab label="Driver Pay" />
              <Tab label="Disputes" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ height: 500 }}>
              <DataGrid
                rows={loads.filter(l => l.status === 'completed' || l.status === 'delivered' || l.status === 'in_transit')}
                columns={tripsColumns}
                loading={loading}
                getRowId={(row) => row._id}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25 } },
                }}
                disableRowSelectionOnClick
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-cell:focus': {
                    outline: 'none',
                  },
                }}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Alert severity="info">
              Expense tracking feature coming soon. This will show fuel, tolls, lumper fees, and other trip expenses.
            </Alert>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Alert severity="info">
              Driver pay calculation and pay stub generation coming soon.
            </Alert>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Alert severity="info">
              Invoice dispute tracking coming soon.
            </Alert>
          </TabPanel>
        </Card>
      </Box>
    </DashboardLayout>
  );
};

export default AccountingPage;
