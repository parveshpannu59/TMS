import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuth } from '../../utils/mobileAuth';
import './mobile.css';
import { useDriverAssignments } from '../../hooks/useDriverAssignments';
import { useDriverNotifications } from '../../hooks/useDriverNotifications';
import MobileAssignmentSheet from '../../components/driver/MobileAssignmentSheet';

export default function DriverMobileShell() {
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { pending } = useDriverAssignments(20000);
  const { unreadCount } = useDriverNotifications(20000);
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate('/driver/login', { replace: true });
  };

  return (
    <div className="dm-app">
      <header className="dm-appbar">
        <button className="dm-icon" onClick={() => setOpen(!open)} aria-label="Menu">⋮</button>
        <div className="dm-title">Driver</div>
        <div className="dm-actions">
          <button className="dm-icon" onClick={() => setSheetOpen(true)} aria-label="Notifications">
            <span className="dm-badge-wrap">🔔{(unreadCount || pending?.length) ? <span className="dm-badge">{Math.min(9, (unreadCount || 0) + (pending?.length || 0))}</span> : null}</span>
          </button>
          <button className="dm-icon" onClick={logout} aria-label="Logout">⎋</button>
        </div>
      </header>

      {/* Optional lightweight sheet for less-frequent links */}
      <nav className={`dm-drawer ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <div className="dm-drawer-panel" onClick={e => e.stopPropagation()}>
          <div className="dm-drawer-header">Quick links</div>
          <NavLink to="/driver/mobile/dashboard" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')}>Home</NavLink>
          <NavLink to="/driver/mobile/trips" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')}>Trips</NavLink>
          <NavLink to="/driver/mobile/messages" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')}>Messages</NavLink>
          <NavLink to="/driver/mobile/settings" className={({isActive}) => 'dm-item' + (isActive ? ' active' : '')}>Settings</NavLink>
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
          <div className="lbl">Home</div>
        </NavLink>
        <NavLink to="/driver/mobile/trips" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">🚚</div>
          <div className="lbl">Trips</div>
        </NavLink>
        <NavLink to="/driver/mobile/messages" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">💬</div>
          <div className="lbl">Chat</div>
        </NavLink>
        <NavLink to="/driver/mobile/settings" className={({isActive}) => 'dm-tab' + (isActive ? ' active' : '')}>
          <div className="ico">⚙️</div>
          <div className="lbl">Settings</div>
        </NavLink>
      </footer>
    </div>
  );
}
