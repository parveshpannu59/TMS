import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { loadApi } from '@/api/all.api';
import type { Load } from '@/types/all.types';
import '../../layouts/mobile/mobile.css';

// ── Reverse geocode cache ──
const geoCache = new Map<string, string>();

function useReverseGeocode(lat?: number, lng?: number): string | null {
  const [placeName, setPlaceName] = useState<string | null>(null);
  const key = lat && lng ? `${lat.toFixed(4)},${lng.toFixed(4)}` : null;

  useEffect(() => {
    if (!key || !lat || !lng) { setPlaceName(null); return; }
    if (geoCache.has(key)) { setPlaceName(geoCache.get(key)!); return; }

    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' },
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const addr = data.address;
        const name = [
          addr?.suburb || addr?.village || addr?.town || addr?.hamlet || '',
          addr?.city || addr?.county || addr?.state_district || '',
          addr?.state || '',
        ].filter(Boolean).slice(0, 2).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || '';
        geoCache.set(key, name);
        setPlaceName(name);
      })
      .catch(() => {
        if (!cancelled) setPlaceName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      });

    return () => { cancelled = true; };
  }, [key, lat, lng]);

  return placeName;
}

function TimelineLocation({ lat, lng }: { lat?: number; lng?: number }) {
  const place = useReverseGeocode(lat, lng);
  if (!lat || !lng) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span style={{ fontSize: 12, color: '#007aff', fontWeight: 500 }}>
        {place || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
      </span>
    </div>
  );
}

// ── Constants ──
const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  trip_accepted: 'Ready to Start',
  trip_started: 'En Route to Pickup',
  shipper_check_in: 'At Pickup',
  shipper_load_in: 'Loading',
  shipper_load_out: 'Loaded — Depart',
  in_transit: 'In Transit',
  receiver_check_in: 'At Delivery',
  receiver_offload: 'Offloading',
  completed: 'Trip Completed',
  delivered: 'Awaiting Approval',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  assigned: '#007aff',
  trip_accepted: '#34c759',
  trip_started: '#34c759',
  shipper_check_in: '#5ac8fa',
  shipper_load_in: '#06b6d4',
  shipper_load_out: '#af52de',
  in_transit: '#ff9500',
  receiver_check_in: '#ff2d55',
  receiver_offload: '#af52de',
  completed: '#22c55e',
  delivered: '#f59e0b',
  cancelled: '#8e8e93',
};

type TabType = 'all' | 'active' | 'pending' | 'completed';

const PAGE_SIZE = 10;

const formatDate = (d: string | Date | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatLocation = (loc: any) => {
  if (!loc) return '—';
  const parts = [loc.city, loc.state].filter(Boolean);
  return parts.length ? parts.join(', ') : loc.address || '—';
};

// Map tab -> status query for backend filtering
function getStatusQueryForTab(_tab: TabType): string | undefined {
  // 'all' means no filter
  // For 'active', 'pending', 'completed' we do client-side filtering because
  // each tab encompasses multiple statuses and the backend only accepts one status
  return undefined;
}

// 'assigned' loads should NOT appear until driver accepts via notification — only trip_accepted+
const activeStatuses = ['trip_accepted', 'trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'];
const deliveredStatuses = ['completed', 'delivered'];
const pendingStatuses = ['delivered'];

export default function DriverTripsMobile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Tab counts (fetched once from the full list count)
  const [tabCounts, setTabCounts] = useState({ all: 0, active: 0, pending: 0, completed: 0 });

  const fetchingRef = useRef(false);

  // Fetch loads with pagination
  const fetchLoads = useCallback(async (pageNum: number, append: boolean = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params: any = { page: pageNum, limit: PAGE_SIZE };
      const statusQ = getStatusQueryForTab(activeTab);
      if (statusQ) params.status = statusQ;

      const resp = await loadApi.getMyAssignedLoads(params);

      // Handle both paginated and non-paginated responses
      let newLoads: Load[] = [];
      let total = 0;
      let pages = 1;

      if (resp && typeof resp === 'object' && 'loads' in resp) {
        newLoads = (resp as any).loads || [];
        total = (resp as any).pagination?.total ?? newLoads.length;
        pages = (resp as any).pagination?.pages ?? 1;
      } else {
        newLoads = Array.isArray(resp) ? resp : [];
        total = newLoads.length;
      }

      if (append) {
        setLoads(prev => [...prev, ...newLoads]);
      } else {
        setLoads(newLoads);
      }

      setTotalCount(total);
      setHasMore(pageNum < pages);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load trips');
      if (!append) setLoads([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [activeTab]);

  // Fetch tab counts once on mount (small request to get all counts)
  const fetchTabCounts = useCallback(async () => {
    try {
      const allLoads = await loadApi.getMyAssignedLoads();
      const arr = Array.isArray(allLoads) ? allLoads : ((allLoads as any)?.loads || []);
      setTabCounts({
        all: arr.length,
        active: arr.filter((l: any) => activeStatuses.includes(l.status)).length,
        pending: arr.filter((l: any) => pendingStatuses.includes(l.status)).length,
        completed: arr.filter((l: any) => l.status === 'completed').length,
      });
    } catch {
      // ignore
    }
  }, []);

  // Fetch on mount and when tab changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLoads(1, false);
  }, [activeTab, fetchLoads]);

  // Fetch tab counts once
  const countsFetchedRef = useRef(false);
  useEffect(() => {
    if (countsFetchedRef.current) return;
    countsFetchedRef.current = true;
    fetchTabCounts();
  }, [fetchTabCounts]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLoads(nextPage, true);
  }, [page, fetchLoads]);

  // Client-side filtering for search and tab-specific statuses
  const filteredLoads = loads.filter((l) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        l.loadNumber?.toLowerCase().includes(q) ||
        l.customerName?.toLowerCase().includes(q) ||
        formatLocation(l.pickupLocation).toLowerCase().includes(q) ||
        formatLocation(l.deliveryLocation).toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    switch (activeTab) {
      case 'active':
        return activeStatuses.includes(l.status);
      case 'pending':
        return pendingStatuses.includes(l.status);
      case 'completed':
        return l.status === 'completed';
      default:
        return true;
    }
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const ios = { blue: '#007aff', green: '#34c759', orange: '#ff9500', red: '#ff3b30', purple: '#af52de' };

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, handleLoadMore]);

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 12 }}>
      {/* Header */}
      <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: -0.5, padding: '4px 0' }}>
        {t('driverApp.myLoads')}
      </div>

      {/* iOS Segmented Control */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: 'var(--dm-fill)', borderRadius: 10, padding: 3,
      }}>
        {(['all', 'active', 'pending', 'completed'] as TabType[]).map((tab) => {
          const tabLabels: Record<TabType, string> = {
            all: 'All',
            active: 'Active',
            pending: 'Pending',
            completed: 'Done',
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 4px', fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? 'var(--dm-surface)' : 'transparent',
                color: activeTab === tab ? 'var(--dm-text)' : 'var(--dm-muted)',
                border: 'none', cursor: 'pointer',
                borderRadius: 8, transition: 'all 0.2s',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontFamily: 'inherit',
              }}
            >
              {tabLabels[tab]}{tabCounts[tab] > 0 ? ` (${tabCounts[tab]})` : ''}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--dm-muted)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="dm-input"
          placeholder={t('driverApp.searchLoads')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: 42, fontSize: 15 }}
        />
      </div>

      {error && (
        <div className="dm-card" style={{ padding: 14, background: `${ios.red}08`, color: ios.red, fontSize: 14 }}>
          {error}
        </div>
      )}

      {loading && !loadingMore && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--dm-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🚛</div>
          <div style={{ fontSize: 15 }}>{t('driverApp.loadingTrips')}</div>
        </div>
      )}

      {!loading && filteredLoads.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--dm-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>📋</div>
          <div style={{ fontWeight: 600, fontSize: 17 }}>{t('driverApp.noResults')}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{t('driverApp.tryDifferentFilter')}</div>
        </div>
      )}

      {/* ─── Load Cards ─── */}
      {filteredLoads.map((load) => {
        const loadId = load.id || (load as any)._id;
        const isExpanded = expandedId === loadId;
        const isDelivered = deliveredStatuses.includes(load.status);
        const isPending = load.status === 'delivered';
        const loadData = load as any;

        return (
          <div key={loadId} className="dm-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Card Header */}
            <div
              style={{ display: 'grid', gap: 10, padding: 16, cursor: 'pointer' }}
              onClick={() => isDelivered ? toggleExpand(loadId) : navigate(`/driver/mobile/tracking/${loadId}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.2 }}>#{load.loadNumber}</div>
                <span style={{
                  padding: '4px 10px', borderRadius: 20,
                  background: `${STATUS_COLOR[load.status] || ios.blue}12`,
                  color: STATUS_COLOR[load.status] || ios.blue,
                  fontSize: 12, fontWeight: 600,
                }}>
                  {STATUS_LABELS[load.status] || load.status}
                </span>
              </div>

              <div style={{ fontSize: 14, color: 'var(--dm-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {formatLocation(load.pickupLocation)}
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><line x1="0" y1="5" x2="12" y2="5" stroke="var(--dm-muted)" strokeWidth="1" strokeDasharray="2 2"/><path d="M11 2L14 5L11 8" stroke="var(--dm-muted)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                {formatLocation(load.deliveryLocation)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: ios.green }}>${(load.rate || 0).toLocaleString()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isPending && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#f59e0b',
                      padding: '2px 8px', borderRadius: 10,
                      background: 'rgba(245,158,11,0.12)',
                      animation: 'ios-pulse 2s infinite',
                    }}>
                      ⏳ PENDING
                    </span>
                  )}
                  <span style={{ color: 'var(--dm-muted)', fontSize: 13 }}>{formatDate(load.pickupDate)}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dm-muted)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            </div>

            {/* Expanded Accordion - Trip Details */}
            {isExpanded && (
              <div style={{ borderTop: '0.5px solid var(--dm-separator)', padding: 16, display: 'grid', gap: 14, animation: 'ios-fadeUp 0.2s ease' }}>
                {/* Trip Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'var(--dm-fill)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 2 }}>{t('driverApp.pickup')}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{formatLocation(load.pickupLocation)}</div>
                    <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginTop: 2 }}>{formatDate(load.pickupDate)}</div>
                  </div>
                  <div style={{ background: 'var(--dm-fill)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginBottom: 2 }}>{t('driverApp.delivery')}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{formatLocation(load.deliveryLocation)}</div>
                    <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginTop: 2 }}>{formatDate(load.expectedDeliveryDate)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: t('driverApp.distance'), value: loadData.distance ? `${loadData.distance} mi` : '—' },
                    { label: t('driverApp.rate'), value: `$${(load.rate || 0).toLocaleString()}`, color: ios.green },
                    { label: t('driverApp.weight'), value: loadData.weight ? `${loadData.weight} lbs` : '—' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--dm-fill)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: color || 'var(--dm-text)', marginTop: 2 }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                {loadData.statusHistory && loadData.statusHistory.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>{t('driverApp.timeline')}</div>
                    <div style={{ display: 'grid', gap: 0 }}>
                      {loadData.statusHistory.slice().reverse().map((h: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18 }}>
                            <div style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: i === 0 ? ios.green : (STATUS_COLOR[h.status] || 'var(--dm-muted)'),
                              flexShrink: 0,
                              boxShadow: i === 0 ? `0 0 0 3px ${ios.green}30` : 'none',
                            }} />
                            {i < loadData.statusHistory.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'var(--dm-separator)' }} />}
                          </div>
                          <div style={{ flex: 1, paddingBottom: 2 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: i === 0 ? ios.green : 'var(--dm-text)' }}>
                              {STATUS_LABELS[h.status] || h.status?.replace(/_/g, ' ')}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--dm-muted)', marginTop: 2 }}>
                              {new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {h.notes && <div style={{ fontSize: 13, color: 'var(--dm-text)', marginTop: 3 }}>{h.notes}</div>}
                            <TimelineLocation lat={h.lat} lng={h.lng} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {loadData.documents && (loadData.documents.bol || loadData.documents.pod || (loadData.documents.others?.length > 0)) && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{t('driverApp.documents')}</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {loadData.documents.bol && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--dm-fill)', borderRadius: 10 }}>
                          <span style={{ fontSize: 18 }}>📄</span>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>Bill of Lading (BOL)</span>
                        </div>
                      )}
                      {loadData.documents.pod && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--dm-fill)', borderRadius: 10 }}>
                          <span style={{ fontSize: 18 }}>📄</span>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>Proof of Delivery (POD)</span>
                        </div>
                      )}
                      {loadData.documents.others?.map((_: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--dm-fill)', borderRadius: 10 }}>
                          <span style={{ fontSize: 18 }}>📄</span>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>Document {i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trip Completion */}
                {loadData.tripCompletionDetails && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{t('driverApp.tripCompletion')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: 'var(--dm-fill)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>{t('driverApp.totalMiles')}</div>
                        <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>{loadData.tripCompletionDetails.totalMiles || '—'}</div>
                      </div>
                      <div style={{ background: 'var(--dm-fill)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>{t('driverApp.totalPayment')}</div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: ios.green, marginTop: 2 }}>${loadData.tripCompletionDetails.totalPayment?.toLocaleString() || '—'}</div>
                      </div>
                    </div>
                    {loadData.tripCompletionDetails.expenses && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                        {[
                          { label: 'Fuel', value: loadData.tripCompletionDetails.expenses.fuelExpenses || 0 },
                          { label: 'Tolls', value: loadData.tripCompletionDetails.expenses.tolls || 0 },
                          { label: 'Other', value: loadData.tripCompletionDetails.expenses.otherCosts || 0 },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: 'var(--dm-fill)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>${value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="dm-btn ghost"
                  onClick={() => navigate(`/driver/mobile/tracking/${loadId}`)}
                  style={{ borderRadius: 12, fontSize: 14 }}
                >
                  {t('driverApp.viewFullDetails')}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Infinite scroll sentinel + Load More button ── */}
      {hasMore && !loading && filteredLoads.length > 0 && (
        <div ref={sentinelRef} style={{ textAlign: 'center', padding: '12px 0' }}>
          {loadingMore ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--dm-muted)', fontSize: 14 }}>
              <div className="dm-spinner" style={{ width: 18, height: 18, border: '2px solid var(--dm-separator)', borderTopColor: ios.blue, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Loading more...
            </div>
          ) : (
            <button
              className="dm-btn ghost"
              onClick={handleLoadMore}
              style={{ borderRadius: 12, fontSize: 14, padding: '10px 24px' }}
            >
              Load More ({filteredLoads.length} of {totalCount})
            </button>
          )}
        </div>
      )}

      {/* Spinner CSS */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
