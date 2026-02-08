import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearAuth, getAuth } from '../../utils/mobileAuth';
import { clearAuthToken, setAuthToken, getApiOrigin } from '../../api/client';
import { useDriverMobile } from '../../contexts/DriverMobileContext';
import { useAuth } from '../../contexts/AuthContext';
import './mobile.css';
import { useDriverAssignments } from '../../hooks/useDriverAssignments';
import { useDriverNotifications } from '../../hooks/useDriverNotifications';
import MobileAssignmentSheet from '../../components/driver/MobileAssignmentSheet';

export default function DriverMobileShell() {
  const { t } = useTranslation();
  const { theme } = useDriverMobile();
  const { logout: authLogout } = useAuth();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, setRefresh] = useState(0);
  const { pending } = useDriverAssignments(20000);

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
  const { unreadCount } = useDriverNotifications(20000);
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    clearAuthToken();
    authLogout();
  };

  const auth = getAuth();
  const pic = auth?.user?.profilePicture;
  const avatarUrl = pic ? (pic.startsWith('http') ? pic : `${getApiOrigin()}${pic}`) : null;
  const totalBadge = (unreadCount || 0) + (pending?.length || 0);

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
        <div className="dm-title">{t('users.driver')}</div>
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
          <NavLink to="/driver/mobile/messages" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')} onClick={() => setOpen(false)}>
            <span style={{ fontSize: 20, width: 28 }}>💬</span> {t('driverSettings.chat', { defaultValue: 'Messages' })}
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
          <div className="ico">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
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
