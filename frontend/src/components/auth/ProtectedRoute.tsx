import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { disableBrowserBack } from '@utils/browserControl';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = React.memo(
  ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    // Disable browser back button when authenticated
    useEffect(() => {
      if (isAuthenticated) {
        const cleanup = disableBrowserBack();
        return cleanup;
      }
    }, [isAuthenticated]);

    if (isLoading) {
      return <LoadingSpinner message="Verifying authentication..." />;
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  }
);

ProtectedRoute.displayName = 'ProtectedRoute';