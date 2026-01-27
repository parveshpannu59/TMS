import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  InputAdornment,
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
  FilterList,
} from '@mui/icons-material';
import { userApi } from '@api/user.api';
import type { User, UserStats } from '../types/user.types';
import type { ApiError } from '../types/api.types';
import { CreateUserDialog } from '@components/users/CreateUserDialog';
import { EditUserDialog } from '@components/users/EditUserDialog';
import { ChangePasswordDialog } from '@components/users/ChangePasswordDialog';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersResponse, statsData] = await Promise.all([
        userApi.getAllUsers({ page: 1, limit: 1000 }),
        userApi.getUserStats(),
      ]);
      // Extract users array from paginated response
      setUsers(usersResponse.data || []);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Apply filters
  useEffect(() => {
    let result = [...users];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(lowerSearch) ||
          user.email.toLowerCase().includes(lowerSearch) ||
          (user.phone && user.phone.toLowerCase().includes(lowerSearch))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((user) => user.status === statusFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(result);
  }, [users, searchTerm, statusFilter, roleFilter]);

  const handleEdit = useCallback((user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }, []);

  const handleChangePassword = useCallback((user: User) => {
    setSelectedUser(user);
    setPasswordDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedUser) return;

    try {
      await userApi.deleteUser(selectedUser.id);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to delete user');
    }
  }, [selectedUser, fetchUsers]);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: t('common.name'),
        flex: 1,
        minWidth: 140,
      },
      {
        field: 'email',
        headerName: t('common.email'),
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: 'role',
        headerName: t('users.role'),
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
        headerName: t('common.phone'),
        width: 120,
        renderCell: (params: GridRenderCellParams) => (
          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
            {params.value || '-'}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: t('common.status'),
        width: 100,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value}
            size="small"
            color={params.value === 'active' ? 'success' : 'default'}
            icon={params.value === 'active' ? <CheckCircle sx={{ fontSize: 14 }} /> : <Cancel sx={{ fontSize: 14 }} />}
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
        headerName: t('users.created'),
        width: 110,
        renderCell: (params: GridRenderCellParams) => (
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {format(new Date(params.value), 'MMM dd, yyyy')}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 140,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleEdit(params.row)}
              title="Edit User"
              sx={{ 
                '&:hover': { bgcolor: 'primary.lighter' },
                width: 32,
                height: 32,
              }}
            >
              <Edit sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              color="warning"
              onClick={() => handleChangePassword(params.row)}
              title="Change Password"
              sx={{ 
                '&:hover': { bgcolor: 'warning.lighter' },
                width: 32,
                height: 32,
              }}
            >
              <VpnKey sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteClick(params.row)}
              title="Delete User"
              sx={{ 
                '&:hover': { bgcolor: 'error.lighter' },
                width: 32,
                height: 32,
              }}
            >
              <Delete sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [handleEdit, handleChangePassword, handleDeleteClick]
  );

  return (
    <DashboardLayout>
      <Box sx={{ 
        height: 'calc(100vh - 120px)', 
        display: 'flex', 
        flexDirection: 'column', 
        overflowY: 'auto',
        overflowX: 'hidden',
        p: 3
      }}>
        {/* Compact Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" component="h1" fontWeight={700} sx={{ mb: 0.5 }}>
          {t('users.title')}
        </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('users.subtitle')}
            </Typography>
          </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
            sx={{ minWidth: 140 }}
        >
            {t('users.addUser')}
        </Button>
      </Box>

        {/* Compact Stats Row */}
      {stats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                        {stats.totalUsers}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {t('users.totalUsers')}
                </Typography>
                    </Box>
                    <People sx={{ fontSize: 32, color: 'primary.main', opacity: 0.2 }} />
                  </Box>
              </CardContent>
            </Card>
          </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, color: 'success.main' }}>
                        {stats.activeUsers}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {t('users.activeUsers')}
                </Typography>
                    </Box>
                    <CheckCircle sx={{ fontSize: 32, color: 'success.main', opacity: 0.2 }} />
                  </Box>
              </CardContent>
            </Card>
          </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, color: 'error.main' }}>
                        {stats.inactiveUsers}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {t('users.inactiveUsers')}
                </Typography>
                    </Box>
                    <Cancel sx={{ fontSize: 32, color: 'error.main', opacity: 0.2 }} />
                  </Box>
              </CardContent>
            </Card>
          </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, color: 'secondary.main' }}>
                        {stats.roleStats?.owner || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {t('users.owners')}
                </Typography>
                    </Box>
                    <People sx={{ fontSize: 32, color: 'secondary.main', opacity: 0.2 }} />
                  </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }} 
            onClose={() => setError(null)}
            variant="outlined"
          >
          {error}
        </Alert>
      )}

        {/* Search and Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder={t('users.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 300 }}
            size="small"
          />
          
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="all">{t('users.allStatus')}</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>

          <TextField
            select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="all">{t('users.allRoles')}</MenuItem>
            <MenuItem value="owner">Owner</MenuItem>
            <MenuItem value="dispatcher">Dispatcher</MenuItem>
            <MenuItem value="accountant">Accountant</MenuItem>
            <MenuItem value="driver">Driver</MenuItem>
          </TextField>

          {(searchTerm || statusFilter !== 'all' || roleFilter !== 'all') && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setRoleFilter('all');
              }}
            >
              Clear
            </Button>
          )}
        </Box>

        {/* Compact DataGrid - Takes remaining space */}
        <Paper 
          sx={{ 
            minHeight: 600,
            maxHeight: 900,
            height: filteredUsers.length > 0 ? Math.min(900, Math.max(600, filteredUsers.length * 52 + 150)) : 600,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
                paginationModel: { pageSize: 10 },
            },
          }}
          disableRowSelectionOnClick
          autoHeight={false}
          sx={{
              border: 'none',
              height: '100%',
              width: '100%',
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
            '& .MuiDataGrid-virtualScroller': {
              overflow: 'auto',
            },
          }}
        />
      </Paper>

      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={fetchUsers}
      />

      <EditUserDialog
        open={editDialogOpen}
        user={selectedUser}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchUsers}
      />

      <ChangePasswordDialog
        open={passwordDialogOpen}
        user={selectedUser}
        onClose={() => {
          setPasswordDialogOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchUsers}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete user <strong>{selectedUser?.name}</strong>? This action
          cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </DashboardLayout>
  );
};

export default UsersPage;