import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
  setThemeMode: (mode: PaletteMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeModeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as PaletteMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const setThemeMode = (newMode: PaletteMode) => {
    setMode(newMode);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
                secondary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
                background: { default: '#f1f5f9', paper: '#ffffff' },
                text: { primary: '#0f172a', secondary: '#64748b' },
                divider: '#e2e8f0',
              }
            : {
                primary: { main: '#60a5fa', light: '#93c5fd', dark: '#3b82f6' },
                secondary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1' },
                background: { default: '#0f172a', paper: '#1e293b' },
                text: { primary: '#f1f5f9', secondary: '#94a3b8' },
                divider: '#334155',
              }),
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontWeight: 800 },
          h2: { fontWeight: 700 },
          h3: { fontWeight: 700 },
          h4: { fontWeight: 700 },
          h5: { fontWeight: 600 },
          h6: { fontWeight: 600 },
        },
        shape: { borderRadius: 12 },
        components: {
          MuiButton: {
            styleOverrides: {
              root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
              containedPrimary: {
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow: mode === 'light'
                  ? '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)'
                  : '0 1px 3px rgba(0,0,0,0.3)',
                border: mode === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
              },
            },
          },
        },
      }),
    [mode]
  );

  const value = { mode, toggleTheme, setThemeMode };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
