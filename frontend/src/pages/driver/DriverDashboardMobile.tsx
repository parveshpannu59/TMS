import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { loadApi } from '@/api/all.api';
import { driverApi } from '@/api/driver.api';
import { StartTripDialog } from '@/components/driver/StartTripDialog';
import { DriverFormDialog } from '@/components/driver/DriverFormDialog';
import { ShipperCheckInDialog } from '@/components/driver/ShipperCheckInDialog';
import { LoadInDialog } from '@/components/driver/LoadInDialog';
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
  trip_started: 'En Route to Pickup',
  shipper_check_in: 'At Pickup',
  shipper_load_in: 'Loading',
  shipper_load_out: 'Loaded — Upload BOL',
  in_transit: 'In Transit',
  receiver_check_in: 'At Delivery',
  receiver_offload: 'Offloading — Upload POD',
  delivered: 'Delivered — Under Review',
  completed: 'Trip Completed',
};

/* STATUS_COLOR used internally via DUTY_STATUS_CONFIG */

// ─── Duty Status Styling ─────────────────
const DUTY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  on_duty:                { label: 'On Duty',               color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '🟢' },
  on_trip:                { label: 'On Duty',               color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '🟢' },
  waiting_for_approval:   { label: 'Waiting for Approval',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
  off_duty:               { label: 'Off Duty',              color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '⚪' },
  active:                 { label: 'Available',             color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: '🔵' },
  inactive:               { label: 'Inactive',              color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
};

export default function DriverDashboardMobile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTripDialogOpen, setStartTripDialogOpen] = useState(false);
  const [driverFormDialogOpen, setDriverFormDialogOpen] = useState(false);
  const [shipperCheckInDialogOpen, setShipperCheckInDialogOpen] = useState(false);
  const [loadInDialogOpen, setLoadInDialogOpen] = useState(false);
  const [loadOutDialogOpen, setLoadOutDialogOpen] = useState(false);
  const [receiverOffloadDialogOpen, setReceiverOffloadDialogOpen] = useState(false);
  const [endTripDialogOpen, setEndTripDialogOpen] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const lastLocationSentRef = useRef<number>(0);
  const [scanPodPhoto, setScanPodPhoto] = useState<File | null>(null);
  const scanPodInputRef = useRef<HTMLInputElement>(null);
  const [logExpenseOpen, setLogExpenseOpen] = useState(false);
  const [logExpenseCategory, setLogExpenseCategory] = useState('fuel');
  const [expenseCategoryAnchor, setExpenseCategoryAnchor] = useState<null | HTMLElement>(null);
  const [reportDelayOpen, setReportDelayOpen] = useState(false);
  const [tripExpenses, setTripExpenses] = useState<{ expenses: any[]; summary: { total: number; fuel: number; tolls: number; other: number } } | null>(null);

  // ─── Driver Duty Status (auto-managed by backend) ───
  const [dutyStatus, setDutyStatus] = useState<string>('off_duty');

  const fetchDutyStatus = useCallback(async () => {
    try {
      const data = await driverApi.getMyDutyStatus();
      setDutyStatus(data.status || 'off_duty');
    } catch { /* silent */ }
  }, []);

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

  // Only show loads the driver has ACCEPTED (trip_accepted) — not 'assigned' (pending acceptance via notification)
  const acceptedLoad = loads.find(
    (l) => l.status === 'trip_accepted'
  ) || null;

  const activeLoad = loads.find(
    (l) => ['trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'].includes(l.status)
  ) || null;

  const displayLoad = activeLoad || acceptedLoad;
  const deliveredLoads = loads.filter(l => l.status === 'delivered');
  const completedLoads = loads.filter(l => l.status === 'completed');

  // Track if any dialog is open — pause auto-refresh to prevent form resets
  const anyDialogOpen = startTripDialogOpen || driverFormDialogOpen || shipperCheckInDialogOpen
    || loadInDialogOpen || loadOutDialogOpen || receiverOffloadDialogOpen || endTripDialogOpen || logExpenseOpen;

  useEffect(() => {
    fetchLoads();
    fetchDutyStatus();
    const id = setInterval(() => {
      if (!anyDialogOpen) { fetchLoads(); fetchDutyStatus(); }
    }, 30000);
    return () => clearInterval(id);
  }, [fetchLoads, fetchDutyStatus, anyDialogOpen]);

  // Auto-refresh when driver accepts an assignment from the notification sheet
  useEffect(() => {
    const handler = () => {
      fetchLoads();
      fetchDutyStatus();
    };
    window.addEventListener('assignment-accepted', handler);
    return () => window.removeEventListener('assignment-accepted', handler);
  }, [fetchLoads, fetchDutyStatus]);

  // Live GPS tracking when trip is started
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

  const handleLoadIn = useCallback(() => {
    if (!activeLoad || activeLoad.status !== 'shipper_check_in') return;
    vibrate(30);
    setLoadInDialogOpen(true);
  }, [activeLoad]);

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
    if (s === 'trip_accepted') {
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

  // ─── Derived duty status (auto from backend or computed from loads) ───
  const effectiveDuty = useMemo(() => {
    if (activeLoad) return 'on_duty';
    if (deliveredLoads.length > 0) return 'waiting_for_approval';
    return dutyStatus;
  }, [activeLoad, deliveredLoads, dutyStatus]);

  const dutyConfig = DUTY_STATUS_CONFIG[effectiveDuty] || DUTY_STATUS_CONFIG['off_duty'];

  const ios = {
    blue: '#007aff',
    green: '#34c759',
    orange: '#ff9500',
    red: '#ff3b30',
    purple: '#af52de',
    teal: '#5ac8fa',
    gray: '#8e8e93',
  };

  // Refresh after any dialog action (also refreshes duty status)
  const onDialogSuccess = useCallback((msg: string, closeFn: () => void) => {
    closeFn();
    fetchLoads();
    fetchDutyStatus();
    setToast(msg);
  }, [fetchLoads, fetchDutyStatus]);

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 14 }}>
      {error && (
        <div className="dm-card" style={{ padding: 14, background: 'rgba(255,59,48,0.08)', color: ios.red, fontSize: 14, fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* ═══ Duty Status Banner ═══ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderRadius: 14,
        background: dutyConfig.bg,
        border: `1px solid ${dutyConfig.color}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>{dutyConfig.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: dutyConfig.color }}>{dutyConfig.label}</div>
            <div style={{ fontSize: 11, color: 'var(--dm-muted)', marginTop: 1 }}>
              {effectiveDuty === 'on_duty' ? 'Trip in progress' :
               effectiveDuty === 'waiting_for_approval' ? 'Awaiting owner review' :
               effectiveDuty === 'on_trip' ? 'Trip in progress' :
               'Ready for assignment'}
            </div>
          </div>
        </div>
        {trackingActive && effectiveDuty === 'on_duty' && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, color: ios.green,
            padding: '4px 10px', borderRadius: 20,
            background: `${ios.green}15`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ios.green, animation: 'ios-pulse 2s infinite' }} />
            LIVE
          </span>
        )}
      </div>

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
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 }}>Active Trip</span>
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
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>From</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{pickupCity}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                <svg width="28" height="14" viewBox="0 0 28 14" fill="none">
                  <line x1="0" y1="7" x2="24" y2="7" stroke="white" strokeWidth="1.5" strokeDasharray="3 2"/>
                  <path d="M22 3L27 7L22 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>To</div>
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
              Open Tracking
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
            <span style={{ fontSize: 12, fontWeight: 600, color: ios.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ready to Start</span>
          </div>
          <div style={{ padding: '16px 18px', display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--dm-muted)' }}>Load</div>
              <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>#{acceptedLoad.loadNumber}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 2 }}>Pickup</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{formatLocation(acceptedLoad.pickupLocation)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 2 }}>Delivery</div>
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
                {(acceptedLoad as any).driverFormDetails ? 'Start Trip' : 'Fill Trip Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Trip Progress Stepper (only during active trip) ═══ */}
      {activeLoad && (() => {
        const TRIP_STEPS = [
          { key: 'trip_started', label: 'Start Trip', icon: '🚛', detail: 'En route to pickup' },
          { key: 'shipper_check_in', label: 'At Pickup', icon: '📍', detail: 'Check in at shipper' },
          { key: 'shipper_load_in', label: 'Loaded', icon: '📦', detail: 'Lumper fee & confirm loading' },
          { key: 'shipper_load_out', label: 'BOL Upload', icon: '📄', detail: 'Upload Bill of Lading' },
          { key: 'in_transit', label: 'Transit', icon: '🛣', detail: 'Driving to delivery' },
          { key: 'receiver_check_in', label: 'At Delivery', icon: '🏁', detail: 'Arrive at receiver' },
          { key: 'receiver_offload', label: 'POD Upload', icon: '📋', detail: 'Upload Proof of Delivery' },
          { key: 'delivered', label: 'Complete', icon: '✅', detail: 'End trip' },
        ];
        const currentIdx = TRIP_STEPS.findIndex(s => s.key === activeLoad.status);
        const STEP_DESCRIPTIONS: Record<string, { text: string; color: string }> = {
          trip_started:       { text: 'Drive to the shipper/pickup location and tap "Arrived at Pickup" when you get there.', color: ios.blue },
          shipper_check_in:   { text: 'You\'re at the shipper. Tap "Confirm Loaded" to check in, enter lumper fee details, and confirm loading is complete.', color: ios.teal },
          shipper_load_in:    { text: 'Loading done! Now upload the Bill of Lading (BOL) and depart from the shipper.', color: ios.purple },
          shipper_load_out:   { text: 'BOL uploaded! Drive to the delivery location and tap "Arrived at Delivery" when you arrive.', color: ios.blue },
          in_transit:         { text: 'You\'re in transit. Tap "Arrived at Delivery" when you reach the receiver location.', color: ios.blue },
          receiver_check_in:  { text: 'You\'re at the receiver. Upload Proof of Delivery (POD) and confirm offload is complete.', color: ios.orange },
          receiver_offload:   { text: 'POD uploaded! Tap "End Trip" to complete the delivery and submit for approval.', color: ios.red },
        };
        const stepInfo = STEP_DESCRIPTIONS[activeLoad.status];

        // Build completed steps timeline from statusHistory
        const statusHistory: Array<{ status: string; timestamp: string; notes?: string }> = (activeLoad as any).statusHistory || [];
        const completedSteps = TRIP_STEPS.filter((_, i) => currentIdx > i).map((step) => {
          const historyEntry = statusHistory.find((h: any) => h.status === step.key);
          return {
            ...step,
            completedAt: historyEntry ? new Date(historyEntry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
          };
        });

        return (
          <div style={{ display: 'grid', gap: 10 }}>
            {/* Stepper bar */}
            <div className="dm-card" style={{ padding: '14px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
                {TRIP_STEPS.map((step, i) => {
                  const isDone = currentIdx > i;
                  const isCurrent = currentIdx === i;
                  return (
                    <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: isDone ? ios.green : isCurrent ? ios.blue : '#e5e7eb',
                        color: isDone || isCurrent ? '#fff' : '#9ca3af',
                        display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
                        boxShadow: isCurrent ? `0 0 0 3px ${ios.blue}30` : 'none',
                        zIndex: 1, transition: 'all 0.3s ease',
                      }}>
                        {isDone ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <span style={{ fontSize: 10 }}>{step.icon}</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 8, marginTop: 3,
                        color: isCurrent ? ios.blue : isDone ? ios.green : '#9ca3af',
                        fontWeight: isCurrent ? 700 : 500,
                        textAlign: 'center', lineHeight: 1.1,
                      }}>
                        {step.label}
                      </div>
                      {i < TRIP_STEPS.length - 1 && (
                        <div style={{
                          position: 'absolute', top: 12, left: '60%', right: '-40%', height: 2,
                          background: isDone ? ios.green : '#e5e7eb', zIndex: 0,
                          transition: 'background 0.3s',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Completed steps timeline */}
              {completedSteps.length > 0 && (
                <div style={{ borderTop: '1px solid var(--dm-fill)', paddingTop: 8, marginTop: 4 }}>
                  {completedSteps.map((step) => (
                    <div key={step.key} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '3px 4px', fontSize: 11,
                    }}>
                      <span style={{ color: ios.green, fontSize: 10, flexShrink: 0 }}>✓</span>
                      <span style={{ color: 'var(--dm-muted)', flex: 1 }}>
                        <span style={{ fontWeight: 600, color: 'var(--dm-text)' }}>{step.label}</span>
                        {' — '}{step.detail}
                      </span>
                      {step.completedAt && (
                        <span style={{ color: 'var(--dm-muted)', fontSize: 10, flexShrink: 0 }}>{step.completedAt}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current step description + Primary Action */}
            {stepInfo && (
              <div style={{
                padding: '12px 16px', borderRadius: 12,
                background: `${stepInfo.color}10`, border: `1px solid ${stepInfo.color}20`,
                fontSize: 13, color: 'var(--dm-text)', fontWeight: 500, lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 700, color: stepInfo.color, marginBottom: 4, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Step {currentIdx + 1} of {TRIP_STEPS.length}
                </div>
                {stepInfo.text}
              </div>
            )}

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
                Live Tracking
              </button>
              <button
                className="dm-btn ghost"
                onClick={() => { vibrate(20); setReportDelayOpen(true); }}
                style={{ borderRadius: 12, fontSize: 14 }}
              >
                Report Delay
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { icon: '⛽', label: 'Fuel', cat: 'fuel' },
                { icon: '🛣', label: 'Toll', cat: 'toll' },
                { icon: '🔧', label: 'Repair', cat: 'repair' },
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
        );
      })()}

      {/* ═══ Waiting for Approval Banner ═══ */}
      {deliveredLoads.length > 0 && !activeLoad && (
        <div className="dm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 18px',
            background: 'rgba(245,158,11,0.1)',
            borderBottom: '0.5px solid rgba(245,158,11,0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>⏳</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>Waiting for Approval</span>
          </div>
          <div style={{ padding: '14px 18px', display: 'grid', gap: 10 }}>
            {deliveredLoads.map((load) => (
              <div
                key={load.id || (load as any)._id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 10, background: 'var(--dm-fill)',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/driver/mobile/tracking/${load.id || (load as any)._id}`)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>#{load.loadNumber}</div>
                  <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginTop: 2 }}>
                    {formatLocation(load.pickupLocation)} → {formatLocation(load.deliveryLocation)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#f59e0b',
                    padding: '3px 8px', borderRadius: 12,
                    background: 'rgba(245,158,11,0.12)',
                  }}>
                    Under Review
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dm-muted)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--dm-muted)', padding: '0 4px' }}>
              Your trip has been delivered. The owner/dispatcher will review and approve it. You can still submit expenses for the next 48 hours.
            </div>
            {/* Allow expense submission for delivered loads */}
            {deliveredLoads[0] && (
              <>
                <button
                  className="dm-btn ghost"
                  onClick={(e) => setExpenseCategoryAnchor(e.currentTarget)}
                  style={{ borderRadius: 12, fontSize: 14 }}
                >
                  + Submit Expense / Reimbursement
                </button>
                <Menu
                  anchorEl={expenseCategoryAnchor}
                  open={!!expenseCategoryAnchor}
                  onClose={() => setExpenseCategoryAnchor(null)}
                  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                  transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                  PaperProps={{ sx: { borderRadius: 3, minWidth: 220, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', mt: -1 } }}
                >
                  {[
                    { key: 'fuel', label: 'Fuel', icon: '⛽' },
                    { key: 'toll', label: 'Toll', icon: '🛣️' },
                    { key: 'repair', label: 'Repair / Maintenance', icon: '🔧' },
                    { key: 'other', label: 'Other Expense', icon: '📋' },
                  ].map(opt => (
                    <MenuItem
                      key={opt.key}
                      onClick={() => {
                        setExpenseCategoryAnchor(null);
                        setLogExpenseCategory(opt.key);
                        setLogExpenseOpen(true);
                      }}
                      sx={{ fontSize: 14, fontWeight: 500, gap: 1.5, py: 1.2 }}
                    >
                      <span style={{ fontSize: 18 }}>{opt.icon}</span> {opt.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Stats Grid ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Active', value: loads.filter(l => !['completed', 'delivered', 'cancelled'].includes(l.status)).length, color: ios.blue },
          { label: 'Delivered', value: deliveredLoads.length + completedLoads.length, color: ios.green },
          { label: 'Expenses', value: `$${tripExpenses?.summary?.total || 0}`, color: ios.orange },
        ].map(({ label, value, color }) => (
          <div key={label} className="dm-card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 800, fontSize: 24, color, letterSpacing: -0.5 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ═══ Trip Expenses (during active trip) ═══ */}
      {activeLoad && tripExpenses && (tripExpenses.expenses?.length ?? 0) > 0 && (
        <div className="dm-card" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>Trip Expenses</div>
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
          <div style={{ fontWeight: 600, fontSize: 17, padding: '0 4px' }}>Completed Trips</div>
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
            View All Trips
          </button>
        </div>
      )}

      {/* ═══ Empty State ═══ */}
      {!loading && !acceptedLoad && !activeLoad && deliveredLoads.length === 0 && completedLoads.length === 0 && (
        <div className="dm-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>🚛</div>
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}>No Active Trips</div>
          <div style={{ fontSize: 14, color: 'var(--dm-muted)', lineHeight: 1.5 }}>
            You're currently off duty. New trip assignments will appear here.
          </div>
        </div>
      )}

      {/* ═══ Dialogs & Toast ═══ */}
      {displayLoad && (
        <ReportDelayDialog
          open={reportDelayOpen}
          onClose={() => setReportDelayOpen(false)}
          load={ensureLoadId(displayLoad)}
          onSuccess={() => onDialogSuccess('Delay reported', () => setReportDelayOpen(false))}
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
            onSuccess={() => onDialogSuccess('Trip form submitted!', () => setDriverFormDialogOpen(false))}
          />
          <StartTripDialog
            open={startTripDialogOpen}
            onClose={() => setStartTripDialogOpen(false)}
            load={ensureLoadId(acceptedLoad)}
            onSuccess={() => onDialogSuccess('Trip started! You are now On Duty.', () => setStartTripDialogOpen(false))}
          />
        </>
      )}

      {/* For active or delivered loads — allow expense submission */}
      {(activeLoad || deliveredLoads[0]) && (
        <>
          {activeLoad && (
            <>
              <ShipperCheckInDialog
                open={shipperCheckInDialogOpen}
                onClose={() => setShipperCheckInDialogOpen(false)}
                load={ensureLoadId(activeLoad)}
                onSuccess={() => onDialogSuccess('Shipper check-in done!', () => setShipperCheckInDialogOpen(false))}
              />
              <LoadInDialog
                open={loadInDialogOpen}
                onClose={() => setLoadInDialogOpen(false)}
                load={ensureLoadId(activeLoad)}
                onSuccess={() => onDialogSuccess('Loading confirmed!', () => setLoadInDialogOpen(false))}
              />
              <LoadOutDialog
                open={loadOutDialogOpen}
                onClose={() => setLoadOutDialogOpen(false)}
                load={ensureLoadId(activeLoad)}
                onSuccess={() => onDialogSuccess('Load out complete!', () => setLoadOutDialogOpen(false))}
              />
              <ReceiverOffloadDialog
                open={receiverOffloadDialogOpen}
                onClose={() => { setReceiverOffloadDialogOpen(false); setScanPodPhoto(null); }}
                load={ensureLoadId(activeLoad)}
                onSuccess={() => { setScanPodPhoto(null); onDialogSuccess('Offload complete!', () => setReceiverOffloadDialogOpen(false)); }}
                initialPodPhoto={scanPodPhoto}
              />
              <EndTripDialog
                open={endTripDialogOpen}
                onClose={() => setEndTripDialogOpen(false)}
                load={ensureLoadId(activeLoad)}
                onSuccess={() => onDialogSuccess('Trip delivered! Waiting for approval.', () => setEndTripDialogOpen(false))}
                loadExpenses={tripExpenses}
              />
            </>
          )}
          <LogExpenseDialog
            open={logExpenseOpen}
            onClose={() => setLogExpenseOpen(false)}
            load={ensureLoadId(activeLoad || deliveredLoads[0])}
            onSuccess={() => { setLogExpenseOpen(false); fetchTripExpenses(); fetchLoads(); setToast('Expense logged!'); }}
            defaultCategory={logExpenseCategory}
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
