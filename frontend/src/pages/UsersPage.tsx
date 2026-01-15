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
} from '@mui/icons-material';
import { userApi } from '@api/user.api';
import type { User, UserStats } from '../types/user.types';
import type { ApiError } from '../types/api.types';
import { CreateUserDialog } from '@components/users/CreateUserDialog';
import { EditUserDialog } from '@components/users/EditUserDialog';
import { ChangePasswordDialog } from '@components/users/ChangePasswordDialog';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { format } from 'date-fns';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, statsData] = await Promise.all([
        userApi.getAllUsers(),
        userApi.getUserStats(),
      ]);
      setUsers(usersData);
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
      <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Compact Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                        Total Users
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
                        Active Users
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
                        Inactive Users
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
                        Owners
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

        {/* Compact DataGrid - Takes remaining space */}
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
            rows={users}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
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