import React, { useState, useCallback, useMemo } from 'react';
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
  Fade,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, Email, Lock } from '@mui/icons-material';
import { useAuth } from '@hooks/useAuth';
import { loginSchema, LoginFormData } from '@utils/validation';

/**
 * Login form component with validation and error handling
 * Optimized for performance with memoization and reduced GPU usage
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

  // Memoize input field styles to prevent re-renders
  const inputFieldStyles = useMemo(
    () => ({
      '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 1)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#667eea',
          },
        },
        '&.Mui-focused': {
          backgroundColor: 'rgba(255, 255, 255, 1)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
            borderColor: '#667eea',
          },
        },
        '&.Mui-error': {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#c53030',
          },
        },
      },
      '& .MuiInputLabel-root': {
        fontWeight: 500,
        '&.Mui-focused': {
          color: '#667eea',
        },
      },
    }),
    []
  );

  // Memoize button styles
  const buttonStyles = useMemo(
    () => ({
      py: 1.75,
      mt: 1,
      fontSize: '1rem',
      fontWeight: 600,
      textTransform: 'none',
      borderRadius: 2,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      '&:hover': {
        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
        transform: 'translateY(-1px)',
      },
      '&:active': {
        transform: 'translateY(0px)',
      },
      '&:disabled': {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        opacity: 0.6,
        transform: 'none',
      },
      // Respect reduced motion preference
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover': {
          transform: 'none',
        },
      },
    }),
    []
  );

  return (
    <Box
      component="form"
      onSubmit={handleFormSubmit}
      noValidate
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2.5, sm: 3 },
        width: '100%',
      }}
    >
      <Box sx={{ mb: 1 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '1.75rem', sm: '2rem' },
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            letterSpacing: '-0.5px',
          }}
        >
          Welcome Back
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            fontSize: '0.95rem',
            fontWeight: 400,
          }}
        >
          Sign in to access your TMS account
        </Typography>
      </Box>

      <Fade in={!!error} timeout={300}>
        <Box>
          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{
                mb: 1,
                fontWeight: 500,
                backgroundColor: '#fff5f5',
                color: '#c53030',
                border: '1px solid #fc8181',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(197, 48, 48, 0.1)',
                '& .MuiAlert-icon': {
                  color: '#c53030',
                },
                '& .MuiAlert-action': {
                  color: '#c53030',
                },
              }}
            >
              {error}
            </Alert>
          )}
        </Box>
      </Fade>

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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email
                    sx={{
                      color: errors.email ? 'error.main' : 'action.active',
                      fontSize: 20,
                    }}
                  />
                </InputAdornment>
              ),
            }}
            sx={inputFieldStyles}
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
              startAdornment: (
                <InputAdornment position="start">
                  <Lock
                    sx={{
                      color: errors.password ? 'error.main' : 'action.active',
                      fontSize: 20,
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePassword}
                    edge="end"
                    disabled={isSubmitting}
                    sx={{
                      color: 'action.active',
                      '&:hover': {
                        backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      },
                    }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={inputFieldStyles}
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
        sx={buttonStyles}
      >
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>

      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 400,
          }}
        >
          Secure login powered by enterprise-grade authentication
        </Typography>
      </Box>
    </Box>
  );
});

LoginForm.displayName = 'LoginForm';