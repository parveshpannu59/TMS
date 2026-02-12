import React, { useCallback, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import { AccountCircle, Logout, Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from '@hooks/useAuth';
import { getApiOrigin } from '@/api/client';
import { Sidebar, SIDEBAR_WIDTH } from '@components/common/Sidebar';
import { NotificationMenu } from '@components/common/NotificationMenu';
import { usePusherContext } from '@/contexts/PusherContext';
import { useTranslation } from 'react-i18next';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = React.memo(({ children }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(async () => {
    handleMenuClose();
    await logout();
  }, [logout, handleMenuClose]);

  const handleDrawerToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { xs: '100%', sm: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : '100%' },
          ml: { xs: 0, sm: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          zIndex: theme.zIndex.drawer - 1,
          bgcolor: 'rgba(255,255,255,0.85)',
          color: 'text.primary',
          borderBottom: '1px solid #e2e8f0',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important', px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              color: '#64748b',
              '&:hover': { bgcolor: 'rgba(59,130,246,0.06)', color: '#3b82f6' },
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Title */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              color: '#0f172a',
              display: { xs: 'none', sm: 'block' },
              fontSize: '1rem',
              letterSpacing: '-0.3px',
            }}
          >
            {t('common.appTitle', { defaultValue: 'Haulxp TMS' })}
          </Typography>

          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              color: '#0f172a',
              display: { xs: 'block', sm: 'none' },
              fontSize: '1rem',
            }}
          >
            TMS
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RealtimeIndicator />
            <NotificationMenu />
            {!isMobile && (
              <Box sx={{ textAlign: 'right', mr: 0.5 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.2 }}>
                  {user?.name}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                  {user?.role}
                </Typography>
              </Box>
            )}
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              sx={{ p: 0.5, '&:hover': { bgcolor: 'rgba(59,130,246,0.06)' } }}
            >
              <Avatar
                src={
                  user?.profilePicture
                    ? (user.profilePicture.startsWith('http')
                        ? user.profilePicture
                        : `${getApiOrigin()}${user.profilePicture}`)
                    : undefined
                }
                sx={{
                  width: 38, height: 38, fontWeight: 700, fontSize: '0.85rem',
                  background: user?.profilePicture ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  boxShadow: '0 2px 8px rgba(59,130,246,0.2)',
                }}
              >
                {!user?.profilePicture && (user?.name?.charAt(0).toUpperCase() || <AccountCircle />)}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5, minWidth: 220, borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{user?.name}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{user?.email}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'capitalize', mt: 0.3 }}>
                {user?.role}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{
                mt: 0.5, mx: 1, borderRadius: '8px', color: '#ef4444',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.06)' },
              }}
            >
              <Logout fontSize="small" sx={{ mr: 1.5 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Sidebar
        mobileOpen={isMobile ? sidebarOpen : false}
        desktopOpen={!isMobile ? sidebarOpen : false}
        onMobileClose={handleDrawerToggle}
        onDesktopClose={handleDrawerToggle}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          bgcolor: '#f1f5f9',
          transition: theme.transitions.create('all', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }} />
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
});

DashboardLayout.displayName = 'DashboardLayout';

// ─── Real-time Connection Indicator ──────────────────
function RealtimeIndicator() {
  const { connected, onlineCount } = usePusherContext();
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 1, py: 0.35, borderRadius: 2,
        bgcolor: connected ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
        border: '1px solid',
        borderColor: connected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        cursor: 'default',
      }}
      title={connected ? `Real-time connected | ${onlineCount} drivers online` : 'Disconnected'}
    >
      <Box
        sx={{
          width: 6, height: 6, borderRadius: '50%',
          bgcolor: connected ? '#22c55e' : '#ef4444',
          boxShadow: connected ? '0 0 0 2px rgba(34,197,94,0.15)' : 'none',
          animation: connected ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.4 }, '100%': { opacity: 1 } },
        }}
      />
      <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: connected ? '#22c55e' : '#ef4444', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {connected ? 'LIVE' : 'OFF'}
      </Typography>
      {connected && onlineCount > 0 && (
        <Typography sx={{ fontSize: '0.58rem', fontWeight: 600, color: '#94a3b8', ml: 0.2 }}>
          {onlineCount}
        </Typography>
      )}
    </Box>
  );
}
