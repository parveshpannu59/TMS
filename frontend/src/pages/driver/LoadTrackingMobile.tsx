import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { loadApi } from '@/api/all.api';
import { StartTripDialog } from '@/components/driver/StartTripDialog';
import { DriverFormDialog } from '@/components/driver/DriverFormDialog';
import { ShipperCheckInDialog } from '@/components/driver/ShipperCheckInDialog';
import { LoadOutDialog } from '@/components/driver/LoadOutDialog';
import { ReceiverOffloadDialog } from '@/components/driver/ReceiverOffloadDialog';
import { EndTripDialog } from '@/components/driver/EndTripDialog';
import { LogExpenseDialog } from '@/components/driver/LogExpenseDialog';
import { ReportDelayDialog } from '@/components/driver/ReportDelayDialog';
import { SOSButton } from '@/components/driver/SOSButton';
import { useLoadTracking, type LocationUpdatePayload } from '@/hooks/usePusher';
import type { Load } from '@/types/all.types';
import '../../layouts/mobile/mobile.css';

const TripTrackingMap = lazy(() => import('@/components/common/TripTrackingMap'));
const DocumentAnalyzer = lazy(() => import('@/components/common/DocumentAnalyzer'));

function vibrate(pattern: number | number[]) {
  if (navigator && 'vibrate' in navigator) (navigator as any).vibrate(pattern);
}

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  trip_accepted: 'Ready to Start',
  trip_started: 'On Route to Pickup',
  shipper_check_in: 'Checked In at Shipper',
  shipper_load_in: 'Loading in Progress',
  shipper_load_out: 'Loaded — Upload BOL',
  in_transit: 'In Transit to Delivery',
  receiver_check_in: 'Checked In at Receiver',
  receiver_offload: 'Offloading — Upload POD',
  delivered: 'Delivered',
  completed: 'Completed',
};

const TRIP_STEPS = [
  { key: 'trip_started', label: 'En Route' },
  { key: 'shipper_check_in', label: 'Check In' },
  { key: 'shipper_load_in', label: 'Loaded' },
  { key: 'shipper_load_out', label: 'BOL' },
  { key: 'in_transit', label: 'Transit' },
  { key: 'receiver_check_in', label: 'Arrive' },
  { key: 'receiver_offload', label: 'POD' },
  { key: 'delivered', label: 'Done' },
];

const ACTIVE_STATUSES = ['trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'];
const PRE_TRIP_STATUSES = ['assigned', 'trip_accepted'];
const TRACKABLE_STATUSES = [...PRE_TRIP_STATUSES, ...ACTIVE_STATUSES, 'delivered', 'completed'];

const formatDate = (d: string | Date | undefined) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}-${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

const formatLocation = (loc: any) => {
  if (!loc) return '—';
  const parts = [loc.city, loc.state].filter(Boolean);
  return parts.length ? parts.join(', ') : loc.address || '—';
};

export default function LoadTrackingMobile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Location tracking state
  const [locationGranted, setLocationGranted] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [lastTrackedTime, setLastTrackedTime] = useState<Date | null>(null);
  const [locationSendCount, setLocationSendCount] = useState(0);
  const bestAccuracyRef = useRef<number>(Infinity);

  // Dialogs
  const [startTripOpen, setStartTripOpen] = useState(false);
  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [shipperCheckInOpen, setShipperCheckInOpen] = useState(false);
  const [loadOutOpen, setLoadOutOpen] = useState(false);
  const [receiverOffloadOpen, setReceiverOffloadOpen] = useState(false);
  const [endTripOpen, setEndTripOpen] = useState(false);
  const [logExpenseOpen, setLogExpenseOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('fuel');
  const [reportDelayOpen, setReportDelayOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [tripExpenses, setTripExpenses] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showShipmentDetails, setShowShipmentDetails] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('bol');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showDocAnalyzer, setShowDocAnalyzer] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [locationHistoryData, setLocationHistoryData] = useState<any[]>([]);

  const docInputRef = useRef<HTMLInputElement>(null);
  const lastLocationRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // ─── Data Fetching ───────────────────────────────────────────

  const fetchLoad = useCallback(async () => {
    if (!id) return;
    try {
      const data = await loadApi.getLoadById(id);
      setLoad(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchLocationHistory = useCallback(async () => {
    if (!id) return;
    try {
      const data = await loadApi.getLocationHistory(id);
      setLocationHistoryData(data.locationHistory || []);
    } catch { /* ignore */ }
  }, [id]);

  const fetchExpenses = useCallback(async () => {
    if (!load?.id) return;
    try {
      const data = await loadApi.getLoadExpenses(load.id);
      setTripExpenses(data);
    } catch { setTripExpenses(null); }
  }, [load?.id]);

  // ─── Pusher Real-time Tracking (must be before polling useEffect) ──
  const handleRealtimeLocation = useCallback((data: LocationUpdatePayload) => {
    const newPoint = {
      lat: data.lat,
      lng: data.lng,
      timestamp: data.timestamp,
      speed: data.speed,
      accuracy: data.accuracy,
    };
    setLocationHistoryData(prev => {
      if (prev.length > 0 && prev[prev.length - 1].timestamp === data.timestamp) return prev;
      return [...prev, newPoint];
    });
  }, []);

  const { connected: pusherConnected } = useLoadTracking({
    loadId: id || null,
    onLocationUpdate: handleRealtimeLocation,
    onStatusChange: useCallback(() => {
      fetchLoad();
    }, [fetchLoad]),
    enabled: !!id,
  });

  // Initial fetch + polling (reduced when Pusher is connected — real-time handles most updates)
  useEffect(() => {
    fetchLoad();
    fetchLocationHistory();
    const pollMs = pusherConnected ? 120000 : 15000;
    const interval = setInterval(() => {
      fetchLoad();
      fetchLocationHistory();
    }, pollMs);
    return () => clearInterval(interval);
  }, [fetchLoad, fetchLocationHistory, pusherConnected]);

  useEffect(() => { if (load?.id) fetchExpenses(); }, [load?.id, fetchExpenses]);

  // ─── GPS Location Engine ────────────────────────────────────

  // Accuracy threshold: only accept GPS fixes within 150 meters (rejects WiFi/cell tower fixes)
  const GPS_ACCURACY_THRESHOLD = 150; // meters
  // Only send to server if accuracy is under 200m
  const GPS_SEND_THRESHOLD = 200; // meters

  // Send location to server immediately (only if accurate enough)
  const sendLocationToServer = useCallback(async (lat: number, lng: number, speed?: number, accuracy?: number) => {
    if (!id) return;
    // Reject clearly inaccurate positions (WiFi/cell tower fixes can be 1000m+)
    if (accuracy && accuracy > GPS_SEND_THRESHOLD) {
      console.warn(`GPS too inaccurate (${accuracy.toFixed(0)}m), not sending to server`);
      return;
    }
    try {
      await loadApi.updateLocation(id, { lat, lng, speed, accuracy });
      setTrackingActive(true);
      setLastTrackedTime(new Date());
      setLocationSendCount(prev => prev + 1);
      // Also refresh location history so the map route updates
      fetchLocationHistory();
    } catch { /* ignore */ }
  }, [id, fetchLocationHistory]);

  // Request location permission (with accuracy check)
  const requestLocationAccess = useCallback(() => {
    if (!navigator.geolocation) {
      setToast('Geolocation not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        setLocationGranted(true);
        setGpsAccuracy(acc);

        if (acc <= GPS_ACCURACY_THRESHOLD) {
          setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          bestAccuracyRef.current = acc;
          setToast(`Location locked (${acc.toFixed(0)}m accuracy)`);
        } else {
          // Still accept the position but warn user
          setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setToast(`Location acquired but low accuracy (${acc.toFixed(0)}m) — waiting for GPS fix...`);
        }
      },
      (err) => {
        setToast(`Location denied: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // maximumAge: 0 = always get fresh position
    );
  }, []);

  // Continuous GPS watch — starts when trip is active
  useEffect(() => {
    if (!load || !ACTIVE_STATUSES.includes(load.status) || !load.id || !navigator.geolocation) return;

    // Request permission immediately when trip starts
    requestLocationAccess();
    bestAccuracyRef.current = Infinity;

    // Start watching position — maximumAge: 0 forces fresh GPS readings
    const wId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        setGpsAccuracy(acc);
        setLocationGranted(true);

        // Only update coordinates if accuracy is acceptable OR better than what we had
        if (acc <= GPS_ACCURACY_THRESHOLD || acc < bestAccuracyRef.current) {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentCoords(coords);
          if (acc < bestAccuracyRef.current) bestAccuracyRef.current = acc;

          // Send to server: immediately first time, then every 10s for real-time Pusher broadcast
          const now = Date.now();
          if (acc <= GPS_SEND_THRESHOLD && (lastLocationRef.current === 0 || now - lastLocationRef.current >= 10000)) {
            lastLocationRef.current = now;
            sendLocationToServer(coords.lat, coords.lng, pos.coords.speed ?? undefined, acc);
          }
        }
      },
      (err) => {
        console.warn('GPS watch error:', err.message);
      },
      {
        enableHighAccuracy: true, // Forces GPS chip, not WiFi/cell
        maximumAge: 0,            // Never use cached positions
        timeout: 30000,           // Wait up to 30s for a GPS fix
      }
    );
    watchIdRef.current = wId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [load?.id, load?.status, requestLocationAccess, sendLocationToServer]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── Action Handlers ────────────────────────────────────────

  const ensureLoadId = (l: Load) => ({ ...l, id: l.id || (l as any)._id } as Load);

  // Send a one-off location update (also after each status change)
  const sendLocationNow = useCallback(async () => {
    if (!navigator.geolocation) { setToast('Location unavailable'); return; }
    vibrate(20);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const acc = pos.coords.accuracy;
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsAccuracy(acc);
        if (acc <= GPS_SEND_THRESHOLD) {
          await sendLocationToServer(pos.coords.latitude, pos.coords.longitude, pos.coords.speed ?? undefined, acc);
          setToast(`Location sent! (${acc.toFixed(0)}m accuracy)`);
        } else {
          setToast(`GPS too inaccurate (${acc.toFixed(0)}m) — move to open area for better signal`);
        }
      },
      () => setToast('Location permission denied'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, [sendLocationToServer]);

  // Helper: send location then run a callback
  const withLocationSend = useCallback((fn: () => void) => {
    fn();
    // Also send location silently after every status change
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = pos.coords.accuracy;
          if (acc <= GPS_SEND_THRESHOLD) {
            sendLocationToServer(pos.coords.latitude, pos.coords.longitude, pos.coords.speed ?? undefined, acc);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
  }, [sendLocationToServer]);

  // Helper: get current GPS coordinates synchronously from state
  const getGPSPayload = useCallback(() => {
    if (currentCoords && gpsAccuracy && gpsAccuracy <= GPS_SEND_THRESHOLD) {
      return { latitude: currentCoords.lat, longitude: currentCoords.lng };
    }
    return {};
  }, [currentCoords, gpsAccuracy]);

  const handleLoadIn = useCallback(async () => {
    if (!load || load.status !== 'shipper_check_in') return;
    try {
      vibrate(30);
      await loadApi.shipperLoadIn(load.id, { ...getGPSPayload() });
      fetchLoad();
      sendLocationNow();
      setToast('Loaded confirmed!');
    } catch (err: any) {
      setToast(err?.message || 'Failed');
    }
  }, [load, fetchLoad, sendLocationNow]);

  const handleReceiverCheckIn = useCallback(async () => {
    if (!load) return;
    try {
      vibrate(30);
      await loadApi.receiverCheckIn(load.id, getGPSPayload());
      fetchLoad();
      sendLocationNow();
      setToast('Arrived at receiver!');
    } catch (err: any) {
      setToast(err?.message || 'Failed');
    }
  }, [load, fetchLoad, sendLocationNow]);

  const handleUploadDocument = useCallback(async () => {
    if (!load?.id || !docFile) return;
    try {
      setUploadingDoc(true);
      await loadApi.uploadLoadDocument(load.id, docFile);
      setToast('Document uploaded!');
      setDocFile(null);
      setShowDocUpload(false);
      fetchLoad();
    } catch (err: any) {
      setToast(err?.message || 'Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  }, [load?.id, docFile, fetchLoad]);

  const handleAddNote = useCallback(async () => {
    if (!load?.id || !noteText.trim()) return;
    try {
      await loadApi.reportDelay(load.id, { reason: 'Note', notes: noteText.trim() });
      setToast('Note saved!');
      setNoteText('');
      setShowNoteInput(false);
    } catch (err: any) {
      setToast(err?.message || 'Failed');
    }
  }, [load?.id, noteText]);

  // ─── Next Action Logic ──────────────────────────────────────

  const nextAction = useMemo(() => {
    if (!load) return null;
    const s = load.status;
    const hasForm = !!(load as any).driverFormDetails;
    if (['assigned', 'trip_accepted'].includes(s)) {
      if (!hasForm) return { label: t('driverApp.fillTripDetails'), fn: () => { vibrate(30); setDriverFormOpen(true); }, color: '#3b82f6', icon: '📋' };
      return { label: t('driverApp.startTrip'), fn: () => { vibrate(30); setStartTripOpen(true); }, color: '#22c55e', icon: '🚀' };
    }
    if (s === 'trip_started') return { label: t('driverApp.arrivedAtPickup'), fn: () => { vibrate(30); setShipperCheckInOpen(true); }, color: '#3b82f6', icon: '📍' };
    if (s === 'shipper_check_in') return { label: t('driverApp.confirmLoaded'), fn: handleLoadIn, color: '#06b6d4', icon: '📦' };
    if (s === 'shipper_load_in') return { label: t('driverApp.uploadBolDepart'), fn: () => { vibrate(30); setLoadOutOpen(true); }, color: '#8b5cf6', icon: '📄' };
    if (['shipper_load_out', 'in_transit'].includes(s)) return { label: t('driverApp.arrivedAtDelivery'), fn: handleReceiverCheckIn, color: '#ec4899', icon: '🏁' };
    if (s === 'receiver_check_in') return { label: t('driverApp.uploadPodOffload'), fn: () => { vibrate(30); setReceiverOffloadOpen(true); }, color: '#a855f7', icon: '📄' };
    if (s === 'receiver_offload') return { label: t('driverApp.endTrip'), fn: () => { vibrate(30); fetchExpenses(); setEndTripOpen(true); }, color: '#ef4444', icon: '🏠' };
    return null;
  }, [load, handleLoadIn, handleReceiverCheckIn, fetchExpenses]);

  const isActive = load && ACTIVE_STATUSES.includes(load.status);
  const isTrackable = load && TRACKABLE_STATUSES.includes(load.status);
  const currentStepIdx = TRIP_STEPS.findIndex(s => s.key === load?.status);
  const pickup = (load as any)?.pickupLocation;
  const delivery = (load as any)?.deliveryLocation;

  // ─── iOS Colors ─────────────────────────────────────────────
  const ios = { blue: '#007aff', green: '#34c759', orange: '#ff9500', red: '#ff3b30', purple: '#af52de', teal: '#5ac8fa' };

  // ─── Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="dm-content" style={{ padding: 40, textAlign: 'center', color: 'var(--dm-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚛</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{t('driverApp.loadingTrips')}</div>
      </div>
    );
  }
  if (error || !load) {
    return (
      <div className="dm-content" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: ios.red, marginBottom: 14, fontSize: 15 }}>{error || 'Load not found'}</div>
        <button className="dm-btn ghost" onClick={() => navigate(-1)} style={{ borderRadius: 50 }}>{t('driverApp.goBack')}</button>
      </div>
    );
  }

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 12 }}>
      {/* ─── iOS Navigation Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <button
          className="dm-icon"
          onClick={() => navigate('/driver/mobile/dashboard')}
          aria-label="Back"
          style={{ color: ios.blue, fontSize: 17, fontWeight: 500, padding: '6px 2px', minWidth: 'auto' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Load #{load.loadNumber}</div>
        {(trackingActive || pusherConnected) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="dm-status-dot live" />
            <span style={{ fontSize: 12, fontWeight: 600, color: ios.green }}>LIVE</span>
            {pusherConnected && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#fff',
                background: ios.green, padding: '1px 6px', borderRadius: 6,
                letterSpacing: 0.3,
              }}>RT</span>
            )}
          </div>
        )}
        {gpsAccuracy !== null && trackingActive && (
          <span style={{
            fontSize: 11,
            color: gpsAccuracy <= 50 ? ios.green : gpsAccuracy <= 150 ? ios.orange : ios.red,
            background: gpsAccuracy <= 50 ? `${ios.green}15` : gpsAccuracy <= 150 ? `${ios.orange}15` : `${ios.red}15`,
            padding: '3px 8px', borderRadius: 20, fontWeight: 600,
          }}>
            {gpsAccuracy.toFixed(0)}m
          </span>
        )}
      </div>

      {/* ─── Trip Progress (iOS style segmented bar) ─── */}
      {isActive && (
        <div className="dm-card" style={{ padding: '14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {TRIP_STEPS.map((step, i) => {
              const isDone = currentStepIdx > i;
              const isCurrent = currentStepIdx === i;
              return (
                <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isDone ? ios.green : isCurrent ? ios.blue : 'var(--dm-fill)',
                    color: isDone || isCurrent ? '#fff' : 'var(--dm-muted)',
                    display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
                    boxShadow: isCurrent ? `0 0 0 3px ${ios.blue}30` : 'none',
                    zIndex: 1,
                    transition: 'all 0.3s ease',
                  }}>
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : i + 1}
                  </div>
                  <div style={{
                    fontSize: 9, marginTop: 3,
                    color: isCurrent ? ios.blue : isDone ? ios.green : 'var(--dm-muted)',
                    fontWeight: isCurrent ? 700 : 500,
                    textAlign: 'center', lineHeight: 1.1,
                  }}>
                    {step.label}
                  </div>
                  {i < TRIP_STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', top: 11, left: '60%', right: '-40%', height: 2,
                      background: isDone ? ios.green : 'var(--dm-fill)', zIndex: 0,
                      transition: 'background 0.3s',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Status Banner ─── */}
      <div className="dm-card" style={{
        padding: '14px 16px',
        background: isActive ? `${ios.blue}08` : undefined,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: ios.blue, letterSpacing: 0.3, textTransform: 'uppercase' }}>{t('driverApp.currentStatus')}</div>
        <div style={{ fontWeight: 700, fontSize: 17, marginTop: 4, letterSpacing: -0.2 }}>
          {STATUS_LABELS[load.status] || load.status?.replace(/_/g, ' ')}
        </div>
        {isActive && currentCoords && (
          <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
            {lastTrackedTime && <span style={{ opacity: 0.7 }}> · {lastTrackedTime.toLocaleTimeString()}</span>}
          </div>
        )}
        {isActive && !locationGranted && (
          <button
            className="dm-btn"
            onClick={requestLocationAccess}
            style={{ marginTop: 10, background: ios.orange, borderRadius: 50, fontSize: 14, padding: '10px 20px' }}
          >
            {t('driverApp.enableLocationTracking')}
          </button>
        )}
      </div>

      {/* ─── Full-screen Uber-style Map ─── */}
      {isTrackable && (
        <div style={{ position: 'relative' }}>
          {/* Map toggle row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '0 4px' }}>
            <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isActive ? '🗺️ Live Map' : '🗺️ Trip Route'}
              {trackingActive && <span className="dm-status-dot live" />}
            </div>
            <button
              className="dm-chip"
              onClick={() => setShowMap(!showMap)}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {showMap ? t('driverApp.hide') : t('driverApp.show')}
            </button>
          </div>
          {showMap && (
            <Suspense fallback={<div style={{ height: 380, display: 'grid', placeItems: 'center', background: 'var(--dm-fill)', borderRadius: 16, color: 'var(--dm-muted)' }}>{t('driverApp.loadingMap')}</div>}>
              <TripTrackingMap
                currentLocation={currentCoords ? { lat: currentCoords.lat, lng: currentCoords.lng, timestamp: lastTrackedTime?.toISOString(), speed: undefined } : null}
                locationHistory={locationHistoryData}
                pickupLocation={pickup}
                deliveryLocation={delivery}
                driverName="You"
                loadNumber={load.loadNumber}
                loadId={id}
                status={load.status}
                height={380}
                showRoute={true}
                onRefresh={() => { fetchLocationHistory(); sendLocationNow(); }}
                onRealtimeLocation={handleRealtimeLocation}
              />
            </Suspense>
          )}
        </div>
      )}

      {/* ─── Trip Stats ─── */}
      {isTrackable && locationHistoryData.length > 1 && (() => {
        let dist = 0;
        for (let i = 1; i < locationHistoryData.length; i++) {
          const p1 = locationHistoryData[i - 1], p2 = locationHistoryData[i];
          const R = 6371;
          const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
          const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
          dist += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        const timestamped = locationHistoryData.filter(p => p.timestamp);
        let durationMs = 0;
        let startTime = '';
        if (timestamped.length >= 2) {
          const ts = timestamped.map(p => new Date(p.timestamp!).getTime());
          durationMs = Math.max(...ts) - Math.min(...ts);
          startTime = new Date(Math.min(...ts)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
        const hours = durationMs / 3600000;
        const avgSpeed = hours > 0 ? dist / hours : 0;
        const estFuelLiters = dist / 4;
        const estFuelCost = estFuelLiters * 100;

        return (
          <div className="dm-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: 'var(--dm-text)' }}>{t('driverApp.tripStatistics')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: t('driverApp.distance'), value: `${dist.toFixed(1)}`, unit: 'km', color: ios.blue },
                { label: t('driverApp.duration'), value: hours >= 1 ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m` : `${Math.round(hours * 60)}m`, unit: '', color: ios.purple },
                { label: t('driverApp.avgSpeed'), value: `${avgSpeed.toFixed(0)}`, unit: 'km/h', color: ios.orange },
              ].map(({ label, value, unit, color }) => (
                <div key={label} style={{ textAlign: 'center', background: 'var(--dm-fill)', borderRadius: 12, padding: '12px 8px' }}>
                  <div style={{ fontSize: 11, color: 'var(--dm-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color, marginTop: 2 }}>
                    {value}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>{unit ? ` ${unit}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div style={{ textAlign: 'center', background: 'var(--dm-fill)', borderRadius: 12, padding: '10px 8px' }}>
                <div style={{ fontSize: 11, color: 'var(--dm-muted)', fontWeight: 600 }}>{t('driverApp.estFuel')}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{estFuelLiters.toFixed(1)} L · ₹{estFuelCost.toFixed(0)}</div>
              </div>
              <div style={{ textAlign: 'center', background: 'var(--dm-fill)', borderRadius: 12, padding: '10px 8px' }}>
                <div style={{ fontSize: 11, color: 'var(--dm-muted)', fontWeight: 600 }}>{t('driverApp.gpsPoints')}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{locationHistoryData.length} {t('driverApp.recorded')}</div>
              </div>
            </div>
            {startTime && (
              <div style={{ fontSize: 12, color: 'var(--dm-muted)', textAlign: 'center', marginTop: 8 }}>
                {t('driverApp.trackingSince')} {startTime} · {locationSendCount} {t('driverApp.updatesSent')}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── Primary Action Button ─── */}
      {nextAction && (
        <button
          className="dm-btn"
          onClick={nextAction.fn}
          style={{
            background: nextAction.color || ios.green,
            color: '#fff', fontSize: 18, padding: '16px 24px',
            fontWeight: 700, borderRadius: 50, letterSpacing: -0.2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 4px 16px ${nextAction.color || ios.green}40`,
          }}
        >
          <span style={{ fontSize: 20 }}>{nextAction.icon}</span>
          {nextAction.label}
        </button>
      )}

      {/* ─── Stops (iOS inset group) ─── */}
      <div className="dm-inset-group">
        {/* Pickup */}
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${ios.red}15`, display: 'grid', placeItems: 'center', fontSize: 14 }}>📦</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ios.red, textTransform: 'uppercase', letterSpacing: 0.3 }}>{t('driverApp.pickupStop')}</div>
            {['shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload', 'delivered', 'completed'].includes(load.status) && (
              <span style={{ fontSize: 11, background: `${ios.green}15`, color: ios.green, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{t('driverApp.checkedIn')}</span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{pickup?.city || t('driverApp.pickupStop')}</div>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>{pickup?.address || formatLocation(pickup)}</div>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 6 }}>
            {formatDate(load.pickupDate)}
          </div>
        </div>

        {/* Delivery */}
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${ios.green}15`, display: 'grid', placeItems: 'center', fontSize: 14 }}>🏁</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ios.green, textTransform: 'uppercase', letterSpacing: 0.3 }}>{t('driverApp.deliveryStop')}</div>
            {['delivered', 'completed'].includes(load.status) && (
              <span style={{ fontSize: 11, background: `${ios.green}15`, color: ios.green, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{t('driverApp.checkedIn')}</span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{delivery?.city || t('driverApp.deliveryStop')}</div>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>{delivery?.address || formatLocation(delivery)}</div>
          <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 6 }}>
            {formatDate(load.expectedDeliveryDate)}
          </div>
        </div>
      </div>

      {/* ─── Quick Action Grid ─── */}
      {isActive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '📄', label: t('driverApp.documents'), fn: () => { vibrate(15); setShowDocUpload(true); } },
            { icon: '📋', label: t('driverApp.shipment'), fn: () => { vibrate(15); setShowShipmentDetails(!showShipmentDetails); } },
            { icon: '📡', label: t('driverApp.sendGps'), fn: sendLocationNow },
            { icon: '📝', label: t('driverApp.addNote'), fn: () => { vibrate(15); setShowNoteInput(true); } },
          ].map(({ icon, label, fn }) => (
            <button
              key={label}
              className="dm-card"
              onClick={fn}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 16px', cursor: 'pointer', border: 'none',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--dm-text)' }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Document Upload Panel ─── */}
      {showDocUpload && (
        <div className="dm-card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{t('driverApp.uploadDocuments')}</div>
            <button className="dm-icon" onClick={() => setShowDocUpload(false)} style={{ fontSize: 16, color: 'var(--dm-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <select className="dm-input" value={docType} onChange={(e) => setDocType(e.target.value)} style={{ fontSize: 15 }}>
            <option value="bol">Bill of Lading (BOL)</option>
            <option value="pod">Proof of Delivery (POD)</option>
            <option value="fuel_receipt">Fuel Receipt</option>
            <option value="toll_receipt">Toll Receipt</option>
            <option value="maintenance">Maintenance Bill</option>
            <option value="other">Other</option>
          </select>
          <button className="dm-btn ghost" onClick={() => docInputRef.current?.click()} style={{ fontSize: 14, borderRadius: 12 }}>
            {docFile ? `📎 ${docFile.name.slice(0, 25)}` : t('driverApp.chooseFile')}
          </button>
          <input ref={docInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          {docFile && (
            <div style={{ display: 'grid', gap: 8 }}>
              <button className="dm-btn" onClick={handleUploadDocument} disabled={uploadingDoc} style={{ borderRadius: 50, fontSize: 16 }}>
                {uploadingDoc ? t('driverApp.uploading') : t('driverApp.upload')}
              </button>
              <button className="dm-btn ghost" onClick={() => setShowDocAnalyzer(true)} style={{ fontSize: 14, borderRadius: 12 }}>
                {t('driverApp.readAnalyze')}
              </button>
            </div>
          )}
          <button className="dm-btn ghost" onClick={() => setShowDocAnalyzer(true)} style={{ fontSize: 14, borderRadius: 12 }}>
            {t('driverApp.analyzeAnyDoc')}
          </button>
        </div>
      )}

      {/* ─── Shipment Details ─── */}
      {showShipmentDetails && (
        <div className="dm-card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{t('driverApp.shipmentDetails')}</div>
            <button className="dm-icon" onClick={() => setShowShipmentDetails(false)} style={{ color: 'var(--dm-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: t('driverApp.cargo'), value: (load as any).cargoType || '—' },
              { label: t('driverApp.weight'), value: (load as any).weight ? `${(load as any).weight} lbs` : '—' },
              { label: t('driverApp.distance'), value: (load as any).distance ? `${(load as any).distance} mi` : '—' },
              { label: t('driverApp.rate'), value: `$${(load.rate || 0).toLocaleString()}`, color: ios.green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--dm-fill)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: color || 'var(--dm-text)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Note Input ─── */}
      {showNoteInput && (
        <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{t('driverApp.addNote')}</div>
            <button className="dm-icon" onClick={() => setShowNoteInput(false)} style={{ color: 'var(--dm-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <textarea className="dm-input" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder={t('driverApp.writeNoteHere')} rows={3} style={{ resize: 'vertical', fontSize: 15 }} />
          <button className="dm-btn" onClick={handleAddNote} disabled={!noteText.trim()} style={{ borderRadius: 50 }}>{t('driverApp.saveNote')}</button>
        </div>
      )}

      {/* ─── Expense Actions ─── */}
      {isActive && (
        <div className="dm-card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{t('driverApp.expenses')}</div>
            <button className="dm-chip" onClick={() => setShowActions(!showActions)} style={{ fontSize: 13 }}>
              {showActions ? t('driverApp.hide') : t('driverApp.logExpense')}
            </button>
          </div>
          {showActions && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { icon: '⛽', label: t('driverApp.fuel'), cat: 'fuel' },
                { icon: '🛣', label: t('driverApp.toll'), cat: 'toll' },
                { icon: '🔧', label: t('driverApp.repair'), cat: 'repair' },
                { icon: '💪', label: t('driverApp.lumper'), cat: 'lumper' },
                { icon: '🅿️', label: t('driverApp.parking'), cat: 'parking' },
                { icon: '⏱', label: t('driverApp.delay'), cat: '__delay__' },
              ].map(({ icon, label, cat }) => (
                <button
                  key={cat}
                  className="dm-card"
                  onClick={() => { if (cat === '__delay__') { setReportDelayOpen(true); } else { setExpenseCategory(cat); setLogExpenseOpen(true); } vibrate(20); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', cursor: 'pointer', border: 'none' }}
                >
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--dm-muted)' }}>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Expenses Summary ─── */}
      {tripExpenses && (tripExpenses.expenses?.length ?? 0) > 0 && (
        <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{t('driverApp.tripExpenses')}</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: ios.blue }}>${tripExpenses.summary?.total?.toLocaleString() || '0'}</div>
          </div>
          <div className="dm-inset-group">
            {tripExpenses.expenses.slice(0, 5).map((e: any) => (
              <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: 15 }}>
                <span style={{ textTransform: 'capitalize', color: 'var(--dm-muted)' }}>{e.category}</span>
                <span style={{ fontWeight: 600 }}>${e.amount?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOS */}
      {load && (
        <SOSButton
          loadId={load.id || (load as any)._id}
          onSendSOS={async (data) => {
            const locStr = `${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)}`;
            await loadApi.sendSOS(load.id, { message: data.message, location: locStr });
            setToast('SOS sent!');
          }}
          emergencyContacts={[{ name: 'Fleet Owner', role: 'Owner' }, { name: 'Dispatcher', role: 'Dispatch' }]}
        />
      )}

      {/* iOS Toast */}
      {toast && (
        <div style={{
          position: 'fixed', left: 16, right: 16, bottom: 100,
          display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 999,
          animation: 'ios-fadeUp 0.25s ease',
        }}>
          <div style={{
            background: 'var(--dm-text)', color: 'var(--dm-bg)',
            padding: '12px 20px', borderRadius: 50,
            fontSize: 15, fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}>
            {toast}
          </div>
        </div>
      )}

      {/* Dialogs */}
      {load && (
        <>
          <DriverFormDialog open={driverFormOpen} onClose={() => setDriverFormOpen(false)} load={ensureLoadId(load)} onSuccess={() => { setDriverFormOpen(false); fetchLoad(); setToast('Form submitted!'); }} />
          <StartTripDialog open={startTripOpen} onClose={() => setStartTripOpen(false)} load={ensureLoadId(load)} onSuccess={() => { setStartTripOpen(false); fetchLoad(); fetchLocationHistory(); requestLocationAccess(); setToast('Trip started! Tracking location...'); }} />
          <ShipperCheckInDialog open={shipperCheckInOpen} onClose={() => setShipperCheckInOpen(false)} load={ensureLoadId(load)} onSuccess={() => { withLocationSend(() => { setShipperCheckInOpen(false); fetchLoad(); fetchLocationHistory(); setToast('Checked in at shipper!'); }); }} />
          <LoadOutDialog open={loadOutOpen} onClose={() => setLoadOutOpen(false)} load={ensureLoadId(load)} onSuccess={() => { withLocationSend(() => { setLoadOutOpen(false); fetchLoad(); fetchLocationHistory(); setToast('BOL uploaded! Departing...'); }); }} />
          <ReceiverOffloadDialog open={receiverOffloadOpen} onClose={() => setReceiverOffloadOpen(false)} load={ensureLoadId(load)} onSuccess={() => { withLocationSend(() => { setReceiverOffloadOpen(false); fetchLoad(); fetchLocationHistory(); setToast('POD uploaded! Offload done.'); }); }} />
          <LogExpenseDialog open={logExpenseOpen} onClose={() => setLogExpenseOpen(false)} load={ensureLoadId(load)} onSuccess={() => { setLogExpenseOpen(false); fetchExpenses(); setToast('Expense logged!'); }} defaultCategory={expenseCategory} />
          <ReportDelayDialog open={reportDelayOpen} onClose={() => setReportDelayOpen(false)} load={ensureLoadId(load)} onSuccess={() => { setReportDelayOpen(false); fetchLoad(); setToast('Delay reported!'); }} />
          <EndTripDialog open={endTripOpen} onClose={() => setEndTripOpen(false)} load={ensureLoadId(load)} onSuccess={() => { setEndTripOpen(false); fetchLoad(); setToast('Trip ended!'); }} loadExpenses={tripExpenses} />
        </>
      )}

      {/* Document Analyzer */}
      <Suspense fallback={null}>
        <DocumentAnalyzer
          open={showDocAnalyzer}
          onClose={() => setShowDocAnalyzer(false)}
          file={docFile}
        />
      </Suspense>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
