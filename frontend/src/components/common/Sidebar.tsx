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
  Avatar,
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
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
        <Toolbar 
          sx={{ 
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            color: 'white',
            justifyContent: 'center',
            minHeight: '64px !important',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
          }}
        >
          <Typography 
            variant="h5" 
            noWrap 
            component="div"
            sx={{ 
              fontWeight: 700,
              letterSpacing: 0.5,
              fontSize: '1.5rem',
            }}
          >
            TMS
          </Typography>
        </Toolbar>
        <Divider />
        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5 }}>
          <List sx={{ px: 1.5 }}>
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
                      minHeight: 44,
                      px: 2,
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                        color: 'primary.main',
                        fontWeight: 600,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 3,
                          height: '60%',
                          bgcolor: 'primary.main',
                          borderRadius: '0 2px 2px 0',
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.main',
                        },
                      },
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateX(2px)',
                      },
                      '@media (prefers-reduced-motion: reduce)': {
                        transition: 'none',
                        '&:hover': {
                          transform: 'none',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: isSelected ? 'primary.main' : 'text.secondary',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.9375rem',
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
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main',
                width: 36,
                height: 36,
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body2" 
                fontWeight={600}
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  textTransform: 'capitalize',
                  fontSize: '0.75rem',
                  display: 'block',
                }}
              >
                {user?.role}
              </Typography>
            </Box>
          </Box>
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
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              borderRight: `1px solid ${theme.palette.divider}`,
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
              boxShadow: 'none',
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