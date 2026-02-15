/**
 * OwnerShell — Unified layout for owner/dispatcher pages.
 *
 * Architecture:
 *   ┌────────────────────────────────────────────┐
 *   │  Top Nav Bar (56px)                        │
 *   │  Brand │ Dashboard Loads Drivers ... │ ⋮   │ Live │ 🔔 │ Profile ▾
 *   ├────────────────────────────────────────────┤
 *   │                                            │
 *   │  <Outlet />  (page content)                │
 *   │                                            │
 *   └────────────────────────────────────────────┘
 *
 *   ⋮ opens a left drawer with all nav items (the "More" menu).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Avatar, IconButton, Menu, MenuItem, Divider,
  Chip, Button, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Badge, useMediaQuery, alpha,
} from '@mui/material';
import {
  Logout, AccountBalance, Build, Assessment, History, Settings,
  MoreVert, KeyboardArrowDown, LocalShipping, People, Assignment,
  DirectionsCar, Chat, HelpOutline, Dashboard as DashboardIcon,
  Circle,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { getApiOrigin } from '@/api/client';
import { NotificationMenu } from '@components/common/NotificationMenu';
import { usePusherContext } from '@/contexts/PusherContext';
import { messageApi } from '@/api/message.api';

// ─── Constants ─────────────────────────────────────
const NAV_HEIGHT = 56;
const ACCENT = '#2563eb';

const MAIN_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Loads',     path: '/loads',     icon: <Assignment fontSize="small" /> },
  { label: 'Drivers',   path: '/drivers',   icon: <People fontSize="small" /> },
  { label: 'Vehicles',  path: '/vehicles',  icon: <DirectionsCar fontSize="small" /> },
  { label: 'Messages',  path: '/messages',  icon: <Chat fontSize="small" /> },
];

const MORE_NAV = [
  { label: 'Trip Management',  path: '/trips',       icon: <LocalShipping fontSize="small" /> },
  { label: 'Accounting',       path: '/accounting',  icon: <AccountBalance fontSize="small" /> },
  { label: 'Maintenance',      path: '/maintenance', icon: <Build fontSize="small" /> },
  { label: 'Resources',        path: '/resources',   icon: <Assessment fontSize="small" /> },
  { label: 'Activity History', path: '/history',     icon: <History fontSize="small" /> },
  { label: 'Users',            path: '/users',       icon: <People fontSize="small" /> },
  { label: 'Settings',         path: '/settings',    icon: <Settings fontSize="small" /> },
];

const ALL_NAV = [...MAIN_NAV, ...MORE_NAV];

// ─── Component ─────────────────────────────────────
export default function OwnerShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { connected } = usePusherContext();
  const isMobile = useMediaQuery('(max-width:768px)');

  const [profileMenu, setProfileMenu] = useState<null | HTMLElement>(null);
  const [moreMenu, setMoreMenu] = useState(false);

  // Unread message badge
  const { subscribe } = usePusherContext();
  const [msgUnread, setMsgUnread] = useState(0);
  const fetchUnread = useCallback(() => {
    messageApi.getUnreadCount().then(res => setMsgUnread(res.count || 0)).catch(() => {});
  }, []);
  useEffect(() => { fetchUnread(); const id = setInterval(fetchUnread, 30000); return () => clearInterval(id); }, [fetchUnread]);
  useEffect(() => { const unsub = subscribe('message-new', () => fetchUnread()); return unsub; }, [subscribe, fetchUnread]);
  useEffect(() => {
    const h = () => fetchUnread();
    window.addEventListener('messages-read', h);
    return () => window.removeEventListener('messages-read', h);
  }, [fetchUnread]);
  useEffect(() => { fetchUnread(); }, [location.pathname, fetchUnread]);

  // Active page title for the drawer
  const activeLabel = useMemo(() => {
    const item = ALL_NAV.find(n => location.pathname.startsWith(n.path));
    return item?.label || 'Dashboard';
  }, [location.pathname]);

  return (
    <Box sx={{ height: '100vh', bgcolor: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>

      {/* ═══════════════════ TOP NAV BAR ═══════════════════ */}
      <Box sx={{
        height: NAV_HEIGHT, bgcolor: '#fff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', px: { xs: 1.5, md: 3 },
        position: 'sticky', top: 0, zIndex: 1200,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Brand */}
        <Typography
          onClick={() => navigate('/dashboard')}
          sx={{
            fontWeight: 800, fontSize: 18, color: '#0f172a',
            mr: { xs: 1, md: 4 }, letterSpacing: -0.5,
            cursor: 'pointer', userSelect: 'none',
          }}
        >
          TMS
        </Typography>

        {/* ── Desktop Main Nav Links ── */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {MAIN_NAV.map(n => {
              const active = location.pathname === n.path
                || (n.path !== '/dashboard' && location.pathname.startsWith(n.path));
              return (
                <Button
                  key={n.path}
                  onClick={() => navigate(n.path)}
                  startIcon={n.path === '/messages' && msgUnread > 0 ? (
                    <Badge badgeContent={msgUnread} color="error"
                      sx={{ '& .MuiBadge-badge': { fontSize: 9, fontWeight: 800, minWidth: 14, height: 14 } }}>
                      {n.icon}
                    </Badge>
                  ) : undefined}
                  sx={{
                    textTransform: 'none', fontWeight: active ? 700 : 500,
                    color: active ? ACCENT : '#475569',
                    bgcolor: active ? alpha(ACCENT, 0.06) : 'transparent',
                    borderRadius: 2, px: 2, py: 0.8, fontSize: 13.5,
                    '&:hover': { bgcolor: alpha(ACCENT, 0.06), color: ACCENT },
                    minWidth: 0, position: 'relative',
                    ...(active && {
                      '&::after': {
                        content: '""', position: 'absolute', bottom: -1,
                        left: '20%', right: '20%', height: 2,
                        bgcolor: ACCENT, borderRadius: 1,
                      },
                    }),
                  }}
                >
                  {n.label}
                </Button>
              );
            })}
            {/* More button */}
            <IconButton
              size="small"
              onClick={() => setMoreMenu(true)}
              sx={{ color: '#94a3b8', ml: 0.5, '&:hover': { color: ACCENT } }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* ── Mobile: hamburger ── */}
        {isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#475569' }}>{activeLabel}</Typography>
            <IconButton onClick={() => setMoreMenu(true)} sx={{ color: '#64748b' }}>
              <MoreVert />
            </IconButton>
          </Box>
        )}

        <Box sx={{ flex: 1 }} />

        {/* ── Right side: LIVE, Notifications, Profile ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 } }}>
          {connected && (
            <Chip
              size="small" label="LIVE"
              sx={{
                height: 22, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                bgcolor: 'rgba(34,197,94,0.08)', color: '#22c55e',
                '& .MuiChip-label': { px: 1 },
                display: { xs: 'none', sm: 'flex' },
              }}
              icon={<Circle sx={{
                fontSize: '8px !important', color: '#22c55e',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.3 }, '100%': { opacity: 1 } },
              }} />}
            />
          )}

          <NotificationMenu />

          {/* Profile */}
          <Box
            onClick={(e) => setProfileMenu(e.currentTarget)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
              p: 0.5, borderRadius: 2, '&:hover': { bgcolor: '#f8fafc' },
            }}
          >
            <Avatar
              src={user?.profilePicture
                ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${getApiOrigin()}${user.profilePicture}`)
                : undefined}
              sx={{
                width: 34, height: 34, fontSize: 14, fontWeight: 700,
                background: user?.profilePicture ? 'transparent' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              }}
            >
              {!user?.profilePicture && (user?.name?.charAt(0)?.toUpperCase() || '?')}
            </Avatar>
            {!isMobile && (
              <Box sx={{ textAlign: 'left', lineHeight: 1.2 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{user?.name}</Typography>
                <Typography sx={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{user?.role}</Typography>
              </Box>
            )}
            <KeyboardArrowDown sx={{ fontSize: 18, color: '#94a3b8', display: { xs: 'none', sm: 'block' } }} />
          </Box>
        </Box>
      </Box>

      {/* ═══════════════════ PROFILE DROPDOWN ═══════════════════ */}
      <Menu
        anchorEl={profileMenu}
        open={!!profileMenu}
        onClose={() => setProfileMenu(null)}
        PaperProps={{
          sx: {
            mt: 1, borderRadius: 3, minWidth: 220,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography fontWeight={700} fontSize={14}>{user?.name}</Typography>
          <Typography fontSize={12} color="text.secondary">{user?.email}</Typography>
          <Chip label={user?.role} size="small"
            sx={{ mt: 0.5, height: 20, fontSize: 11, textTransform: 'capitalize',
              bgcolor: alpha(ACCENT, 0.08), color: ACCENT, fontWeight: 600 }} />
        </Box>
        <Divider />
        <MenuItem
          onClick={() => { setProfileMenu(null); navigate('/settings'); }}
          sx={{ mx: 1, borderRadius: 1, fontSize: 14, my: 0.5 }}
        >
          <Settings fontSize="small" sx={{ mr: 1.5, color: '#64748b' }} /> Settings
        </MenuItem>
        <MenuItem
          onClick={() => { setProfileMenu(null); logout(); }}
          sx={{ mx: 1, borderRadius: 1, fontSize: 14, color: '#ef4444' }}
        >
          <Logout fontSize="small" sx={{ mr: 1.5 }} /> Logout
        </MenuItem>
      </Menu>

      {/* ═══════════════════ MORE / DRAWER NAV ═══════════════════ */}
      <Drawer
        anchor="left"
        open={moreMenu}
        onClose={() => setMoreMenu(false)}
        PaperProps={{
          sx: {
            width: 300, borderRadius: '0 20px 20px 0',
            bgcolor: '#0f172a', color: '#fff',
          },
        }}
      >
        {/* Drawer header */}
        <Box sx={{
          px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
          borderBottom: '1px solid rgba(148,163,184,0.08)',
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
            <Typography sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              TMS Platform
            </Typography>
          </Box>
        </Box>

        {/* Nav items */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {/* Main section */}
          <Typography sx={{ px: 2.5, fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,0.5)', letterSpacing: 1.5, textTransform: 'uppercase', mb: 0.5 }}>
            Main
          </Typography>
          <List sx={{ px: 1.5 }}>
            {MAIN_NAV.map(n => {
              const active = location.pathname === n.path
                || (n.path !== '/dashboard' && location.pathname.startsWith(n.path));
              return (
                <ListItem key={n.path} disablePadding sx={{ mb: 0.3 }}>
                  <ListItemButton
                    selected={active}
                    onClick={() => { setMoreMenu(false); navigate(n.path); }}
                    sx={{
                      borderRadius: '10px', minHeight: 42, px: 1.5,
                      color: active ? '#fff' : 'rgba(148,163,184,0.7)',
                      bgcolor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(59,130,246,0.15)', color: '#fff',
                        '& .MuiListItemIcon-root': { color: '#3b82f6' },
                      },
                      '&:hover': { bgcolor: 'rgba(148,163,184,0.06)', color: '#e2e8f0' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: active ? '#3b82f6' : 'rgba(148,163,184,0.7)', '& svg': { fontSize: 20 } }}>
                      {n.path === '/messages' && msgUnread > 0 ? (
                        <Badge badgeContent={msgUnread} color="error"
                          sx={{ '& .MuiBadge-badge': { fontSize: 9, fontWeight: 800, minWidth: 16, height: 16 } }}>
                          {n.icon}
                        </Badge>
                      ) : n.icon}
                    </ListItemIcon>
                    <ListItemText primary={n.label}
                      primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400 }} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          {/* More section */}
          <Typography sx={{ px: 2.5, mt: 1.5, fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,0.5)', letterSpacing: 1.5, textTransform: 'uppercase', mb: 0.5 }}>
            More
          </Typography>
          <List sx={{ px: 1.5 }}>
            {MORE_NAV.map(n => {
              const active = location.pathname === n.path;
              return (
                <ListItem key={n.path} disablePadding sx={{ mb: 0.3 }}>
                  <ListItemButton
                    selected={active}
                    onClick={() => { setMoreMenu(false); navigate(n.path); }}
                    sx={{
                      borderRadius: '10px', minHeight: 42, px: 1.5,
                      color: active ? '#fff' : 'rgba(148,163,184,0.7)',
                      bgcolor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(59,130,246,0.15)', color: '#fff',
                        '& .MuiListItemIcon-root': { color: '#3b82f6' },
                      },
                      '&:hover': { bgcolor: 'rgba(148,163,184,0.06)', color: '#e2e8f0' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: active ? '#3b82f6' : 'rgba(148,163,184,0.7)', '& svg': { fontSize: 20 } }}>
                      {n.icon}
                    </ListItemIcon>
                    <ListItemText primary={n.label}
                      primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400 }} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Help */}
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid rgba(148,163,184,0.08)' }}>
          <Box
            onClick={() => window.open('mailto:support@haulxp.com')}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              color: 'rgba(148,163,184,0.7)', cursor: 'pointer', fontSize: '0.78rem',
              '&:hover': { color: '#3b82f6' },
            }}
          >
            <HelpOutline sx={{ fontSize: 16 }} />
            <Typography fontSize="0.78rem">Help & Support</Typography>
          </Box>
        </Box>

        {/* User card */}
        <Box sx={{ px: 2, py: 2, borderTop: '1px solid rgba(148,163,184,0.08)', bgcolor: '#1e293b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={user?.profilePicture
                ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${getApiOrigin()}${user.profilePicture}`)
                : undefined}
              sx={{
                width: 36, height: 36, fontWeight: 700, fontSize: '0.85rem',
                background: user?.profilePicture ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
              }}
            >
              {!user?.profilePicture && (user?.name?.charAt(0)?.toUpperCase() || 'U')}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </Typography>
              <Typography sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.72rem', textTransform: 'capitalize' }}>
                {user?.role}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* ═══════════════════ PAGE CONTENT ═══════════════════ */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
