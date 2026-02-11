import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@contexts/AuthContext';
import { ErrorBoundary } from '@components/common/ErrorBoundary';
import { ThemeModeProvider } from '@/contexts/ThemeContext';
import { PusherProvider } from '@/contexts/PusherContext';
import { AppRoutes } from './routes';
import { queryClient } from '@/lib/queryClient';
import '@/i18n/config';

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeModeProvider>
            <CssBaseline />
            <BrowserRouter>
              <AuthProvider>
                <PusherProvider>
                  <AppRoutes />
                </PusherProvider>
              </AuthProvider>
            </BrowserRouter>
          </ThemeModeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

export default App;