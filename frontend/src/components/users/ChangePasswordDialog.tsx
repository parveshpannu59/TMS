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
  Alert,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Close, VpnKey, Visibility, VisibilityOff } from '@mui/icons-material';
import { userApi } from '@api/user.api';
import type { User } from '@types/user.types';
import type { ApiError } from '@types/api.types';
import { changePasswordSchema, type ChangePasswordFormData } from '@utils/userValidation';
import { useTranslation } from 'react-i18next';

interface ChangePasswordDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = React.memo(
  ({ open, user, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
      control,
      handleSubmit,
      formState: { errors },
      reset,
    } = useForm<ChangePasswordFormData>({
      resolver: yupResolver(changePasswordSchema),
      defaultValues: {
        newPassword: '',
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
      async (data: ChangePasswordFormData) => {
        if (!user) return;

        try {
          setError(null);
          setSuccess(null);
          setIsSubmitting(true);

          await userApi.changePassword(user.id, data.newPassword);

          setSuccess(t('users.passwordChangedSuccessfully', { defaultValue: 'Password changed successfully!' }));

          setTimeout(() => {
            handleClose();
            if (onSuccess) {
              onSuccess();
            }
          }, 1500);
        } catch (err) {
          const apiError = err as ApiError;
          setError(apiError.message || t('users.failedToChangePassword', { defaultValue: 'Failed to change password. Please try again.' }));
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
            <VpnKey color="primary" />
            {t('users.changePassword', { defaultValue: 'Change Password' })}
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

              <Alert severity="info">
                {t('users.changingPasswordFor', { defaultValue: 'Changing password for:' })} <strong>{user.name}</strong> ({user.email})
              </Alert>

              <Controller
                name="newPassword"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('users.newPassword', { defaultValue: 'New Password' })}
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    autoFocus
                    error={!!errors.newPassword}
                    helperText={errors.newPassword?.message}
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
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={<VpnKey />}
            >
              {isSubmitting ? t('users.changing', { defaultValue: 'Changing...' }) : t('users.changePassword', { defaultValue: 'Change Password' })}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    );
  }
);

ChangePasswordDialog.displayName = 'ChangePasswordDialog';