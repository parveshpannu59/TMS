import { useEffect, useMemo, useState } from 'react';
import '../../layouts/mobile/mobile.css';

function vibrate(pattern: number | number[]) {
  if (navigator && 'vibrate' in navigator) {
    // @ts-ignore
    navigator.vibrate(pattern);
  }
}

export default function DriverDashboardMobile() {
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [tripState, setTripState] = useState<'idle' | 'in_progress' | 'completed'>('idle');
  const [kpis, setKpis] = useState({ earningsToday: 0, tripsToday: 0, onTimeRate: 100 });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const primaryAction = useMemo(() => {
    if (tripState === 'idle') return { label: 'Start Trip', onClick: () => { vibrate(30); setTripState('in_progress'); setToast('Trip started'); } };
    if (tripState === 'in_progress') return { label: 'End Trip', onClick: () => { vibrate([30, 40, 30]); setTripState('completed'); setToast('Trip ended'); } };
    return { label: 'New Trip', onClick: () => { setTripState('idle'); setToast('Ready for new trip'); } };
  }, [tripState]);

  return (
    <div className="dm-content" style={{display:'grid', gap:12}}>
      {/* Availability & Today summary (above the fold) */}
      <div className="dm-card" style={{display:'grid', gap:10}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontWeight:800, letterSpacing:.3}}>Today</div>
          <button className="dm-chip" onClick={() => { setOnline(v=>!v); vibrate(15); setToast(online ? 'You are Offline' : 'You are Online'); }}>
            {online ? 'Online' : 'Offline'}
          </button>
        </div>
        <div className="dm-row">
          <div className="dm-card" style={{padding:12}}>
            <div style={{fontSize:12, color:'var(--dm-muted)'}}>Next Stop</div>
            <div style={{fontWeight:700}}>—</div>
          </div>
          <div className="dm-card" style={{padding:12}}>
            <div style={{fontSize:12, color:'var(--dm-muted)'}}>ETA</div>
            <div style={{fontWeight:700}}>—</div>
          </div>
        </div>
        <div className="dm-row">
          <button className="dm-btn" onClick={primaryAction.onClick}>{primaryAction.label}</button>
          <button className="dm-btn secondary" onClick={() => { vibrate(25); setToast('Open camera to scan POD'); }}>Scan POD</button>
        </div>
      </div>

      {/* KPIs compact row */}
      <div className="dm-row">
        <div className="dm-card" style={{textAlign:'center'}}>
          <div style={{fontSize:12, color:'var(--dm-muted)'}}>Earnings Today</div>
          <div style={{fontWeight:800, fontSize:22}}>${kpis.earningsToday.toFixed(0)}</div>
        </div>
        <div className="dm-card" style={{textAlign:'center'}}>
          <div style={{fontSize:12, color:'var(--dm-muted)'}}>Trips</div>
          <div style={{fontWeight:800, fontSize:22}}>{kpis.tripsToday}</div>
        </div>
        <div className="dm-card" style={{textAlign:'center'}}>
          <div style={{fontSize:12, color:'var(--dm-muted)'}}>On-time</div>
          <div style={{fontWeight:800, fontSize:22}}>{kpis.onTimeRate}%</div>
        </div>
      </div>

      {/* Active Trip preview with tiny map area */}
      <div className="dm-card" style={{display:'grid', gap:8}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontWeight:700}}>Active Trip</div>
          <div className="dm-chip">{tripState === 'in_progress' ? 'In Progress' : '—'}</div>
        </div>
        <div style={{height:120, background:'#0b1220', border:'1px solid var(--dm-border)', borderRadius:12, display:'grid', placeItems:'center', color:'var(--dm-muted)'}}>
          Map preview
        </div>
        <div className="dm-row">
          <div className="dm-card" style={{padding:10}}>
            <div style={{fontSize:12, color:'var(--dm-muted)'}}>Time</div>
            <div style={{fontWeight:700}}>—</div>
          </div>
          <div className="dm-card" style={{padding:10}}>
            <div style={{fontSize:12, color:'var(--dm-muted)'}}>Earnings</div>
            <div style={{fontWeight:700}}>${kpis.earningsToday.toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="dm-card" style={{display:'grid', gap:10}}>
        <div style={{fontWeight:700}}>Shortcuts</div>
        <div className="dm-row">
          <button className="dm-chip" onClick={() => setToast('Calling dispatch…')}>Call Dispatch</button>
          <button className="dm-chip" onClick={() => setToast('Delay reported')}>Report Delay</button>
          <button className="dm-chip" onClick={() => setToast('SOS sent')}>SOS</button>
        </div>
      </div>

      {toast && (
        <div style={{position:'fixed', left:0, right:0, bottom:90, display:'grid', placeItems:'center', pointerEvents:'none'}}>
          <div style={{background:'rgba(0,0,0,0.85)', color:'#fff', padding:'10px 14px', borderRadius:999, fontSize:13}}>{toast}</div>
        </div>
      )}
    </div>
  );
}
