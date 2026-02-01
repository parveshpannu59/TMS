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
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, minWidth:0}}>
          <div style={{fontWeight:800, flex:1, minWidth:0}}>Notifications</div>
          <button className="dm-chip" onClick={onClose} style={{flexShrink:0}}>Close</button>
        </div>
        <div style={{overflow:'auto', display:'grid', gap:10, minWidth:0}}>
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
              <div key={id} className="dm-card" style={{display:'grid', gap:8, minWidth:0}}>
                <div className="dm-notif-header">
                  <div className="dm-notif-title" style={{fontWeight:700}}>Assignment</div>
                  <div className="dm-notif-chips">
                    <span className="dm-chip">{a.loadNumber || id.substring(0,6)}</span>
                  </div>
                </div>
                <div style={{display:'grid', gap:6, color:'var(--dm-muted)', fontSize:13, wordBreak:'break-word'}}>
                  <div>From: {a.pickupLocation?.city || '—'}</div>
                  <div>To: {a.deliveryLocation?.city || '—'}</div>
                </div>
                <div className="dm-notif-row">
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
            const ts = n.createdAt ? new Date(n.createdAt).toLocaleString() : '';
            const status = n.metadata?.status || n.status;
            const assignmentId = n.metadata?.assignmentId;
            const loadNumber = n.metadata?.loadNumber;
            const isNewLoadAssigned = (n.title || '').toLowerCase().includes('new load assigned') || (n.title || '').toLowerCase().includes('assigned');
            const canAcceptReject = isNewLoadAssigned && assignmentId && !status;

            return (
              <div key={id} className="dm-card" style={{display:'grid', gap:8, minWidth:0}}>
                <div className="dm-notif-header">
                  <div className="dm-notif-title" style={{fontWeight:600}}>{n.title || 'Notification'}</div>
                  <div className="dm-notif-chips">
                    {loadNumber && <span className="dm-chip">{loadNumber}</span>}
                    {status && !canAcceptReject && <span className="dm-chip">{String(status).toUpperCase()}</span>}
                  </div>
                </div>
                <div className="dm-notif-msg" style={{color:'var(--dm-muted)', fontSize:13}}>{n.message || n.description || '-'}</div>
                <div style={{fontSize:12, color:'var(--dm-muted)'}}>{ts}</div>
                {canAcceptReject ? (
                  <div className="dm-notif-row">
                    <button
                      className="dm-btn"
                      disabled={busy === assignmentId}
                      onClick={async () => {
                        setBusy(assignmentId);
                        try {
                          await accept(assignmentId);
                          await markAsRead(id);
                          onClose();
                          onAccepted?.(assignmentId);
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      Accept
                    </button>
                    <button
                      className="dm-btn ghost"
                      disabled={busy === assignmentId}
                      onClick={async () => {
                        setBusy(assignmentId);
                        try {
                          await reject(assignmentId);
                          await markAsRead(id);
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  !n.read && (
                    <button className="dm-chip" onClick={() => markAsRead(id)}>Mark as read</button>
                  )
                )}
              </div>
            );
          })}

          <a href="/history" className="dm-link" style={{textAlign:'center', padding:'8px 0'}}>View All Notifications</a>
        </div>
      </div>
    </div>
  );
}
