import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from '@contexts/AuthContext';
import { ErrorBoundary } from '@components/common/ErrorBoundary';
import { AppRoutes } from './routes';
import { theme } from '@theme/index';

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

export default App;