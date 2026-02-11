import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';
import '../../layouts/mobile/mobile.css';

function formatLocation(loc: any) {
  if (!loc) return '—';
  const parts = [loc.city, loc.state].filter(Boolean);
  return parts.length ? parts.join(', ') : loc.address || '—';
}

const formatDate = (d: string | Date | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function DriverLoadDetailMobile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadApi
      .getLoadById(id)
      .then(setLoad)
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const ios = { blue: '#007aff', green: '#34c759', red: '#ff3b30', orange: '#ff9500' };

  if (loading) {
    return (
      <div className="dm-content" style={{ padding: 40, textAlign: 'center', color: 'var(--dm-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚛</div>
        <div style={{ fontSize: 15 }}>Loading...</div>
      </div>
    );
  }

  if (error || !load) {
    return (
      <div className="dm-content" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: ios.red, marginBottom: 14, fontSize: 15 }}>{error || 'Load not found'}</div>
        <button className="dm-btn ghost" onClick={() => navigate(-1)} style={{ borderRadius: 50 }}>Go Back</button>
      </div>
    );
  }

  const loadData = load as any;
  const pickup = loadData.pickupLocation || loadData.origin;
  const delivery = loadData.deliveryLocation || loadData.destination;
  const isActiveOrAssigned = ['assigned', 'trip_accepted', 'trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'].includes(load.status);

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <button className="dm-icon" onClick={() => navigate(-1)} aria-label="Back" style={{ color: ios.blue }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Load #{load.loadNumber}</div>
      </div>

      {/* Status & Rate */}
      <div className="dm-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--dm-muted)' }}>Status</span>
          <span style={{
            padding: '4px 12px', borderRadius: 20,
            background: `${ios.green}12`, color: ios.green,
            fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
          }}>
            {load.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>Rate</div>
          <div style={{ fontWeight: 800, fontSize: 28, color: ios.green, letterSpacing: -0.5 }}>
            ${(load.rate || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Stops */}
      <div className="dm-inset-group">
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${ios.red}15`, display: 'grid', placeItems: 'center', fontSize: 14 }}>📦</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ios.red, textTransform: 'uppercase', letterSpacing: 0.3 }}>Pickup</div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{formatLocation(pickup)}</div>
          {pickup?.address && <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 4 }}>{pickup.address}</div>}
          <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 4 }}>{formatDate(load.pickupDate)}</div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${ios.green}15`, display: 'grid', placeItems: 'center', fontSize: 14 }}>🏁</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ios.green, textTransform: 'uppercase', letterSpacing: 0.3 }}>Delivery</div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{formatLocation(delivery)}</div>
          {delivery?.address && <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 4 }}>{delivery.address}</div>}
          <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 4 }}>Expected: {formatDate(load.expectedDeliveryDate)}</div>
        </div>
      </div>

      {/* Load Details */}
      <div className="dm-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: 'Cargo Type', value: loadData.cargoType || '—' },
          { label: 'Weight', value: loadData.weight ? `${loadData.weight} lbs` : '—' },
          { label: 'Distance', value: loadData.distance ? `${loadData.distance} mi` : '—' },
          { label: 'Load Type', value: loadData.loadType || '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--dm-fill)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{value}</div>
          </div>
        ))}
      </div>

      {load.specialInstructions && (
        <div className="dm-card" style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Special Instructions</div>
          <div style={{ fontSize: 14, color: 'var(--dm-text-secondary)', lineHeight: 1.5 }}>{load.specialInstructions}</div>
        </div>
      )}

      {(load as any).notes && (
        <div className="dm-card" style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Notes</div>
          <div style={{ fontSize: 14, color: 'var(--dm-muted)', lineHeight: 1.5 }}>{(load as any).notes}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
        {isActiveOrAssigned && (
          <button
            className="dm-btn"
            style={{ borderRadius: 50, fontSize: 17, background: ios.green, boxShadow: `0 4px 16px ${ios.green}40` }}
            onClick={() => navigate(`/driver/mobile/tracking/${id}`)}
          >
            Open Load Tracking
          </button>
        )}
        <button
          className="dm-btn ghost"
          onClick={() => {
            const addr = delivery?.address || `${delivery?.city || ''}, ${delivery?.state || ''}`.trim();
            if (addr) {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank');
            }
          }}
          style={{ borderRadius: 12, fontSize: 15 }}
        >
          Get Directions
        </button>
        <button className="dm-btn ghost" onClick={() => navigate('/driver/mobile/dashboard')} style={{ borderRadius: 12, fontSize: 15 }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
