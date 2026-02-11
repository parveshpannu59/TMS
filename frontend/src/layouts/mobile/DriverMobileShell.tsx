import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearAuth, getAuth } from '../../utils/mobileAuth';
import { clearAuthToken, setAuthToken, getApiOrigin } from '../../api/client';
import { useDriverMobile } from '../../contexts/DriverMobileContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePusherContext } from '../../contexts/PusherContext';
import './mobile.css';
import { useDriverAssignments } from '../../hooks/useDriverAssignments';
import { useDriverNotifications } from '../../hooks/useDriverNotifications';
import { messageApi } from '../../api/message.api';
import MobileAssignmentSheet from '../../components/driver/MobileAssignmentSheet';

export default function DriverMobileShell() {
  const { t } = useTranslation();
  const { theme } = useDriverMobile();
  const { logout: authLogout } = useAuth();
  const { connected: pusherConnected } = usePusherContext();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, setRefresh] = useState(0);
  // When Pusher is connected, poll less frequently (60s fallback). Otherwise poll every 15s.
  const { pending, refresh: refreshAssignments } = useDriverAssignments(pusherConnected ? 60000 : 15000);

  // Sync token from mobile auth so API calls work (e.g. after page refresh)
  useEffect(() => {
    const auth = getAuth();
    if (auth?.accessToken) setAuthToken(auth.accessToken);
  }, []);

  // Refresh when profile picture is updated (from Settings)
  useEffect(() => {
    const handler = () => setRefresh((n) => n + 1);
    window.addEventListener('driver-profile-updated', handler);
    return () => window.removeEventListener('driver-profile-updated', handler);
  }, []);

  // When Pusher delivers a new assignment event, refresh assignments immediately
  const { subscribe } = usePusherContext();
  useEffect(() => {
    const unsub = subscribe('assignment-new', () => {
      refreshAssignments();
    });
    return unsub;
  }, [subscribe, refreshAssignments]);
  const { unreadCount } = useDriverNotifications(20000);
  const navigate = useNavigate();
  const location = useLocation();

  // ─── Unread message count (polled + Pusher-refreshed + event-refreshed) ───
  const [msgUnread, setMsgUnread] = useState(0);
  const fetchMsgUnread = useCallback(async () => {
    try {
      const res = await messageApi.getUnreadCount();
      setMsgUnread(res.count || 0);
    } catch { /* ignore */ }
  }, []);

  // Poll unread count every 30s, and immediately on mount
  useEffect(() => {
    fetchMsgUnread();
    const id = setInterval(fetchMsgUnread, 30000);
    return () => clearInterval(id);
  }, [fetchMsgUnread]);

  // Listen for 'messages-read' event from chat component to clear badge instantly
  useEffect(() => {
    const handler = () => fetchMsgUnread();
    window.addEventListener('messages-read', handler);
    return () => window.removeEventListener('messages-read', handler);
  }, [fetchMsgUnread]);

  // Also refresh badge whenever the user navigates to/from messages page
  useEffect(() => {
    fetchMsgUnread();
  }, [location.pathname, fetchMsgUnread]);

  // When Pusher delivers a new message, refresh unread count + show native notification
  useEffect(() => {
    const unsub = subscribe('message-new', (data: any) => {
      fetchMsgUnread();
      // Show native push notification if not on messages page
      if (!location.pathname.includes('/messages')) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(`Message from ${data.fromUserName || 'Someone'}`, {
              body: data.message?.slice(0, 100) || 'New message',
              tag: `msg-${data.messageId || Date.now()}`,
              icon: '/favicon.ico',
            });
          } catch { /* ignore */ }
        }
      }
    });
    return unsub;
  }, [subscribe, fetchMsgUnread, location.pathname]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const logout = () => {
    clearAuth();
    clearAuthToken();
    authLogout();
  };

  const auth = getAuth();
  const pic = auth?.user?.profilePicture;
  const avatarUrl = pic ? (pic.startsWith('http') ? pic : `${getApiOrigin()}${pic}`) : null;
  const totalBadge = (unreadCount || 0) + (pending?.length || 0) + (msgUnread || 0);

  return (
    <div className="dm-app" data-theme={theme}>
      {/* ─── iOS Navigation Bar ─── */}
      <header className="dm-appbar">
        <button
          className="dm-icon"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          style={{ fontSize: 24, fontWeight: 300 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="dm-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('users.driver')}
          {pusherConnected && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 8, fontWeight: 800, color: '#22c55e',
              background: 'rgba(34,197,94,0.12)', padding: '2px 6px',
              borderRadius: 6, letterSpacing: 0.5, textTransform: 'uppercase',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: '#22c55e',
                animation: 'pulse 2s infinite',
              }} />
              LIVE
            </span>
          )}
        </div>
        <div className="dm-actions">
          <button
            className="dm-icon"
            onClick={() => setSheetOpen(true)}
            aria-label="Notifications"
            style={{ position: 'relative' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {totalBadge > 0 && <span className="dm-badge">{Math.min(9, totalBadge)}</span>}
          </button>
          {avatarUrl ? (
            <button className="dm-icon" onClick={() => navigate('/driver/mobile/settings')} style={{ padding: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `url(${avatarUrl}) center/cover`,
                border: '2px solid var(--dm-accent)',
              }} />
            </button>
          ) : (
            <button className="dm-icon" onClick={() => navigate('/driver/mobile/settings')} style={{ padding: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--dm-accent), var(--dm-accent-2))',
                display: 'grid', placeItems: 'center',
                fontSize: 14, fontWeight: 600, color: '#fff',
              }}>
                {auth?.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            </button>
          )}
        </div>
      </header>

      {/* ─── iOS Side Drawer ─── */}
      <nav className={`dm-drawer ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <div className="dm-drawer-panel" onClick={e => e.stopPropagation()}>
          <div className="dm-drawer-header">{t('driverSettings.quickLinks', { defaultValue: 'Menu' })}</div>

          {/* Profile Section */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 12px', marginBottom: 12,
            background: 'var(--dm-fill)', borderRadius: 'var(--dm-radius)',
          }}>
            {avatarUrl ? (
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `url(${avatarUrl}) center/cover`, border: '2px solid var(--dm-accent)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--dm-accent), var(--dm-accent-2))', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                {auth?.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{auth?.user?.name || 'Driver'}</div>
              <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>{auth?.user?.email || 'driver'}</div>
            </div>
          </div>

          <NavLink to="/driver/mobile/dashboard" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')} onClick={() => setOpen(false)}>
            <span style={{ fontSize: 20, width: 28 }}>🏠</span> {t('driverSettings.home', { defaultValue: 'Home' })}
          </NavLink>
          <NavLink to="/driver/mobile/trips" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')} onClick={() => setOpen(false)}>
            <span style={{ fontSize: 20, width: 28 }}>📋</span> {t('driverSettings.trips', { defaultValue: 'My Loads' })}
          </NavLink>
          <NavLink to="/driver/mobile/messages" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')} onClick={() => setOpen(false)} style={{ position: 'relative' }}>
            <span style={{ fontSize: 20, width: 28 }}>💬</span> {t('driverSettings.chat', { defaultValue: 'Messages' })}
            {msgUnread > 0 && (
              <span style={{
                marginLeft: 'auto',
                minWidth: 22, height: 22, borderRadius: 11,
                background: '#ff3b30', color: '#fff',
                fontSize: 11, fontWeight: 800,
                display: 'grid', placeItems: 'center',
                padding: '0 6px', lineHeight: 1,
              }}>
                {msgUnread > 99 ? '99+' : msgUnread}
              </span>
            )}
          </NavLink>
          <NavLink to="/driver/mobile/settings" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')} onClick={() => setOpen(false)}>
            <span style={{ fontSize: 20, width: 28 }}>⚙️</span> {t('driverSettings.settings', { defaultValue: 'Settings' })}
          </NavLink>

          <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '0.5px solid var(--dm-separator)' }}>
            <button
              className="dm-item"
              onClick={logout}
              style={{ color: 'var(--dm-danger)', width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 17 }}
            >
              <span style={{ fontSize: 20, width: 28 }}>↪</span> {t('driverApp.signOut')}
            </button>
          </div>
        </div>
      </nav>

      <main className="dm-content dm-has-tabbar">
        <Outlet />
      </main>

      {/* Assignment/Notification Sheet */}
      {sheetOpen && (
        <MobileAssignmentSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onAccepted={() => {
            setSheetOpen(false);
            navigate('/driver/mobile/dashboard');
          }}
        />
      )}

      {/* ─── iOS Tab Bar ─── */}
      <footer className="dm-tabbar">
        <NavLink to="/driver/mobile/dashboard" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="lbl">{t('driverApp.home')}</div>
        </NavLink>
        <NavLink to="/driver/mobile/trips" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="lbl">{t('driverApp.myLoads')}</div>
        </NavLink>
        <NavLink to="/driver/mobile/messages" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico" style={{ position: 'relative' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {msgUnread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -8,
                minWidth: 18, height: 18, borderRadius: 9,
                background: '#ff3b30', color: '#fff',
                fontSize: 10, fontWeight: 800,
                display: 'grid', placeItems: 'center',
                padding: '0 4px', lineHeight: 1,
                boxShadow: '0 1px 3px rgba(255,59,48,0.4)',
              }}>
                {msgUnread > 99 ? '99+' : msgUnread}
              </span>
            )}
          </div>
          <div className="lbl">{t('driverApp.messages')}</div>
        </NavLink>
        <NavLink to="/driver/mobile/settings" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="lbl">{t('driverApp.profile')}</div>
        </NavLink>
      </footer>
    </div>
  );
}
