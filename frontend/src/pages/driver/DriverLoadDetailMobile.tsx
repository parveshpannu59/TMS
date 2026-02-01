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

  if (loading) {
    return (
      <div className="dm-content" style={{ padding: 24, textAlign: 'center', color: 'var(--dm-muted)' }}>
        Loading…
      </div>
    );
  }

  if (error || !load) {
    return (
      <div className="dm-content" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: 12 }}>{error || 'Load not found'}</div>
        <button className="dm-btn" onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  const loadData = load as any;
  const pickup = loadData.pickupLocation || loadData.origin;
  const delivery = loadData.deliveryLocation || loadData.destination;

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="dm-icon" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Load #{load.loadNumber}</div>
      </div>

      <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Status</span>
          <span
            className="dm-chip"
            style={{
              background: 'rgba(52,211,153,0.2)',
              color: '#34d399',
              textTransform: 'capitalize',
            }}
          >
            {load.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Rate</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--dm-accent)' }}>
            ₹{(load.rate || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="dm-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Pickup</div>
        <div>
          <div style={{ fontWeight: 600 }}>{formatLocation(pickup)}</div>
          {pickup?.address && (
            <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginTop: 4 }}>
              {pickup.address}
            </div>
          )}
        </div>
      </div>

      <div className="dm-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Delivery</div>
        <div>
          <div style={{ fontWeight: 600 }}>{formatLocation(delivery)}</div>
          {delivery?.address && (
            <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginTop: 4 }}>
              {delivery.address}
            </div>
          )}
        </div>
      </div>

      <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>Pickup Date</div>
            <div style={{ fontWeight: 600 }}>
              {load.pickupDate
                ? new Date(load.pickupDate).toLocaleDateString()
                : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>Expected Delivery</div>
            <div style={{ fontWeight: 600 }}>
              {load.expectedDeliveryDate
                ? new Date(load.expectedDeliveryDate).toLocaleDateString()
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {load.specialInstructions && (
        <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Special Instructions</div>
          <div style={{ fontSize: 13, color: 'var(--dm-text)' }}>{load.specialInstructions}</div>
        </div>
      )}

      {load.notes && (
        <div className="dm-card" style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Notes</div>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>{load.notes}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="dm-btn"
          style={{ flex: 1 }}
          onClick={() => {
            const addr = delivery?.address || `${delivery?.city || ''}, ${delivery?.state || ''}`.trim();
            if (addr) {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank');
            }
          }}
        >
          Get Directions
        </button>
        <button className="dm-btn secondary" onClick={() => navigate('/driver/mobile/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
