import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useNavigate } from 'react-router-dom';
import type { Load } from '@/types/all.types';
import '../../layouts/mobile/mobile.css';

function vibrate(pattern: number | number[]) {
  if (navigator && 'vibrate' in navigator) {
    (navigator as any).vibrate(pattern);
  }
}

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  trip_accepted: 'Ready to Start',
  trip_started: 'On Route to First Stop',
  shipper_check_in: 'At Shipper',
  shipper_load_in: 'Loading',
  shipper_load_out: 'Loaded',
  in_transit: 'In Transit',
  receiver_check_in: 'At Receiver',
  receiver_offload: 'Offloading',
  delivered: 'Delivered',
  completed: 'Completed',
};

const STATUS_COLOR: Record<string, string> = {
  assigned: '#007aff',
  trip_accepted: '#34c759',
  trip_started: '#34c759',
  shipper_check_in: '#5ac8fa',
  shipper_load_in: '#5ac8fa',
  shipper_load_out: '#af52de',
  in_transit: '#ff9500',
  receiver_check_in: '#ff2d55',
  receiver_offload: '#af52de',
  delivered: '#34c759',
  completed: '#34c759',
};

export default function DriverDashboardMobile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTripDialogOpen, setStartTripDialogOpen] = useState(false);
  const [driverFormDialogOpen, setDriverFormDialogOpen] = useState(false);
  const [shipperCheckInDialogOpen, setShipperCheckInDialogOpen] = useState(false);
  const [loadOutDialogOpen, setLoadOutDialogOpen] = useState(false);
  const [receiverOffloadDialogOpen, setReceiverOffloadDialogOpen] = useState(false);
  const [endTripDialogOpen, setEndTripDialogOpen] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const lastLocationSentRef = useRef<number>(0);
  const [scanPodPhoto, setScanPodPhoto] = useState<File | null>(null);
  const scanPodInputRef = useRef<HTMLInputElement>(null);
  const [logExpenseOpen, setLogExpenseOpen] = useState(false);
  const [logExpenseCategory, setLogExpenseCategory] = useState('fuel');
  const [reportDelayOpen, setReportDelayOpen] = useState(false);
  const [tripExpenses, setTripExpenses] = useState<{ expenses: any[]; summary: { total: number; fuel: number; tolls: number; other: number } } | null>(null);

  const fetchingLoadsRef = useRef(false);
  const fetchLoads = useCallback(async () => {
    if (fetchingLoadsRef.current) return;
    fetchingLoadsRef.current = true;
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
      fetchingLoadsRef.current = false;
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
  const completedLoads = loads.filter(l => ['completed', 'delivered'].includes(l.status));

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

  const fetchTripExpenses = useCallback(async () => {
    if (!activeLoad?.id) return;
    try {
      const data = await loadApi.getLoadExpenses(activeLoad.id || (activeLoad as any)._id);
      setTripExpenses(data);
    } catch {
      setTripExpenses(null);
    }
  }, [activeLoad?.id]);

  useEffect(() => {
    if (activeLoad?.id) fetchTripExpenses();
  }, [activeLoad?.id, fetchTripExpenses]);

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

  const handleOpenEndTrip = useCallback(() => {
    vibrate(30);
    fetchTripExpenses();
    setEndTripDialogOpen(true);
  }, [fetchTripExpenses]);

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
    const hasForm = !!(displayLoad as any).driverFormDetails;
    if (['assigned', 'trip_accepted'].includes(s)) {
      if (!hasForm)
        return { label: t('driverApp.fillTripForm'), fn: () => { vibrate(30); setDriverFormDialogOpen(true); } };
      return { label: t('driverApp.startTrip'), fn: () => { vibrate(30); setStartTripDialogOpen(true); } };
    }
    if (s === 'trip_started')
      return { label: t('driverApp.arrivedAtPickup'), fn: () => { vibrate(30); setShipperCheckInDialogOpen(true); } };
    if (s === 'shipper_check_in')
      return { label: t('driverApp.confirmLoaded'), fn: handleLoadIn };
    if (s === 'shipper_load_in')
      return { label: t('driverApp.uploadBolDepart'), fn: () => { vibrate(30); setLoadOutDialogOpen(true); } };
    if (['shipper_load_out', 'in_transit'].includes(s))
      return { label: t('driverApp.arrivedAtDelivery'), fn: handleReceiverCheckIn };
    if (s === 'receiver_check_in')
      return { label: t('driverApp.uploadPodOffload'), fn: () => { vibrate(30); setReceiverOffloadDialogOpen(true); } };
    if (s === 'receiver_offload')
      return { label: t('driverApp.endTrip'), fn: handleOpenEndTrip };
    return null;
  }, [displayLoad, handleLoadIn, handleReceiverCheckIn, handleOpenEndTrip]);

  const primaryAction = useMemo(() => {
    if (nextAction) return { label: nextAction.label, onClick: nextAction.fn };
    if (!displayLoad) return { label: t('driverApp.viewAll'), onClick: () => navigate('/driver/mobile/trips') };
    return { label: t('common.retry'), onClick: () => fetchLoads() };
  }, [nextAction, displayLoad, fetchLoads, navigate]);

  const formatLocation = (loc: any) => {
    if (!loc) return '—';
    const parts = [loc.city, loc.state].filter(Boolean);
    return parts.length ? parts.join(', ') : loc.address || '—';
  };

  const pickupCity = formatLocation(displayLoad?.pickupLocation);
  const deliveryCity = formatLocation(displayLoad?.deliveryLocation);

  // ─── iOS-Style Colors ─────────────────
  const ios = {
    blue: '#007aff',
    green: '#34c759',
    orange: '#ff9500',
    red: '#ff3b30',
    purple: '#af52de',
    teal: '#5ac8fa',
    gray: '#8e8e93',
  };

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 14 }}>
      {error && (
        <div className="dm-card" style={{ padding: 14, background: 'rgba(255,59,48,0.08)', color: ios.red, fontSize: 14, fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* ═══ Active Trip Hero Card ═══ */}
      {activeLoad && (
        <div
          className="dm-card"
          style={{
            padding: 0, overflow: 'hidden', cursor: 'pointer',
            background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
            color: '#fff',
          }}
          onClick={() => navigate(`/driver/mobile/tracking/${activeLoad.id || (activeLoad as any)._id}`)}
        >
          <div style={{ padding: '20px 18px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 }}>{t('driverApp.activeTrip')}</span>
                {trackingActive && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'ios-pulse 2s infinite' }} />
                    {t('driverApp.live')}
                  </span>
                )}
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                fontSize: 12, fontWeight: 600,
              }}>
                {STATUS_LABELS[activeLoad.status] || activeLoad.status}
              </span>
            </div>

            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 2 }}>Load #{activeLoad.loadNumber}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>{t('driverApp.from')}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{pickupCity}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                <svg width="28" height="14" viewBox="0 0 28 14" fill="none">
                  <line x1="0" y1="7" x2="24" y2="7" stroke="white" strokeWidth="1.5" strokeDasharray="3 2"/>
                  <path d="M22 3L27 7L22 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>{t('driverApp.to')}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{deliveryCity}</div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 18px',
            background: 'rgba(0,0,0,0.12)',
          }}>
            <div style={{ fontWeight: 800, fontSize: 22 }}>${(activeLoad.rate || 0).toLocaleString()}</div>
            <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {t('driverApp.openTracking')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Accepted Trip Card ═══ */}
      {acceptedLoad && !activeLoad && (
        <div className="dm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '6px 18px',
            background: `${ios.green}12`,
            borderBottom: `0.5px solid ${ios.green}20`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ios.green }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: ios.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('driverApp.readyToStart')}</span>
          </div>
          <div style={{ padding: '16px 18px', display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>{t('driverApp.load')}</div>
              <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>#{acceptedLoad.loadNumber}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 2 }}>{t('driverApp.pickup')}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{formatLocation(acceptedLoad.pickupLocation)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 2 }}>{t('driverApp.delivery')}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{formatLocation(acceptedLoad.deliveryLocation)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 24, color: ios.green }}>${(acceptedLoad.rate || 0).toLocaleString()}</div>
              <button
                className="dm-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  vibrate(30);
                  if ((acceptedLoad as any).driverFormDetails) setStartTripDialogOpen(true);
                  else setDriverFormDialogOpen(true);
                }}
                style={{
                  width: 'auto', padding: '12px 28px',
                  background: ios.green, borderRadius: 50,
                  fontSize: 16,
                }}
              >
                {(acceptedLoad as any).driverFormDetails ? t('driverApp.startTrip') : t('driverApp.fillTripForm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Quick Actions ═══ */}
      {activeLoad && (
        <div style={{ display: 'grid', gap: 10 }}>
          <button
            className="dm-btn"
            onClick={primaryAction.onClick}
            style={{
              background: ios.green,
              borderRadius: 50,
              fontSize: 17,
              padding: '16px 24px',
              fontWeight: 700,
              boxShadow: `0 4px 16px ${ios.green}40`,
            }}
          >
            {primaryAction.label}
          </button>
          <div className="dm-row" style={{ gap: 8 }}>
            <button
              className="dm-btn ghost"
              onClick={() => navigate(`/driver/mobile/tracking/${activeLoad.id || (activeLoad as any)._id}`)}
              style={{ borderRadius: 12, fontSize: 14 }}
            >
              {t('driverApp.liveTracking')}
            </button>
            <button
              className="dm-btn ghost"
              onClick={() => { vibrate(20); setReportDelayOpen(true); }}
              style={{ borderRadius: 12, fontSize: 14 }}
            >
              {t('driverApp.reportDelay')}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { icon: '⛽', label: t('driverApp.fuel'), cat: 'fuel' },
              { icon: '🛣', label: t('driverApp.toll'), cat: 'toll' },
              { icon: '🔧', label: t('driverApp.repair'), cat: 'repair' },
            ].map(({ icon, label, cat }) => (
              <button
                key={cat}
                className="dm-card"
                onClick={() => { setLogExpenseCategory(cat); setLogExpenseOpen(true); vibrate(20); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '14px 8px', cursor: 'pointer', border: 'none', textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--dm-muted)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Today Overview ═══ */}
      <div className="dm-card" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: -0.3 }}>{t('driverApp.overview')}</div>
          <button
            className="dm-chip"
            onClick={() => { setOnline((v) => !v); vibrate(15); setToast(online ? t('driverApp.offDuty') : t('driverApp.onDuty')); }}
            style={{
              background: online ? `${ios.green}15` : 'var(--dm-fill)',
              color: online ? ios.green : 'var(--dm-muted)',
              fontWeight: 600, fontSize: 13,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? ios.green : ios.gray, display: 'inline-block', marginRight: 6 }} />
            {online ? t('driverApp.onDuty') : t('driverApp.offDuty')}
          </button>
        </div>

        {displayLoad && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'var(--dm-fill)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 4 }}>{t('driverApp.nextStop')}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{deliveryCity}</div>
            </div>
            <div style={{ background: 'var(--dm-fill)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 4 }}>{t('driverApp.eta')}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{displayLoad?.expectedDeliveryDate ? new Date(displayLoad.expectedDeliveryDate).toLocaleDateString() : '—'}</div>
            </div>
          </div>
        )}

        {!displayLoad && !loading && (
          <button className="dm-btn ghost" onClick={() => navigate('/driver/mobile/trips')} style={{ borderRadius: 12 }}>
            {t('driverApp.viewMyLoads')}
          </button>
        )}
      </div>

      {/* ═══ Stats Grid ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: t('driverApp.active'), value: loads.filter(l => !['completed', 'delivered', 'cancelled'].includes(l.status)).length, color: ios.blue },
          { label: t('driverApp.delivered'), value: completedLoads.length, color: ios.green },
          { label: t('driverApp.expenses'), value: `$${tripExpenses?.summary?.total || 0}`, color: ios.orange },
        ].map(({ label, value, color }) => (
          <div key={label} className="dm-card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 800, fontSize: 24, color, letterSpacing: -0.5 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ═══ Trip Expenses ═══ */}
      {activeLoad && tripExpenses && (tripExpenses.expenses?.length ?? 0) > 0 && (
        <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{t('driverApp.tripExpenses')}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: ios.blue }}>
              ${tripExpenses?.summary?.total?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="dm-inset-group">
            {tripExpenses.expenses.slice(0, 5).map((e: any) => (
              <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: 15 }}>
                <span style={{ textTransform: 'capitalize', color: 'var(--dm-text-secondary)' }}>{e.category}</span>
                <span style={{ fontWeight: 600 }}>${e.amount?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Recent Deliveries ═══ */}
      {completedLoads.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 17, padding: '0 4px' }}>{t('driverApp.recentDeliveries')}</div>
          <div className="dm-inset-group">
            {completedLoads.slice(0, 4).map((load) => (
              <div
                key={load.id || (load as any)._id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', cursor: 'pointer',
                }}
                onClick={() => navigate(`/driver/mobile/tracking/${load.id || (load as any)._id}`)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>#{load.loadNumber}</div>
                  <div style={{ fontSize: 13, color: 'var(--dm-muted)', marginTop: 2 }}>
                    {formatLocation(load.pickupLocation)} → {formatLocation(load.deliveryLocation)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: ios.green, fontSize: 15 }}>${(load.rate || 0).toLocaleString()}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dm-muted)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            ))}
          </div>
          <button className="dm-btn ghost" onClick={() => navigate('/driver/mobile/trips')} style={{ borderRadius: 12, fontSize: 14, marginTop: 4 }}>
            {t('driverApp.viewAll')}
          </button>
        </div>
      )}

      {/* ═══ Empty State ═══ */}
      {!loading && !acceptedLoad && !activeLoad && completedLoads.length === 0 && (
        <div className="dm-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>🚛</div>
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}>{t('driverApp.noActiveTrips')}</div>
          <div style={{ fontSize: 14, color: 'var(--dm-muted)', lineHeight: 1.5 }}>{t('driverApp.noActiveTripsDesc')}</div>
        </div>
      )}

      {/* ═══ Invisible Logic (Dialogs, SOS, Toast) ═══ */}
      {displayLoad && (
        <ReportDelayDialog
          open={reportDelayOpen}
          onClose={() => setReportDelayOpen(false)}
          load={ensureLoadId(displayLoad)}
          onSuccess={() => { setReportDelayOpen(false); fetchLoads(); setToast('Delay reported'); }}
        />
      )}

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

      {/* iOS Toast */}
      {toast && (
        <div style={{
          position: 'fixed', left: 16, right: 16, bottom: 100,
          display: 'grid', placeItems: 'center',
          pointerEvents: 'none', zIndex: 999,
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

      {acceptedLoad && (
        <>
          <DriverFormDialog
            open={driverFormDialogOpen}
            onClose={() => setDriverFormDialogOpen(false)}
            load={ensureLoadId(acceptedLoad)}
            onSuccess={() => { setDriverFormDialogOpen(false); fetchLoads(); setToast('Trip form submitted!'); }}
          />
          <StartTripDialog
            open={startTripDialogOpen}
            onClose={() => setStartTripDialogOpen(false)}
            load={ensureLoadId(acceptedLoad)}
            onSuccess={() => { setStartTripDialogOpen(false); fetchLoads(); setToast('Trip started!'); }}
          />
        </>
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
          <LogExpenseDialog
            open={logExpenseOpen}
            onClose={() => setLogExpenseOpen(false)}
            load={ensureLoadId(activeLoad)}
            onSuccess={() => { setLogExpenseOpen(false); fetchTripExpenses(); fetchLoads(); setToast('Expense logged!'); }}
            defaultCategory={logExpenseCategory}
          />
          <EndTripDialog
            open={endTripDialogOpen}
            onClose={() => setEndTripDialogOpen(false)}
            load={ensureLoadId(activeLoad)}
            onSuccess={() => { setEndTripDialogOpen(false); fetchLoads(); setToast('Trip ended!'); }}
            loadExpenses={tripExpenses}
          />
        </>
      )}

      <input
        ref={scanPodInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { setScanPodPhoto(file); setReceiverOffloadDialogOpen(true); }
          e.target.value = '';
        }}
      />
    </div>
  );
}
