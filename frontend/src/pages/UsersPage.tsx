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
        minWidth: 150,
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 130,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value}
            size="small"
            color={params.value === 'owner' ? 'error' : 'primary'}
            sx={{ textTransform: 'capitalize' }}
          />
        ),
      },
      {
        field: 'phone',
        headerName: 'Phone',
        width: 130,
        renderCell: (params: GridRenderCellParams) => params.value || '-',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value}
            size="small"
            color={params.value === 'active' ? 'success' : 'default'}
            icon={params.value === 'active' ? <CheckCircle /> : <Cancel />}
            sx={{ textTransform: 'capitalize' }}
          />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 120,
        renderCell: (params: GridRenderCellParams) =>
          format(new Date(params.value), 'MMM dd, yyyy'),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 180,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleEdit(params.row)}
              title="Edit User"
            >
              <Edit fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="warning"
              onClick={() => handleChangePassword(params.row)}
              title="Change Password"
            >
              <VpnKey fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteClick(params.row)}
              title="Delete User"
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [handleEdit, handleChangePassword, handleDeleteClick]
  );

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add New User
        </Button>
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <People color="primary" />
                  <Typography variant="h6">{stats.totalUsers}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Total Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle color="success" />
                  <Typography variant="h6">{stats.activeUsers}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Active Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Cancel color="error" />
                  <Typography variant="h6">{stats.inactiveUsers}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Inactive Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <People color="secondary" />
                  <Typography variant="h6">{stats.roleStats?.owner || 0}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Owners
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              padding: '8px',
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