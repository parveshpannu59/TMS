import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  useTheme,
  Avatar,
} from '@mui/material';
import {
  Dashboard,
  People,
  LocalShipping,
  DirectionsCar,
  Assignment,
  AccountBalance,
  Build,
  Assessment,
  History,
  Settings,
  HelpOutline,
  Chat,
} from '@mui/icons-material';
import { Link, Badge } from '@mui/material';
import { useAuth } from '@hooks/useAuth';
import { getApiOrigin } from '@/api/client';
import { UserRole } from '../../types/user.types';
import { useTranslation } from 'react-i18next';
import { messageApi } from '@/api/message.api';
import { usePusherContext } from '@/contexts/PusherContext';

const DRAWER_WIDTH = 260;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles: UserRole[];
}

const getMenuItems = (t: (key: string) => string): MenuItem[] => [
  { text: t('navigation.dashboard'), icon: <Dashboard />, path: '/dashboard', roles: [UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.ACCOUNTANT] },
  { text: 'Pending Assignments', icon: <Assignment />, path: '/assignments', roles: [UserRole.DRIVER] },
  { text: t('navigation.users'), icon: <People />, path: '/users', roles: [UserRole.OWNER] },
  { text: t('navigation.loads'), icon: <Assignment />, path: '/loads', roles: [UserRole.OWNER, UserRole.DISPATCHER] },
  { text: t('navigation.drivers'), icon: <LocalShipping />, path: '/drivers', roles: [UserRole.OWNER, UserRole.DISPATCHER] },
  { text: t('navigation.tripManagement'), icon: <Assignment />, path: '/trips', roles: [UserRole.OWNER, UserRole.DISPATCHER] },
  { text: 'Vehicles', icon: <DirectionsCar />, path: '/vehicles', roles: [UserRole.OWNER, UserRole.DISPATCHER] },
  { text: t('navigation.accounting'), icon: <AccountBalance />, path: '/accounting', roles: [UserRole.OWNER, UserRole.ACCOUNTANT] },
  { text: t('navigation.maintenance'), icon: <Build />, path: '/maintenance', roles: [UserRole.OWNER, UserRole.DISPATCHER] },
  { text: t('navigation.resources'), icon: <Assessment />, path: '/resources', roles: [UserRole.OWNER, UserRole.DISPATCHER] },
  { text: 'Messages', icon: <Chat />, path: '/messages', roles: [UserRole.OWNER, UserRole.DISPATCHER] },
  { text: t('navigation.activityHistory'), icon: <History />, path: '/history', roles: [UserRole.OWNER, UserRole.DISPATCHER] },
  { text: t('navigation.settings'), icon: <Settings />, path: '/settings', roles: [UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.ACCOUNTANT] },
];

interface SidebarProps {
  mobileOpen?: boolean;
  desktopOpen?: boolean;
  onMobileClose?: () => void;
  onDesktopClose?: () => void;
}

// ── Dark Navy Sidebar ──────────────────────────────
const NAVY = '#0f172a';
const NAVY_LIGHT = '#1e293b';
const NAVY_BORDER = 'rgba(148,163,184,0.08)';
const TEXT_DIM = 'rgba(148,163,184,0.7)';
const TEXT_LIGHT = '#e2e8f0';
const ACCENT = '#3b82f6';

export const Sidebar: React.FC<SidebarProps> = React.memo(
  ({ mobileOpen = false, desktopOpen = true, onMobileClose, onDesktopClose: _onDesktopClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const theme = useTheme();
    const { t } = useTranslation();
    const { subscribe } = usePusherContext();

    const [msgUnread, setMsgUnread] = useState(0);
    const fetchUnread = useCallback(() => {
      messageApi.getUnreadCount().then(res => setMsgUnread(res.count || 0)).catch(() => {});
    }, []);

    useEffect(() => { fetchUnread(); const id = setInterval(fetchUnread, 30000); return () => clearInterval(id); }, [fetchUnread]);
    useEffect(() => { const unsub = subscribe('message-new', () => fetchUnread()); return unsub; }, [subscribe, fetchUnread]);
    useEffect(() => { const h = () => fetchUnread(); window.addEventListener('messages-read', h); return () => window.removeEventListener('messages-read', h); }, [fetchUnread]);
    useEffect(() => { fetchUnread(); }, [location.pathname, fetchUnread]);

    const filteredMenuItems = useMemo(() => {
      if (!user) return [];
      return getMenuItems(t).filter((item) => item.roles.includes(user.role));
    }, [user, t]);

    const handleNavigation = useCallback(
      (path: string) => {
        navigate(path);
        if (onMobileClose) onMobileClose();
      },
      [navigate, onMobileClose]
    );

    const drawerContent = (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: NAVY }}>
        {/* Logo */}
        <Box sx={{
          px: 2.5, py: 2.5,
          display: 'flex', alignItems: 'center', gap: 1.5,
          borderBottom: `1px solid ${NAVY_BORDER}`,
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
          }}>
            <LocalShipping sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: '1.15rem', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              Haulxp
            </Typography>
            <Typography sx={{ color: TEXT_DIM, fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              TMS Platform
            </Typography>
          </Box>
        </Box>

        {/* Nav items */}
        <Box sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1.5,
          /* Invisible scrollbar */
          scrollbarWidth: 'none',          /* Firefox */
          msOverflowStyle: 'none',         /* IE / Edge */
          '&::-webkit-scrollbar': {        /* Chrome / Safari */
            display: 'none',
          },
        }}>
          <List sx={{ px: 1.5 }}>
            {filteredMenuItems.map((item) => {
              const isSelected = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.3 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      borderRadius: '10px',
                      minHeight: 42,
                      px: 1.5,
                      transition: 'all 0.15s',
                      color: isSelected ? '#fff' : TEXT_DIM,
                      bgcolor: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(59,130,246,0.15)',
                        color: '#fff',
                        '&:hover': { bgcolor: 'rgba(59,130,246,0.2)' },
                        '& .MuiListItemIcon-root': { color: ACCENT },
                        '&::before': {
                          content: '""', position: 'absolute',
                          left: 0, top: '50%', transform: 'translateY(-50%)',
                          width: 3, height: '55%',
                          bgcolor: ACCENT, borderRadius: '0 3px 3px 0',
                        },
                      },
                      '&:hover': {
                        bgcolor: 'rgba(148,163,184,0.06)',
                        color: TEXT_LIGHT,
                        '& .MuiListItemIcon-root': { color: TEXT_LIGHT },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: isSelected ? ACCENT : TEXT_DIM, transition: 'color 0.15s', '& svg': { fontSize: 20 } }}>
                      {item.path === '/messages' && msgUnread > 0 ? (
                        <Badge
                          badgeContent={msgUnread > 99 ? '99+' : msgUnread}
                          color="error"
                          sx={{ '& .MuiBadge-badge': { fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8 } }}
                        >
                          {item.icon}
                        </Badge>
                      ) : item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 600 : (item.path === '/messages' && msgUnread > 0 ? 600 : 400),
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Help */}
        <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${NAVY_BORDER}` }}>
          <Link
            href="mailto:support@yourdomain.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              color: TEXT_DIM, textDecoration: 'none', fontSize: '0.78rem',
              '&:hover': { color: ACCENT },
            }}
          >
            <HelpOutline sx={{ fontSize: 16 }} />
            {t('driverSettings.helpSupport', { defaultValue: 'Help & Support' })}
          </Link>
        </Box>

        {/* User card */}
        <Box sx={{
          px: 2, py: 2,
          borderTop: `1px solid ${NAVY_BORDER}`,
          bgcolor: NAVY_LIGHT,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={
                user?.profilePicture
                  ? (user.profilePicture.startsWith('http')
                      ? user.profilePicture
                      : `${getApiOrigin()}${user.profilePicture}`)
                  : undefined
              }
              sx={{
                width: 36, height: 36, fontWeight: 700, fontSize: '0.85rem',
                background: user?.profilePicture ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                boxShadow: '0 2px 10px rgba(59,130,246,0.25)',
              }}
            >
              {!user?.profilePicture && (user?.name?.charAt(0).toUpperCase() || 'U')}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name}
              </Typography>
              <Typography sx={{ color: TEXT_DIM, fontSize: '0.72rem', textTransform: 'capitalize' }}>
                {user?.role}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );

    const drawerPaperSx = {
      boxSizing: 'border-box',
      width: DRAWER_WIDTH,
      backgroundImage: 'none',
      bgcolor: NAVY,
      border: 'none',
    };

    return (
      <Box
        component="nav"
        sx={{
          width: { xs: 0, sm: desktopOpen ? DRAWER_WIDTH : 0 },
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
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { ...drawerPaperSx, boxShadow: '4px 0 20px rgba(0,0,0,0.3)' },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="persistent"
          open={desktopOpen}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              ...drawerPaperSx,
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
