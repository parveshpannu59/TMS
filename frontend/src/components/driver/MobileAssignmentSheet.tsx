import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDriverAssignments } from '../../hooks/useDriverAssignments';
import { useDriverNotifications } from '../../hooks/useDriverNotifications';
import '../../layouts/mobile/mobile.css';

// Mobile assignment notification sheet for driver
export default function MobileAssignmentSheet({ open, onClose, onAccepted }: {
  open: boolean;
  onClose: () => void;
  onAccepted?: (assignmentId: string) => void;
}) {
  const { t } = useTranslation();
  const { pending, loading, error, accept, reject } = useDriverAssignments(15000);
  const { notifications, unreadCount, markAsRead } = useDriverNotifications(20000);
  const [busy, setBusy] = useState<string | null>(null);

  const ios = { blue: '#007aff', green: '#34c759', red: '#ff3b30' };

  return (
    <div className={`dm-drawer ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="dm-drawer-panel" onClick={e => e.stopPropagation()} style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: -0.5 }}>{t('driverApp.notifications')}</div>
          <button
            className="dm-chip"
            onClick={onClose}
            style={{ fontSize: 14, fontWeight: 500, padding: '6px 14px' }}
          >
            {t('driverApp.done')}
          </button>
        </div>

        <div style={{ overflow: 'auto', display: 'grid', gap: 12, minWidth: 0, alignContent: 'start' }}>
          {error && <div style={{ color: ios.red, fontSize: 14, padding: '8px 0' }}>{error}</div>}
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--dm-muted)', padding: 24 }}>
              {t('common.loading')}
            </div>
          )}

          {/* ─── Pending Assignments ─── */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dm-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('driverApp.pendingAssignments')}
          </div>

          {(!pending || pending.length === 0) && !loading && (
            <div style={{ color: 'var(--dm-muted)', fontSize: 14, padding: '8px 0' }}>{t('driverApp.noNewAssignments')}</div>
          )}

          {pending.map((a) => {
            const id = a.id || a._id!;
            // Load data is populated via loadId
            const load = (a as any).loadId || {};
            const pickup = load.pickupLocation || a.pickupLocation || {};
            const delivery = load.deliveryLocation || a.deliveryLocation || {};
            const loadNum = load.loadNumber || a.loadNumber || id.substring(0, 6);
            const rate = load.rate || 0;
            const distance = load.distance || load.miles || 0;
            const truckInfo = (a as any).truckId;
            const trailerInfo = (a as any).trailerId;

            // Format location: prefer city,state — fallback to address or name
            const fmtLoc = (loc: any) => {
              if (!loc) return '—';
              if (loc.city && loc.city.trim()) return `${loc.city}${loc.state ? ', ' + loc.state : ''}`;
              if (loc.address && loc.address.trim()) return loc.address;
              if (loc.name && loc.name.trim()) return loc.name;
              return '—';
            };

            return (
              <div key={id} className="dm-card" style={{ display: 'grid', gap: 10, padding: 16 }}>
                {/* Header: title + load number */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{t('driverApp.newAssignment')}</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: `${ios.blue}18`, color: ios.blue,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {loadNum}
                  </span>
                </div>

                {/* From / To locations */}
                <div style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: ios.green, display: 'inline-block', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--dm-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Pickup</div>
                      <div style={{ fontWeight: 600, color: 'var(--dm-text)', lineHeight: 1.3 }}>{fmtLoc(pickup)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: ios.red, display: 'inline-block', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--dm-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Delivery</div>
                      <div style={{ fontWeight: 600, color: 'var(--dm-text)', lineHeight: 1.3 }}>{fmtLoc(delivery)}</div>
                    </div>
                  </div>
                </div>

                {/* Rate + Distance + Vehicle */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8,
                  padding: '8px 0', borderTop: '1px solid var(--dm-fill)',
                }}>
                  {rate > 0 && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: `${ios.green}15`, color: ios.green,
                      fontSize: 13, fontWeight: 700,
                    }}>
                      ${rate.toLocaleString()}
                    </span>
                  )}
                  {distance > 0 && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: 'var(--dm-fill)',
                      fontSize: 12, fontWeight: 600, color: 'var(--dm-muted)',
                    }}>
                      {distance} mi
                    </span>
                  )}
                  {truckInfo && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: `${ios.blue}12`, color: ios.blue,
                      fontSize: 12, fontWeight: 600,
                    }}>
                      🚛 Truck: {truckInfo.unitNumber || truckInfo.make || 'Assigned'}
                    </span>
                  )}
                  {trailerInfo && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: `${ios.blue}12`, color: ios.blue,
                      fontSize: 12, fontWeight: 600,
                    }}>
                      🚚 Trailer: {trailerInfo.unitNumber || trailerInfo.type || 'Assigned'}
                    </span>
                  )}
                  {!truckInfo && !trailerInfo && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: 'var(--dm-fill)',
                      fontSize: 12, fontWeight: 600, color: 'var(--dm-muted)',
                    }}>
                      No vehicle info
                    </span>
                  )}
                </div>

                {/* Accept / Decline buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    className="dm-btn"
                    disabled={busy === id}
                    onClick={async () => { setBusy(id); try { await accept(id); onAccepted?.(id); } finally { setBusy(null); } }}
                    style={{ borderRadius: 50, fontSize: 15, padding: '12px 16px', background: ios.green }}
                  >
                    {t('driverApp.accept')}
                  </button>
                  <button
                    className="dm-btn ghost"
                    disabled={busy === id}
                    onClick={async () => { setBusy(id); try { await reject(id); } finally { setBusy(null); } }}
                    style={{ borderRadius: 50, fontSize: 15, padding: '12px 16px' }}
                  >
                    {t('driverApp.decline')}
                  </button>
                </div>
              </div>
            );
          })}

          {/* ─── Recent Notifications ─── */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dm-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
            {t('driverApp.recent')}
          </div>

          {(!notifications || notifications.length === 0) && (
            <div style={{ color: 'var(--dm-muted)', fontSize: 14, padding: '8px 0' }}>{t('driverApp.noNotifications')}</div>
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
              <div key={id} className="dm-card" style={{ display: 'grid', gap: 8, opacity: n.read ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{n.title || t('driverApp.notification')}</div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {loadNumber && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 20,
                        background: 'var(--dm-fill)', fontSize: 11, fontWeight: 600,
                      }}>
                        {loadNumber}
                      </span>
                    )}
                    {status && !canAcceptReject && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 20,
                        background: 'var(--dm-fill)', fontSize: 11, fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {String(status)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: 'var(--dm-muted)', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {n.message || n.description || '-'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>{ts}</div>
                {canAcceptReject ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      className="dm-btn"
                      disabled={busy === assignmentId}
                      onClick={async () => {
                        setBusy(assignmentId);
                        try { await accept(assignmentId); await markAsRead(id); onClose(); onAccepted?.(assignmentId); }
                        finally { setBusy(null); }
                      }}
                      style={{ borderRadius: 50, fontSize: 14, padding: '10px 16px', background: ios.green }}
                    >
                      {t('driverApp.accept')}
                    </button>
                    <button
                      className="dm-btn ghost"
                      disabled={busy === assignmentId}
                      onClick={async () => {
                        setBusy(assignmentId);
                        try { await reject(assignmentId); await markAsRead(id); }
                        finally { setBusy(null); }
                      }}
                      style={{ borderRadius: 50, fontSize: 14, padding: '10px 16px' }}
                    >
                      {t('driverApp.reject')}
                    </button>
                  </div>
                ) : (
                  !n.read && (
                    <button
                      className="dm-chip"
                      onClick={() => markAsRead(id)}
                      style={{ fontSize: 13, alignSelf: 'start' }}
                    >
                      {t('driverApp.markAsRead')}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
