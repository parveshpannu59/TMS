import React, { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard,
  People,
  LocalShipping,
  DirectionsCar,
  Assignment,
  AccountBalance,
} from '@mui/icons-material';
import { useAuth } from '@hooks/useAuth';
import { UserRole } from '../../types/user.types';

const DRAWER_WIDTH = 260;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
    roles: [UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.ACCOUNTANT],
  },
  {
    text: 'Users',
    icon: <People />,
    path: '/users',
    roles: [UserRole.OWNER],
  },
  {
    text: 'Loads',
    icon: <Assignment />,
    path: '/loads',
    roles: [UserRole.OWNER, UserRole.DISPATCHER],
  },
  {
    text: 'Drivers',
    icon: <LocalShipping />,
    path: '/drivers',
    roles: [UserRole.OWNER, UserRole.DISPATCHER],
  },
  {
    text: 'Trucks',
    icon: <DirectionsCar />,
    path: '/trucks',
    roles: [UserRole.OWNER, UserRole.DISPATCHER],
  },
  {
    text: 'Accounting',
    icon: <AccountBalance />,
    path: '/accounting',
    roles: [UserRole.OWNER, UserRole.ACCOUNTANT],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  desktopOpen?: boolean;
  onMobileClose?: () => void;
  onDesktopClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(
  ({ mobileOpen = false, desktopOpen = true, onMobileClose, onDesktopClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const theme = useTheme();

    const filteredMenuItems = useMemo(() => {
      if (!user) return [];
      return menuItems.filter((item) => item.roles.includes(user.role));
    }, [user]);

    const handleNavigation = useCallback(
      (path: string) => {
        navigate(path);
        // Close sidebar on mobile after navigation
        if (onMobileClose) {
          onMobileClose();
        }
      },
      [navigate, onMobileClose]
    );

    const drawerContent = (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Toolbar 
          sx={{ 
            bgcolor: 'primary.main',
            color: 'white',
            justifyContent: 'center',
            minHeight: '64px !important',
          }}
        >
          <Typography 
            variant="h5" 
            noWrap 
            component="div"
            sx={{ 
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            TMS
          </Typography>
        </Toolbar>
        <Divider />
        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <List sx={{ px: 1, py: 2 }}>
            {filteredMenuItems.map((item) => {
              const isSelected = location.pathname === item.path;
              return (
                <ListItem 
                  key={item.text} 
                  disablePadding
                  sx={{ mb: 0.5 }}
                >
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      borderRadius: 2,
                      minHeight: 48,
                      transition: 'all 0.3s ease-in-out',
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.main',
                        },
                      },
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: isSelected ? 'primary.main' : 'text.secondary',
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.95rem',
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
        <Divider />
        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            {user?.name}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            align="center" 
            display="block"
            sx={{ textTransform: 'capitalize', mt: 0.5 }}
          >
            {user?.role}
          </Typography>
        </Box>
      </Box>
    );

    return (
      <Box
        component="nav"
        sx={{ 
          width: { 
            xs: 0,
            sm: desktopOpen ? DRAWER_WIDTH : 0 
          }, 
          flexShrink: { sm: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
        aria-label="navigation menu"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onMobileClose}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundImage: 'none',
              boxShadow: theme.shadows[8],
            },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop drawer - now uses persistent variant */}
        <Drawer
          variant="persistent"
          open={desktopOpen}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundImage: 'none',
              borderRight: `1px solid ${theme.palette.divider}`,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export const SIDEBAR_WIDTH = DRAWER_WIDTH;