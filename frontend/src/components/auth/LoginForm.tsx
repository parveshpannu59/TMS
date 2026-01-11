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
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '@hooks/useAuth';
import { loginSchema, LoginFormData } from '@utils/validation';

/**
 * Login form component with validation and error handling
 * Displays field-level validation errors and server-side authentication errors
 */
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
    defaultValues: {
      email: '',
      password: '',
    },
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
        // Reset form on successful login
        reset();
      } catch (err: any) {
        console.error('Login error caught in LoginForm:', err);
        // Handle different error types
        let errorMessage = 'Login failed. Please try again.';
        
        if (err && typeof err === 'object') {
          // If it's an ApiError object with a message property
          if (err.message) {
            errorMessage = err.message;
          }
          // If it has a data property with message
          if (err.data?.message) {
            errorMessage = err.data.message;
          }
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        
        console.log('Setting error message:', errorMessage);
        setError(errorMessage);
        // Keep form data for user to correct
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

  return (
    <Box
      component="form"
      onSubmit={handleFormSubmit}
      noValidate
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        width: '100%',
      }}
    >
      <Typography variant="h4" component="h1" textAlign="center" fontWeight={600}>
        Welcome Back
      </Typography>

      <Typography variant="body2" textAlign="center" color="text.secondary">
        Sign in to continue to TMS
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{
            mb: 1,
            fontWeight: 500,
            backgroundColor: '#ffebee',
            color: '#c62828',
            border: '1px solid #ef5350',
            borderRadius: 1,
          }}
        >
          {error}
        </Alert>
      )}

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Email Address"
            type="email"
            fullWidth
            autoComplete="email"
            autoFocus
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
            autoComplete="current-password"
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

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={isSubmitting}
        startIcon={<LoginIcon />}
        sx={{ py: 1.5 }}
      >
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </Box>
  );
});

LoginForm.displayName = 'LoginForm';