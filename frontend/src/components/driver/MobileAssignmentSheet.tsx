import { useState } from 'react';
import { useDriverAssignments } from '../../hooks/useDriverAssignments';
import { useDriverNotifications } from '../../hooks/useDriverNotifications';
import '../../layouts/mobile/mobile.css';

export default function MobileAssignmentSheet({ open, onClose, onAccepted }: { open: boolean; onClose: () => void; onAccepted?: (assignmentId: string) => void; }) {
  const { pending, loading, error, accept, reject } = useDriverAssignments(15000);
  const { notifications, unreadCount, markAsRead } = useDriverNotifications(20000);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className={`dm-drawer ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="dm-drawer-panel" onClick={e => e.stopPropagation()} style={{height:'100%', display:'grid', gridTemplateRows:'auto 1fr', gap:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontWeight:800}}>Notifications</div>
          <button className="dm-chip" onClick={onClose}>Close</button>
        </div>
        <div style={{overflow:'auto', display:'grid', gap:10}}>
          {error && <div style={{color:'#ff8080', fontSize:13}}>{error}</div>}
          {loading && <div style={{color:'var(--dm-muted)'}}>Loading…</div>}

          {/* Pending Assignments */}
          <div style={{fontWeight:700}}>Pending Assignments</div>
          {(!pending || pending.length === 0) && !loading && (
            <div style={{color:'var(--dm-muted)'}}>No new assignments</div>
          )}
          {pending.map((a) => {
            const id = a.id || a._id!;
            return (
              <div key={id} className="dm-card" style={{display:'grid', gap:8}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontWeight:700}}>Assignment</div>
                  <div className="dm-chip">{a.loadNumber || id.substring(0,6)}</div>
                </div>
                <div style={{display:'grid', gap:6, color:'var(--dm-muted)', fontSize:13}}>
                  <div>From: {a.pickupLocation?.city || '—'}</div>
                  <div>To: {a.deliveryLocation?.city || '—'}</div>
                </div>
                <div className="dm-row">
                  <button className="dm-btn" disabled={busy===id} onClick={async() => { setBusy(id); try { await accept(id); onAccepted?.(id); } finally { setBusy(null);} }}>Accept</button>
                  <button className="dm-btn ghost" disabled={busy===id} onClick={async() => { setBusy(id); try { await reject(id); } finally { setBusy(null);} }}>Decline</button>
                </div>
              </div>
            );
          })}

          {/* Recent Notifications */}
          <div style={{fontWeight:700, marginTop:6}}>Recent</div>
          {(!notifications || notifications.length === 0) && (
            <div style={{color:'var(--dm-muted)'}}>No notifications</div>
          )}
          {notifications.map((n: any) => {
            const id = n.id || n._id;
            const type = (n.type || '').toString().toUpperCase();
            const ts = n.createdAt ? new Date(n.createdAt).toLocaleString() : '';
            const status = n.metadata?.status || n.status;
            return (
              <div key={id} className="dm-card" style={{display:'grid', gap:6}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontWeight:600}}>{n.title || 'Notification'}</div>
                  {status && <div className="dm-chip">{String(status).toUpperCase()}</div>}
                </div>
                <div style={{color:'var(--dm-muted)', fontSize:13}}>{n.message || n.description || '-'}</div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontSize:12, color:'var(--dm-muted)'}}>{ts}</div>
                  {!n.read && (
                    <button className="dm-chip" onClick={() => markAsRead(id)}>Mark as read</button>
                  )}
                </div>
              </div>
            );
          })}

          <a href="/history" className="dm-link" style={{textAlign:'center', padding:'8px 0'}}>View All Notifications</a>
        </div>
      </div>
    </div>
  );
}
