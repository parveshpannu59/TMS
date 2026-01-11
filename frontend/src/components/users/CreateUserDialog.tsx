import React, { useState, useCallback } from 'react';
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
  InputAdornment,
  FormHelperText,
} from '@mui/material';
import { Close, Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { userApi } from '@api/user.api';
import { UserRole } from '@types/user.types';
import { createUserSchema, CreateUserFormData } from '@utils/userValidation';
import type { ApiError } from '@types/api.types';

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateUserDialog: React.FC<CreateUserDialogProps> = React.memo(
  ({ open, onClose, onSuccess }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
      control,
      handleSubmit,
      formState: { errors },
      reset,
    } = useForm<CreateUserFormData>({
      resolver: yupResolver(createUserSchema),
      defaultValues: {
        name: '',
        email: '',
        password: '',
        role: UserRole.DISPATCHER,
        phone: '',
      },
    });

    const handleTogglePassword = useCallback(() => {
      setShowPassword((prev) => !prev);
    }, []);

    const handleClose = useCallback(() => {
      reset();
      setError(null);
      setSuccess(null);
      setShowPassword(false);
      onClose();
    }, [reset, onClose]);

    const onSubmit = useCallback(
      async (data: CreateUserFormData) => {
        try {
          setError(null);
          setSuccess(null);
          setIsSubmitting(true);

          const userData = {
            ...data,
            phone: data.phone || undefined,
          };

          await userApi.createUser(userData);

          setSuccess(`User ${data.name} created successfully!`);

          setTimeout(() => {
            handleClose();
            if (onSuccess) {
              onSuccess();
            }
          }, 1500);
        } catch (err) {
          const apiError = err as ApiError;
          setError(apiError.message || 'Failed to create user. Please try again.');
        } finally {
          setIsSubmitting(false);
        }
      },
      [handleClose, onSuccess]
    );

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
            <PersonAdd color="primary" />
            Create New User
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
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePassword}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
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
              startIcon={<PersonAdd />}
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    );
  }
);

CreateUserDialog.displayName = 'CreateUserDialog';