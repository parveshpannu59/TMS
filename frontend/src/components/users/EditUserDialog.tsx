import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  IconButton,
  FormHelperText,
} from '@mui/material';
import { Close, Save } from '@mui/icons-material';
import { userApi } from '@api/user.api';
import type { User, UpdateUserData } from '@types/user.types';
import { UserRole } from '@types/user.types';
import type { ApiError } from '@types/api.types';
import { updateUserSchema, type UpdateUserFormData } from '@utils/userValidation';

interface EditUserDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = React.memo(
  ({ open, user, onClose, onSuccess }) => {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
      control,
      handleSubmit,
      formState: { errors },
      reset,
    } = useForm<UpdateUserFormData>({
      resolver: yupResolver(updateUserSchema),
      defaultValues: {
        name: '',
        email: '',
        role: UserRole.DISPATCHER,
        phone: '',
        status: 'active',
      },
    });

    useEffect(() => {
      if (user) {
        reset({
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          status: user.status,
        });
      }
    }, [user, reset]);

    const handleClose = useCallback(() => {
      reset();
      setError(null);
      setSuccess(null);
      onClose();
    }, [reset, onClose]);

    const onSubmit = useCallback(
      async (data: UpdateUserFormData) => {
        if (!user) return;

        try {
          setError(null);
          setSuccess(null);
          setIsSubmitting(true);

          const updateData = {
            ...data,
            phone: data.phone || undefined,
          };

          await userApi.updateUser(user.id, updateData as UpdateUserData);

          setSuccess('User updated successfully!');

          setTimeout(() => {
            handleClose();
            if (onSuccess) {
              onSuccess();
            }
          }, 1500);
        } catch (err) {
          const apiError = err as ApiError;
          setError(apiError.message || 'Failed to update user. Please try again.');
        } finally {
          setIsSubmitting(false);
        }
      },
      [user, handleClose, onSuccess]
    );

    if (!user) return null;

    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Save color="primary" />
            Edit User
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={isSubmitting}>
            <Close />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {success && <Alert severity="success">{success}</Alert>}

              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Full Name"
                    fullWidth
                    autoFocus
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    disabled={isSubmitting}
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email Address"
                    type="email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={isSubmitting}
                  />
                )}
              />

              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.role}>
                    <InputLabel>User Role</InputLabel>
                    <Select {...field} label="User Role" disabled={isSubmitting}>
                      <MenuItem value={UserRole.DISPATCHER}>Dispatcher</MenuItem>
                      <MenuItem value={UserRole.DRIVER}>Driver</MenuItem>
                      <MenuItem value={UserRole.ACCOUNTANT}>Accountant</MenuItem>
                      <MenuItem value={UserRole.OWNER}>Owner</MenuItem>
                    </Select>
                    {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
                  </FormControl>
                )}
              />

              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number (Optional)"
                    fullWidth
                    placeholder="9876543210"
                    error={!!errors.phone}
                    helperText={errors.phone?.message || '10 digit phone number'}
                    disabled={isSubmitting}
                  />
                )}
              />

              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.status}>
                    <InputLabel>Status</InputLabel>
                    <Select {...field} label="Status" disabled={isSubmitting}>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                    {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={<Save />}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    );
  }
);

EditUserDialog.displayName = 'EditUserDialog';