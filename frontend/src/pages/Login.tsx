import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthLayout } from '@layouts/AuthLayout';
import { LoginForm } from '@components/auth/LoginForm';
import { useAuth } from '@hooks/useAuth';
import { LoadingSpinner } from '@components/common/LoadingSpinner';

const LoginComponent: React.FC = React.memo(() => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (isAuthenticated) {
    const role = user?.role || user?.userType;
    return role === 'driver'
      ? <Navigate to="/driver/mobile/dashboard" replace />
      : <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
});

LoginComponent.displayName = 'Login';

export default LoginComponent;