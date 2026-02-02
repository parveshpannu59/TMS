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

  return (
    <div className="dm-app" data-theme={theme}>
      <header className="dm-appbar">
        <button className="dm-icon" onClick={() => setOpen(!open)} aria-label="Menu">⋮</button>
        <div className="dm-title">{t('users.driver', { defaultValue: 'Driver' })}</div>
        <div className="dm-actions" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(() => {
            const auth = getAuth();
            const pic = auth?.user?.profilePicture;
            const url = pic ? (pic.startsWith('http') ? pic : `${getApiOrigin()}${pic}`) : null;
            return url ? (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `url(${url}) center/cover`, border: '2px solid var(--dm-accent)' }} aria-hidden />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--dm-border)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700 }}>{auth?.user?.name?.charAt(0) || '?'}</div>
            );
          })()}
          <button className="dm-icon" onClick={() => setSheetOpen(true)} aria-label="Notifications">
            <span className="dm-badge-wrap">🔔{(unreadCount || pending?.length) ? <span className="dm-badge">{Math.min(9, (unreadCount || 0) + (pending?.length || 0))}</span> : null}</span>
          </button>
          <button className="dm-icon" onClick={logout} aria-label="Logout">⎋</button>
        </div>
      </header>

      {/* Optional lightweight sheet for less-frequent links */}
      <nav className={`dm-drawer ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <div className="dm-drawer-panel" onClick={e => e.stopPropagation()}>
          <div className="dm-drawer-header">{t('driverSettings.quickLinks')}</div>
          <NavLink to="/driver/mobile/dashboard" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')}>{t('driverSettings.home')}</NavLink>
          <NavLink to="/driver/mobile/trips" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')}>{t('driverSettings.trips')}</NavLink>
          <NavLink to="/driver/mobile/messages" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')}>{t('driverSettings.chat')}</NavLink>
          <NavLink to="/driver/mobile/settings" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')}>{t('driverSettings.settings')}</NavLink>
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

      <footer className="dm-tabbar">
        <NavLink to="/driver/mobile/dashboard" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">🏠</div>
          <div className="lbl">{t('driverSettings.home')}</div>
        </NavLink>
        <NavLink to="/driver/mobile/trips" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">🚚</div>
          <div className="lbl">{t('driverSettings.trips')}</div>
        </NavLink>
        <NavLink to="/driver/mobile/messages" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">💬</div>
          <div className="lbl">{t('driverSettings.chat')}</div>
        </NavLink>
        <NavLink to="/driver/mobile/settings" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">⚙️</div>
          <div className="lbl">{t('driverSettings.settings')}</div>
        </NavLink>
      </footer>
    </div>
  );
}
