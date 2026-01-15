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
import { Sidebar, SIDEBAR_WIDTH } from '@components/common/Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = React.memo(({ children }) => {
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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { 
            xs: '100%',
            sm: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : '100%' 
          },
          ml: { 
            xs: 0,
            sm: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0 
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'none', sm: 'block' },
              fontSize: '1.125rem',
            }}
          >
            Transportation Management System
          </Typography>

          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'block', sm: 'none' },
              fontSize: '1.125rem',
            }}
          >
            TMS
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isMobile && (
              <Box sx={{ textAlign: 'right', mr: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {user?.role}
                </Typography>
              </Box>
            )}
            <IconButton 
              color="inherit" 
              onClick={handleMenuOpen}
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                p: 0.5,
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main',
                  width: 40,
                  height: 40,
                  fontWeight: 600,
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || <AccountCircle />}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: 2,
              },
            }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {user?.name}
              </Typography>
            </MenuItem>
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </MenuItem>
            <MenuItem disabled sx={{ opacity: '1 !important', mb: 1 }}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ textTransform: 'capitalize' }}
              >
                Role: {user?.role}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={handleLogout}
              sx={{
                mt: 1,
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.lighter',
                },
              }}
            >
              <Logout fontSize="small" sx={{ mr: 1 }} />
              Logout
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
          width: '100%',
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: { xs: 2, sm: 3 },
          ml: { 
            xs: 0,
            sm: sidebarOpen ? 0 : 0 
          },
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }} />
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
});

DashboardLayout.displayName = 'DashboardLayout';