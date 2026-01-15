import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Skeleton,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Delete,
  VpnKey,
  People,
  CheckCircle,
  Cancel,
  Search,
} from '@mui/icons-material';
import type { User } from '../types/user.types';
import { CreateUserDialog } from '@components/users/CreateUserDialog';
import { EditUserDialog } from '@components/users/EditUserDialog';
import { ChangePasswordDialog } from '@components/users/ChangePasswordDialog';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { format } from 'date-fns';
import { useUsers, useUserStats, useDeleteUser } from '@/hooks/api/useUsers';
import { useDebounce } from '@/hooks/useDebounce';

// Memoized stat card component
const StatCard = React.memo(({ title, value, icon, color }: any) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, color }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {title}
          </Typography>
        </Box>
        {React.cloneElement(icon, { sx: { fontSize: 32, color, opacity: 0.2 } })}
      </Box>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

export const UsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Debounce search input
  const debouncedSearch = useDebounce(search, 300);

  // Fetch data with React Query
  const { data, isLoading, error } = useUsers({
    page: page + 1,
    limit: pageSize,
    search: debouncedSearch,
    status: statusFilter || undefined,
  });

  const { data: stats } = useUserStats();
  const deleteUserMutation = useDeleteUser();

  // Memoized columns definition
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 140,
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 110,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value}
            size="small"
            color={params.value === 'owner' ? 'error' : 'primary'}
            sx={{
              textTransform: 'capitalize',
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
            }}
          />
        ),
      },
      {
        field: 'phone',
        headerName: 'Phone',
        width: 120,
        renderCell: (params: GridRenderCellParams) => (
          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
            {params.value || '-'}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 100,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value}
            size="small"
            color={params.value === 'active' ? 'success' : 'default'}
            icon={
              params.value === 'active' ? (
                <CheckCircle sx={{ fontSize: 14 }} />
              ) : (
                <Cancel sx={{ fontSize: 14 }} />
              )
            }
            sx={{
              textTransform: 'capitalize',
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
            }}
          />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 110,
        renderCell: (params: GridRenderCellParams) => (
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {format(new Date(params.value), 'MMM dd, yyyy')}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 140,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => <ActionsCell user={params.row} />,
      },
    ],
    []
  );

  // Memoized actions cell component
  const ActionsCell = React.memo(({ user }: { user: User }) => {
    const handleEdit = useCallback(() => {
      setSelectedUser(user);
      setEditDialogOpen(true);
    }, [user]);

    const handleChangePassword = useCallback(() => {
      setSelectedUser(user);
      setPasswordDialogOpen(true);
    }, [user]);

    const handleDelete = useCallback(() => {
      if (confirm(`Are you sure you want to delete ${user.name}?`)) {
        deleteUserMutation.mutate(user.id);
      }
    }, [user]);

    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton
          size="small"
          color="primary"
          onClick={handleEdit}
          title="Edit User"
          sx={{ '&:hover': { bgcolor: 'primary.lighter' }, width: 32, height: 32 }}
        >
          <Edit sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          color="warning"
          onClick={handleChangePassword}
          title="Change Password"
          sx={{ '&:hover': { bgcolor: 'warning.lighter' }, width: 32, height: 32 }}
        >
          <VpnKey sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={handleDelete}
          title="Delete User"
          sx={{ '&:hover': { bgcolor: 'error.lighter' }, width: 32, height: 32 }}
        >
          <Delete sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    );
  });

  ActionsCell.displayName = 'ActionsCell';

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  }, []);

  return (
    <DashboardLayout>
      <Box
        sx={{
          height: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" component="h1" fontWeight={700} sx={{ mb: 0.5 }}>
              User Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage system users and permissions
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ minWidth: 140 }}
          >
            Add User
          </Button>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            placeholder="Search users..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>

        {/* Stats Row */}
        {stats ? (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <StatCard title="Total Users" value={stats.totalUsers} icon={<People />} color="primary.main" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Active Users" value={stats.activeUsers} icon={<CheckCircle />} color="success.main" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Inactive Users" value={stats.inactiveUsers} icon={<Cancel />} color="error.main" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Owners" value={stats.roleStats?.owner || 0} icon={<People />} color="secondary.main" />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[...Array(4)].map((_, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} variant="outlined">
            {error.message || 'Failed to load users'}
          </Alert>
        )}

        {/* DataGrid */}
        <Paper
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <DataGrid
            rows={data?.data || []}
            columns={columns}
            loading={isLoading}
            paginationMode="server"
            rowCount={data?.pagination?.totalItems || 0}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              flex: 1,
              border: 'none',
              '& .MuiDataGrid-cell': {
                padding: '8px 16px',
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeaders': {
                fontSize: '0.8125rem',
                fontWeight: 600,
                backgroundColor: 'background.default',
              },
              '& .MuiDataGrid-row': {
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              },
            }}
          />
        </Paper>

        <CreateUserDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={() => setCreateDialogOpen(false)}
        />

        <EditUserDialog
          open={editDialogOpen}
          user={selectedUser}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => setEditDialogOpen(false)}
        />

        <ChangePasswordDialog
          open={passwordDialogOpen}
          user={selectedUser}
          onClose={() => {
            setPasswordDialogOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => setPasswordDialogOpen(false)}
        />
      </Box>
    </DashboardLayout>
  );
};

export default UsersPage;
