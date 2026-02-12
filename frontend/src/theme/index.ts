import { createTheme, Theme } from '@mui/material/styles';

// ══════════════════════════════════════════════════════════════
// Haulxp Design System — Modern Professional Theme
// ══════════════════════════════════════════════════════════════

export const theme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#fff',
    },
    secondary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#fff',
    },
    error: {
      main: '#ef4444',
      light: '#fca5a5',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fcd34d',
      dark: '#d97706',
    },
    info: {
      main: '#06b6d4',
      light: '#67e8f9',
      dark: '#0891b2',
    },
    success: {
      main: '#10b981',
      light: '#6ee7b7',
      dark: '#059669',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.025em' },
    h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.015em' },
    h4: { fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.01em' },
    h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.5, letterSpacing: '0.01em' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5, letterSpacing: '0.01em' },
    overline: { fontSize: '0.6875rem', fontWeight: 700, lineHeight: 1.5, letterSpacing: '0.08em' },
    button: { fontWeight: 600, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(15,23,42,0.04)',
    '0 1px 3px 0 rgba(15,23,42,0.06), 0 1px 2px 0 rgba(15,23,42,0.04)',
    '0 4px 6px -1px rgba(15,23,42,0.06), 0 2px 4px -1px rgba(15,23,42,0.04)',
    '0 10px 15px -3px rgba(15,23,42,0.06), 0 4px 6px -2px rgba(15,23,42,0.03)',
    '0 20px 25px -5px rgba(15,23,42,0.08), 0 10px 10px -5px rgba(15,23,42,0.03)',
    '0 25px 50px -12px rgba(15,23,42,0.12)',
    '0 25px 50px -12px rgba(15,23,42,0.14)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
    '0 25px 50px -12px rgba(15,23,42,0.15)',
  ],
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          padding: '8px 20px',
          fontWeight: 600,
          fontSize: '0.875rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(59,130,246,0.15)',
          },
        },
        contained: {
          '&:hover': { boxShadow: '0 8px 20px rgba(59,130,246,0.2)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: 'rgba(59,130,246,0.04)',
          },
        },
        sizeSmall: {
          padding: '6px 14px',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)',
          border: '1px solid rgba(226,232,240,0.8)',
          backgroundImage: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': { paddingBottom: '20px' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#ffffff',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: '#f8fafc',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#94a3b8',
              },
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
              },
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 500,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: {
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
        colorSuccess: {
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.06) 100%)',
          color: '#059669',
          border: '1px solid rgba(16,185,129,0.2)',
        },
        colorWarning: {
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.06) 100%)',
          color: '#d97706',
          border: '1px solid rgba(245,158,11,0.2)',
        },
        colorError: {
          background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)',
          color: '#dc2626',
          border: '1px solid rgba(239,68,68,0.2)',
        },
        colorInfo: {
          background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.06) 100%)',
          color: '#0891b2',
          border: '1px solid rgba(6,182,212,0.2)',
        },
        colorPrimary: {
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.06) 100%)',
          color: '#2563eb',
          border: '1px solid rgba(59,130,246,0.2)',
        },
        colorSecondary: {
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.06) 100%)',
          color: '#4f46e5',
          border: '1px solid rgba(99,102,241,0.2)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 6,
          backgroundColor: 'rgba(226,232,240,0.6)',
        },
        bar: {
          borderRadius: 6,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.875rem',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-selected': {
            backgroundColor: 'rgba(59,130,246,0.08)',
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
          fontSize: '0.65rem',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#3b82f6',
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#3b82f6',
          },
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});
