import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CircularProgress,
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
import { dashboardApi, type AccountantDashboardData } from '@/api/dashboardApi';
import { useAuth } from '@hooks/useAuth';
import { useMediaQuery } from '@mui/material';

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
  const [dateFilter, setDateFilter] = useState('month');
  const [data, setData] = useState<AccountantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await dashboardApi.getAccountantDashboard(dateFilter);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch accounting data');
      console.error('Accounting dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summaryCards = useMemo(() => {
    if (!data?.profitLoss) return [];
    
    const pl = data.profitLoss;
    return [
      {
        title: 'Total Revenue',
        value: `$${pl.revenue.toLocaleString()}`,
        icon: <MonetizationOn />,
        color: theme.palette.primary.main,
        subtitle: `${data.payments.length} payments`,
      },
      {
        title: 'Total Expenses',
        value: `$${pl.expenses.toLocaleString()}`,
        icon: <Receipt />,
        color: theme.palette.error.main,
        subtitle: `${data.expenses.count} expense entries`,
      },
      {
        title: 'Total Payments',
        value: `$${data.payments.reduce((sum, p) => sum + p.totalPayment, 0).toLocaleString()}`,
        icon: <AttachMoney />,
        color: theme.palette.warning.main,
        subtitle: `${data.payments.length} driver payments`,
      },
      {
        title: 'Net Profit',
        value: `$${pl.profit.toLocaleString()}`,
        icon: <TrendingUp />,
        color: pl.profit >= 0 ? theme.palette.success.main : theme.palette.error.main,
        subtitle: `${pl.margin}% margin`,
      },
    ];
  }, [data, theme]);

  // Documents summary cards
  const documentCards = useMemo(() => {
    if (!data?.documents) return [];
    
    const docs = data.documents;
    return [
      {
        title: 'BOL Documents',
        value: docs.bolDocuments,
        subtitle: `${docs.missingBol} missing`,
        icon: <Description />,
        color: docs.missingBol === 0 ? theme.palette.success.main : theme.palette.warning.main,
      },
      {
        title: 'POD Documents',
        value: docs.podDocuments,
        subtitle: `${docs.missingPod} missing`,
        icon: <CheckCircle />,
        color: docs.missingPod === 0 ? theme.palette.success.main : theme.palette.warning.main,
      },
    ];
  }, [data, theme]);

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
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
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
            <Box sx={{ height: { xs: 400, sm: 500 }, width: '100%' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : data ? (
                <DataGrid
                  rows={data.driverAssignments.map((assignment, idx) => ({
                    id: idx,
                    ...assignment,
                  }))}
                  getRowId={(row) => row.id || String(row.loadNumber || idx)}
                  columns={[
                    { field: 'loadNumber', headerName: 'Load #', flex: 1, minWidth: 100 },
                    { field: 'driverName', headerName: 'Driver', flex: 1, minWidth: 120 },
                    { field: 'truckNumber', headerName: 'Truck', flex: 1, minWidth: 100 },
                    {
                      field: 'rate',
                      headerName: 'Rate',
                      flex: 1,
                      minWidth: 100,
                      renderCell: (params) => `$${params.value.toLocaleString()}`,
                    },
                    {
                      field: 'status',
                      headerName: 'Status',
                      flex: 1,
                      minWidth: 100,
                      renderCell: (params) => <Chip label={params.value} size="small" />,
                    },
                  ]}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                  }}
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell:focus': { outline: 'none' },
                  }}
                />
              ) : (
                <Alert severity="info">No data available</Alert>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {data?.expenses ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Total Expenses: ${data.expenses.total.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {data.expenses.count} expense entries
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(data.expenses.byCategory).map(([category, amount]) => (
                    <Grid item xs={12} sm={6} md={3} key={category}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">
                            {category.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="h6">${Number(amount).toLocaleString()}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : (
              <Alert severity="info">No expense data available</Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {data?.payments && data.payments.length > 0 ? (
              <Box sx={{ height: { xs: 400, sm: 500 } }}>
                <DataGrid
                  rows={data.payments.map((payment, idx) => ({ id: idx, ...payment }))}
                  getRowId={(row) => row.id || String(row.loadNumber || idx)}
                  columns={[
                    { field: 'loadNumber', headerName: 'Load #', flex: 1, minWidth: 100 },
                    { field: 'driverName', headerName: 'Driver', flex: 1, minWidth: 120 },
                    {
                      field: 'totalPayment',
                      headerName: 'Payment',
                      flex: 1,
                      minWidth: 120,
                      renderCell: (params) => `$${params.value.toLocaleString()}`,
                    },
                    {
                      field: 'totalMiles',
                      headerName: 'Miles',
                      flex: 1,
                      minWidth: 100,
                      renderCell: (params) => params.value.toLocaleString(),
                    },
                    {
                      field: 'payPerMile',
                      headerName: 'Rate/Mile',
                      flex: 1,
                      minWidth: 100,
                      renderCell: (params) => `$${params.value.toFixed(2)}`,
                    },
                  ]}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                  }}
                  disableRowSelectionOnClick
                />
              </Box>
            ) : (
              <Alert severity="info">No payment data available</Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="body2" color="text.secondary">
              Documents Summary
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {documentCards.map((card, idx) => (
                <Grid item xs={12} sm={6} key={idx}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ color: card.color }}>{card.icon}</Box>
                        <Box>
                          <Typography variant="h5">{card.value}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {card.title} - {card.subtitle}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        </Card>
      </Box>
    </DashboardLayout>
  );
};

export default AccountingPage;
