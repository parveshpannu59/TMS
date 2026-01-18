import React, { createContext, useState, useCallback, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@api/auth.api';
import { setAuthToken, clearAuthToken, getAuthToken } from '@api/client';
import type {
  AuthState,
  AuthContextValue,
  LoginCredentials,
  User,
} from '../types/auth.types';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = React.memo(
  ({ children }) => {
    const navigate = useNavigate();
    // Initialize token from sessionStorage if it exists
    const savedToken = getAuthToken();
    const [state, setState] = useState<AuthState>({
      user: null,
      token: savedToken,
      isAuthenticated: false,
      isLoading: true,
      expiresAt: null,
    });

    const login = useCallback(
      async (credentials: LoginCredentials): Promise<void> => {
        try {
          setState((prev) => ({ ...prev, isLoading: true }));
          const response = await authApi.login(credentials);

          const { token, user, expiresAt } = response.data;

          // Store token in sessionStorage (persists on refresh)
          setAuthToken(token);

          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            expiresAt,
          });

          navigate('/dashboard', { replace: true });
        } catch (error) {
          console.error('Login error in AuthContext:', error);
          setState((prev) => ({ ...prev, isLoading: false }));
          // Re-throw error so LoginForm can catch and display it
          throw error;
        }
      },
      [navigate]
    );

    const logout = useCallback(async (): Promise<void> => {
      try {
        // Ensure token is set before making logout request
        const currentToken = state.token;
        if (currentToken) {
          setAuthToken(currentToken);
        }
        // Send logout request with token in header
        await authApi.logout();
      } catch (error) {
        console.error('Logout error:', error);
        // Continue with logout even if the API call fails
      } finally {
        // Clear token AFTER logout request is sent
        clearAuthToken();
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          expiresAt: null,
        });
        navigate('/login', { replace: true });
      }
    }, [state.token, navigate]);

    const checkAuth = useCallback(async (): Promise<void> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const user: User = await authApi.verifyAuth();

        setState((prev) => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
        }));
      } catch (error) {
        clearAuthToken();
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          expiresAt: null,
        });
      }
    }, []);

    // Listen for unauthorized events (token expiry)
    useEffect(() => {
      const handleUnauthorized = (): void => {
        logout();
      };

      window.addEventListener('unauthorized', handleUnauthorized);
      return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }, [logout]);

    // Check auth on mount if token exists
    useEffect(() => {
      checkAuth();
    }, []);

    const value = useMemo(
      () => ({
        ...state,
        login,
        logout,
        checkAuth,
      }),
      [state, login, logout, checkAuth]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }
);

AuthProvider.displayName = 'AuthProvider';