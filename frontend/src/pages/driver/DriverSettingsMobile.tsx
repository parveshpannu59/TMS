import '../../layouts/mobile/mobile.css';
import { clearAuth, getAuth, saveAuth } from '../../utils/mobileAuth';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function DriverSettingsMobile() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [online, setOnline] = useState(true);

  return (
    <div className="dm-content" style={{display:'grid', gap:12}}>
      <div className="dm-card" style={{display:'grid', gap:10}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontWeight:700}}>Availability</div>
          <button
            className="dm-chip"
            onClick={() => setOnline(v => !v)}
            aria-label="Toggle availability"
          >
            {online ? 'Online' : 'Offline'}
          </button>
        </div>
        <div style={{color:'var(--dm-muted)', fontSize:13}}>You will receive new trip assignments when Online.</div>
      </div>

      <div className="dm-card" style={{display:'grid', gap:8}}>
        <div style={{fontWeight:700}}>Profile</div>
        <div style={{fontSize:13, color:'var(--dm-muted)'}}>Name</div>
        <div>{auth?.user?.name || '—'}</div>
        <div style={{fontSize:13, color:'var(--dm-muted)'}}>Phone</div>
        <div>{auth?.user?.phone || '—'}</div>
        <div style={{fontSize:13, color:'var(--dm-muted)'}}>Email</div>
        <div>{auth?.user?.email || '—'}</div>
      </div>

      <div className="dm-card" style={{display:'grid', gap:10}}>
        <div style={{fontWeight:700}}>App</div>
        <button
          className="dm-btn ghost"
          onClick={() => navigate('/driver/mobile/dashboard')}
        >
          Back to Home
        </button>
        <button
          className="dm-btn"
          onClick={() => { clearAuth(); navigate('/driver/login', { replace: true }); }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
