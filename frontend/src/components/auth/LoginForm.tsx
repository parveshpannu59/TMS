import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useAuth } from '@hooks/useAuth';
import { loginSchema, LoginFormData } from '@utils/validation';

export const LoginForm: React.FC = React.memo(() => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const handleTogglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      try {
        setError(null);
        setIsSubmitting(true);
        await login(data);
        reset();
      } catch (err: any) {
        let errorMessage = 'Login failed. Please try again.';
        if (err && typeof err === 'object') {
          if (err.message) errorMessage = err.message;
          if (err.data?.message) errorMessage = err.data.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [login, reset]
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(onSubmit)(e);
    },
    [handleSubmit, onSubmit]
  );

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: '#f8fafc',
      fontSize: '0.95rem',
      transition: 'all 0.2s',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#e2e8f0',
      },
      '&:hover': {
        backgroundColor: '#f1f5f9',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
      },
      '&.Mui-focused': {
        backgroundColor: '#fff',
        '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2, borderColor: '#3b82f6' },
      },
      '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: '#ef4444' },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 500, fontSize: '0.9rem',
      '&.Mui-focused': { color: '#3b82f6' },
    },
  };

  return (
    <Box
      component="form"
      onSubmit={handleFormSubmit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}
    >
      {/* Header */}
      <Box sx={{ mb: 0.5 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            fontSize: '1.6rem',
            color: '#0f172a',
            letterSpacing: '-0.5px',
            mb: 0.5,
          }}
        >
          Sign in
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
          Enter your credentials to continue
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 500,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            '& .MuiAlert-icon': { color: '#ef4444' },
          }}
        >
          {error}
        </Alert>
      )}

      {/* Email */}
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            id="login-email"
            label="Email"
            type="email"
            fullWidth
            autoComplete="email"
            autoFocus
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={isSubmitting}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: errors.email ? '#ef4444' : '#94a3b8', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
        )}
      />

      {/* Password */}
      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            id="login-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={isSubmitting}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: errors.password ? '#ef4444' : '#94a3b8', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePassword}
                    edge="end"
                    disabled={isSubmitting}
                    sx={{ color: '#94a3b8', '&:hover': { backgroundColor: 'rgba(59,130,246,0.06)' } }}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
        )}
      />

      {/* Submit */}
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={isSubmitting}
        disableElevation
        sx={{
          py: 1.5,
          mt: 0.5,
          fontSize: '0.95rem',
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
          color: '#fff',
          letterSpacing: '-0.2px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s',
          '&:hover': {
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            boxShadow: '0 8px 25px rgba(59,130,246,0.35)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
          '&:disabled': {
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            opacity: 0.7,
            color: '#fff',
          },
        }}
      >
        {isSubmitting ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={18} sx={{ color: '#fff' }} />
            Signing in...
          </Box>
        ) : (
          'Sign In'
        )}
      </Button>

      {/* Divider */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
        <Box sx={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
          PROTECTED ACCESS
        </Typography>
        <Box sx={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </Box>

      {/* Security badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
        <Box sx={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 0 2px rgba(34,197,94,0.2)',
        }} />
        <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
          256-bit SSL encrypted connection
        </Typography>
      </Box>
    </Box>
  );
});

LoginForm.displayName = 'LoginForm';
