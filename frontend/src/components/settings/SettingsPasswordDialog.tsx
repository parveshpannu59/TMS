import { memo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import type { PasswordChange } from '@/api/settings.api';

type SettingsPasswordDialogProps = {
  open: boolean;
  onClose: () => void;
  passwordData: PasswordChange;
  onPasswordDataChange: (d: Partial<PasswordChange>) => void;
  passwordErrors: Record<string, string>;
  saving: boolean;
  onSubmit: () => void;
  showPassword: boolean;
  onShowPasswordToggle: () => void;
};

export const SettingsPasswordDialog = memo<SettingsPasswordDialogProps>(function SettingsPasswordDialog({
  open,
  onClose,
  passwordData,
  onPasswordDataChange,
  passwordErrors,
  saving,
  onSubmit,
  showPassword,
  onShowPasswordToggle,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            id="password-current"
            label="Current Password"
            type={showPassword ? 'text' : 'password'}
            value={passwordData.currentPassword}
            onChange={(e) => onPasswordDataChange({ currentPassword: e.target.value })}
            error={!!passwordErrors.currentPassword}
            helperText={passwordErrors.currentPassword}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={onShowPasswordToggle} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            id="password-new"
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            value={passwordData.newPassword}
            onChange={(e) => onPasswordDataChange({ newPassword: e.target.value })}
            error={!!passwordErrors.newPassword}
            helperText={passwordErrors.newPassword || 'Must be 8+ characters with uppercase, lowercase, and number'}
            fullWidth
          />
          <TextField
            id="password-confirm"
            label="Confirm New Password"
            type={showPassword ? 'text' : 'password'}
            value={passwordData.confirmPassword}
            onChange={(e) => onPasswordDataChange({ confirmPassword: e.target.value })}
            error={!!passwordErrors.confirmPassword}
            helperText={passwordErrors.confirmPassword}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <Lock />}>
          Change Password
        </Button>
      </DialogActions>
    </Dialog>
  );
});
