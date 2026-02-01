import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadApi } from '@/api/all.api';
import { StartTripDialog } from '@/components/driver/StartTripDialog';
import { ShipperCheckInDialog } from '@/components/driver/ShipperCheckInDialog';
import { LoadOutDialog } from '@/components/driver/LoadOutDialog';
import { ReceiverOffloadDialog } from '@/components/driver/ReceiverOffloadDialog';
import { EndTripDialog } from '@/components/driver/EndTripDialog';
import { SOSButton } from '@/components/driver/SOSButton';
import type { Load } from '@/types/all.types';
import '../../layouts/mobile/mobile.css';

function vibrate(pattern: number | number[]) {
  if (navigator && 'vibrate' in navigator) {
    (navigator as any).vibrate(pattern);
  }
}

const STATUS_LABELS: Record<string, string> = {
  trip_started: 'Trip Started',
  shipper_check_in: 'Shipper Check-in',
  shipper_load_in: 'Load In',
  shipper_load_out: 'Load Out',
  in_transit: 'In Transit',
  receiver_check_in: 'Receiver Check-in',
  receiver_offload: 'Offloaded',
};

export default function DriverDashboardMobile() {
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTripDialogOpen, setStartTripDialogOpen] = useState(false);
  const [shipperCheckInDialogOpen, setShipperCheckInDialogOpen] = useState(false);
  const [loadOutDialogOpen, setLoadOutDialogOpen] = useState(false);
  const [receiverOffloadDialogOpen, setReceiverOffloadDialogOpen] = useState(false);
  const [endTripDialogOpen, setEndTripDialogOpen] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const lastLocationSentRef = useRef<number>(0);
  const [scanPodPhoto, setScanPodPhoto] = useState<File | null>(null);
  const scanPodInputRef = useRef<HTMLInputElement>(null);

  const fetchLoads = useCallback(async () => {
    try {
      setLoading(true);
      const assigned = await loadApi.getMyAssignedLoads();
      setLoads(Array.isArray(assigned) ? assigned : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load assignments');
      setLoads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureLoadId = (l: Load) => ({ ...l, id: l.id || (l as any)._id } as Load);

  const acceptedLoad = loads.find(
    (l) => ['trip_accepted', 'assigned'].includes(l.status) && !['completed', 'cancelled', 'delivered'].includes(l.status)
  ) || null;

  const activeLoad = loads.find(
    (l) => ['trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'].includes(l.status)
  ) || null;

  const displayLoad = activeLoad || acceptedLoad;

  useEffect(() => {
    fetchLoads();
    const id = setInterval(fetchLoads, 30000);
    return () => clearInterval(id);
  }, [fetchLoads]);

  // Live GPS tracking when trip is started (active load)
  useEffect(() => {
    if (!activeLoad?.id) return;

    const sendLocation = () => {
      if (!navigator.geolocation) return;
      const loadId = activeLoad.id || (activeLoad as any)._id;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastLocationSentRef.current < 50000) return;
          lastLocationSentRef.current = now;
          loadApi.updateLocation(loadId, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed ?? undefined,
          }).then(() => setTrackingActive(true)).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
      );
    };

    sendLocation();
    const interval = setInterval(sendLocation, 90000);
    return () => clearInterval(interval);
  }, [activeLoad?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const handleLoadIn = useCallback(async () => {
    if (!activeLoad || activeLoad.status !== 'shipper_check_in') return;
    try {
      vibrate(30);
      await loadApi.shipperLoadIn(activeLoad.id || (activeLoad as any)._id);
      fetchLoads();
      setToast('Load In confirmed!');
    } catch (err: any) {
      setToast(err?.message || 'Failed to confirm load in');
    }
  }, [activeLoad, fetchLoads]);

  const handleReceiverCheckIn = useCallback(async () => {
    if (!activeLoad) return;
    try {
      vibrate(30);
      await loadApi.receiverCheckIn(activeLoad.id || (activeLoad as any)._id);
      fetchLoads();
      setToast('Receiver check-in done!');
    } catch (err: any) {
      setToast(err?.message || 'Failed to check in at receiver');
    }
  }, [activeLoad, fetchLoads]);

  const nextAction = useMemo(() => {
    if (!displayLoad) return null;
    const s = displayLoad.status;
    if (['assigned', 'trip_accepted'].includes(s))
      return { label: 'Start Trip', fn: () => { vibrate(30); setStartTripDialogOpen(true); } };
    if (s === 'trip_started')
      return { label: 'Shipper Check-in', fn: () => { vibrate(30); setShipperCheckInDialogOpen(true); } };
    if (s === 'shipper_check_in')
      return { label: 'Load In', fn: handleLoadIn };
    if (s === 'shipper_load_in')
      return { label: 'Load Out (BOL)', fn: () => { vibrate(30); setLoadOutDialogOpen(true); } };
    if (['shipper_load_out', 'in_transit'].includes(s))
      return { label: 'Receiver Check-in', fn: handleReceiverCheckIn };
    if (s === 'receiver_check_in')
      return { label: 'Offload (POD)', fn: () => { vibrate(30); setReceiverOffloadDialogOpen(true); } };
    if (s === 'receiver_offload')
      return { label: 'End Trip', fn: () => { vibrate(30); setEndTripDialogOpen(true); } };
    return null;
  }, [displayLoad, handleLoadIn, handleReceiverCheckIn]);

  const primaryAction = useMemo(() => {
    if (nextAction) return { label: nextAction.label, onClick: nextAction.fn };
    if (!displayLoad) return { label: 'Start Trip', onClick: () => { vibrate(30); setToast('No trip assigned'); } };
    return { label: 'Refresh', onClick: () => fetchLoads() };
  }, [nextAction, displayLoad, fetchLoads]);

  const pickupCity = displayLoad?.pickupLocation?.city || displayLoad?.pickupLocation?.state
    ? `${displayLoad?.pickupLocation?.city || ''}, ${displayLoad?.pickupLocation?.state || ''}`.trim()
    : '—';
  const deliveryCity = displayLoad?.deliveryLocation?.city || displayLoad?.deliveryLocation?.state
    ? `${displayLoad?.deliveryLocation?.city || ''}, ${displayLoad?.deliveryLocation?.state || ''}`.trim()
    : '—';

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 12 }}>
      {error && (
        <div className="dm-card" style={{ padding: 12, background: 'rgba(255,100,100,0.15)', color: '#ff7676' }}>
          {error}
        </div>
      )}

      {acceptedLoad && (
        <div className="dm-card" style={{ display: 'grid', gap: 12, border: '2px solid rgba(52,211,153,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--dm-muted)' }}>ACCEPTED TRIP</span>
            <span className="dm-chip" style={{ background: 'rgba(52,211,153,0.2)', color: '#34d399' }}>Ready to Start</span>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Load #</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{acceptedLoad.loadNumber}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>Pickup</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{pickupCity || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>Delivery</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{deliveryCity || '—'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>Rate</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#34d399' }}>₹{(acceptedLoad.rate || 0).toLocaleString()}</div>
            </div>
            <button
              className="dm-btn"
              onClick={() => { vibrate(30); setStartTripDialogOpen(true); }}
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
            >
              Start Trip
            </button>
          </div>
        </div>
      )}

      {activeLoad && (
        <div className="dm-card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Active Trip</div>
            <span className="dm-chip">{STATUS_LABELS[activeLoad.status] || activeLoad.status}</span>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Load #{activeLoad.loadNumber}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>Pickup</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{pickupCity || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>Delivery</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{deliveryCity || '—'}</div>
              </div>
            </div>
          </div>
          <div style={{ height: 100, background: '#0b1220', border: '1px solid var(--dm-border)', borderRadius: 12, display: 'grid', placeItems: 'center', color: 'var(--dm-muted)', position: 'relative' }}>
            <div>
              <div style={{ fontSize: 13 }}>Map preview</div>
              {trackingActive && (
                <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>● Live tracking active</div>
              )}
            </div>
          </div>
          <div className="dm-row">
            <div className="dm-card" style={{ padding: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Time</div>
              <div style={{ fontWeight: 700 }}>—</div>
            </div>
            <div className="dm-card" style={{ padding: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Earnings</div>
              <div style={{ fontWeight: 700 }}>₹{(activeLoad.rate || 0).toLocaleString()}</div>
            </div>
          </div>
          {nextAction && (
            <button className="dm-btn" onClick={primaryAction.onClick} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
              {nextAction.label}
            </button>
          )}
        </div>
      )}

      <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Today</div>
          <button className="dm-chip" onClick={() => { setOnline((v) => !v); vibrate(15); setToast(online ? 'Offline' : 'Online'); }}>
            {online ? 'Online' : 'Offline'}
          </button>
        </div>
        <div className="dm-row">
          <div className="dm-card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Next Stop</div>
            <div style={{ fontWeight: 700 }}>{displayLoad ? (deliveryCity || '—') : '—'}</div>
          </div>
          <div className="dm-card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>ETA</div>
            <div style={{ fontWeight: 700 }}>{displayLoad?.expectedDeliveryDate ? new Date(displayLoad.expectedDeliveryDate).toLocaleDateString() : '—'}</div>
          </div>
        </div>
        <div className="dm-row">
          <button className="dm-btn" onClick={primaryAction.onClick}>{primaryAction.label}</button>
          <button
            className="dm-btn secondary"
            onClick={() => {
              vibrate(25);
              const canScanPOD = activeLoad && ['receiver_check_in', 'receiver_offload'].includes(activeLoad.status);
              if (canScanPOD) {
                setScanPodPhoto(null);
                scanPodInputRef.current?.click();
              } else {
                setToast(displayLoad ? 'Complete receiver check-in first' : 'No load at offload stage');
              }
            }}
          >
            Scan POD
          </button>
          <input
            ref={scanPodInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setScanPodPhoto(file);
                setReceiverOffloadDialogOpen(true);
              }
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="dm-row">
        <div className="dm-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Earnings Today</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>₹0</div>
        </div>
        <div className="dm-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>Trips</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>0</div>
        </div>
        <div className="dm-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>On-time</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>100%</div>
        </div>
      </div>

      {!loading && !acceptedLoad && !activeLoad && (
        <div className="dm-card" style={{ textAlign: 'center', padding: 24, color: 'var(--dm-muted)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No active trip</div>
          <div style={{ fontSize: 13 }}>Accept an assignment from the notifications to see your trip here.</div>
        </div>
      )}

      <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Shortcuts</div>
        <div className="dm-row">
          <button className="dm-chip" onClick={() => setToast('Calling dispatch…')}>Call Dispatch</button>
          <button className="dm-chip" onClick={() => setToast('Delay reported')}>Report Delay</button>
        </div>
      </div>

      {displayLoad && (
        <SOSButton
          loadId={displayLoad.id || (displayLoad as any)._id}
          onSendSOS={async (data) => {
            const loadId = displayLoad.id || (displayLoad as any)._id;
            const locStr = `${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)}${data.location.address ? ` - ${data.location.address}` : ''}`;
            await loadApi.sendSOS(loadId, { message: data.message, location: locStr });
            setToast('SOS sent! Help is on the way.');
          }}
          emergencyContacts={[
            { name: 'Fleet Owner', role: 'Owner' },
            { name: 'Dispatcher', role: 'Dispatch' },
          ]}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 90, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '10px 14px', borderRadius: 999, fontSize: 13 }}>{toast}</div>
        </div>
      )}

      {acceptedLoad && (
        <StartTripDialog
          open={startTripDialogOpen}
          onClose={() => setStartTripDialogOpen(false)}
          load={ensureLoadId(acceptedLoad)}
          onSuccess={() => { setStartTripDialogOpen(false); fetchLoads(); setToast('Trip started!'); }}
        />
      )}

      {activeLoad && (
        <>
          <ShipperCheckInDialog
            open={shipperCheckInDialogOpen}
            onClose={() => setShipperCheckInDialogOpen(false)}
            load={ensureLoadId(activeLoad)}
            onSuccess={() => { setShipperCheckInDialogOpen(false); fetchLoads(); setToast('Shipper check-in done!'); }}
          />
          <LoadOutDialog
            open={loadOutDialogOpen}
            onClose={() => setLoadOutDialogOpen(false)}
            load={ensureLoadId(activeLoad)}
            onSuccess={() => { setLoadOutDialogOpen(false); fetchLoads(); setToast('Load out complete!'); }}
          />
          <ReceiverOffloadDialog
            open={receiverOffloadDialogOpen}
            onClose={() => { setReceiverOffloadDialogOpen(false); setScanPodPhoto(null); }}
            load={ensureLoadId(activeLoad)}
            onSuccess={() => { setReceiverOffloadDialogOpen(false); setScanPodPhoto(null); fetchLoads(); setToast('Offload complete!'); }}
            initialPodPhoto={scanPodPhoto}
          />
          <EndTripDialog
            open={endTripDialogOpen}
            onClose={() => setEndTripDialogOpen(false)}
            load={ensureLoadId(activeLoad)}
            onSuccess={() => { setEndTripDialogOpen(false); fetchLoads(); setToast('Trip ended!'); }}
          />
        </>
      )}
    </div>
  );
}
