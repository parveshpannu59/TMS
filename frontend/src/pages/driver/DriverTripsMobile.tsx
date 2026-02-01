import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';
import '../../layouts/mobile/mobile.css';

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  trip_accepted: 'Ready to Start',
  trip_started: 'Trip Started',
  shipper_check_in: 'Shipper Check-in',
  shipper_load_in: 'Load In',
  shipper_load_out: 'Load Out',
  in_transit: 'In Transit',
  receiver_check_in: 'Receiver Check-in',
  receiver_offload: 'Offloaded',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  assigned: '#3b82f6',
  trip_accepted: '#34d399',
  trip_started: '#22c55e',
  shipper_check_in: '#06b6d4',
  shipper_load_in: '#06b6d4',
  shipper_load_out: '#8b5cf6',
  in_transit: '#f59e0b',
  receiver_check_in: '#ec4899',
  receiver_offload: '#a855f7',
  completed: '#22c55e',
  delivered: '#22c55e',
  cancelled: '#94a3b8',
};

export default function DriverTripsMobile() {
  const navigate = useNavigate();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchingRef = useRef(false);
  const fetchLoads = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading(true);
      const assigned = await loadApi.getMyAssignedLoads();
      setLoads(Array.isArray(assigned) ? assigned : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load trips');
      setLoads([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchLoads();
    const id = setInterval(fetchLoads, 30000);
    return () => clearInterval(id);
  }, [fetchLoads]);

  const activeLoads = loads.filter((l) =>
    ['assigned', 'trip_accepted', 'trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'].includes(l.status)
  );
  const completedLoads = loads.filter((l) =>
    ['completed', 'delivered'].includes(l.status)
  );

  const formatLocation = (loc: any) => {
    if (!loc) return '—';
    const parts = [loc.city, loc.state].filter(Boolean);
    return parts.length ? parts.join(', ') : loc.address || '—';
  };

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>My Trips</div>
        <button
          className="dm-chip"
          onClick={() => fetchLoads()}
          style={{ fontSize: 12 }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="dm-card" style={{ padding: 12, background: 'rgba(255,100,100,0.15)', color: '#ff7676' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="dm-card" style={{ padding: 24, textAlign: 'center', color: 'var(--dm-muted)' }}>
          Loading trips…
        </div>
      )}

      {!loading && loads.length === 0 && (
        <div className="dm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--dm-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚚</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No trips yet</div>
          <div style={{ fontSize: 13 }}>Accept an assignment from notifications to see your trips here.</div>
          <button
            className="dm-btn"
            style={{ marginTop: 16, maxWidth: 200, margin: '16px auto 0' }}
            onClick={() => navigate('/driver/mobile/dashboard')}
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {!loading && activeLoads.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dm-muted)' }}>Active</div>
          {activeLoads.map((load) => (
            <div
              key={load.id || (load as any)._id}
              className="dm-card"
              style={{
                display: 'grid',
                gap: 10,
                cursor: 'pointer',
                borderLeft: `4px solid ${STATUS_COLOR[load.status] || 'var(--dm-accent)'}`,
              }}
              onClick={() => navigate(`/driver/mobile/load/${load.id || (load as any)._id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Load #{load.loadNumber}</div>
                <span
                  className="dm-chip"
                  style={{
                    background: `${STATUS_COLOR[load.status] || 'var(--dm-accent)'}22`,
                    color: STATUS_COLOR[load.status] || 'var(--dm-accent)',
                    fontSize: 11,
                  }}
                >
                  {STATUS_LABELS[load.status] || load.status}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--dm-muted)' }}>
                <div>📍 {formatLocation(load.pickupLocation)} → {formatLocation(load.deliveryLocation)}</div>
                <div style={{ fontWeight: 600, color: 'var(--dm-text)' }}>
                  ₹{(load.rate || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--dm-accent)' }}>Tap to view & take action →</div>
            </div>
          ))}
        </>
      )}

      {!loading && completedLoads.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dm-muted)' }}>Completed</div>
          {completedLoads.slice(0, 5).map((load) => (
            <div
              key={load.id || (load as any)._id}
              className="dm-card"
              style={{ display: 'grid', gap: 8, opacity: 0.9, cursor: 'pointer' }}
              onClick={() => navigate(`/driver/mobile/load/${load.id || (load as any)._id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>Load #{load.loadNumber}</div>
                <span className="dm-chip" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                  {STATUS_LABELS[load.status] || load.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>
                {formatLocation(load.pickupLocation)} → {formatLocation(load.deliveryLocation)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>₹{(load.rate || 0).toLocaleString()}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
