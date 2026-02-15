import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Typography, Avatar, Chip, Skeleton, Table, TableHead, TableBody, TableRow, TableCell,
  Button, alpha,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, LocalShipping, People, CheckCircle,
  Inventory,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getApiOrigin } from '@/api/client';
import { loadApi } from '@/api/all.api';
import { driverApi } from '@/api/driver.api';
import { truckApi } from '@/api/truck.api';
import type { Load } from '@/types/all.types';
import 'leaflet/dist/leaflet.css';

// ─── Types ─────────────────────────────────────────
interface DriverInfo {
  _id: string;
  name: string;
  status: string;
  phone?: string;
  currentLoadId?: string;
  loadNumber?: string;
  truckNumber?: string;
  profilePicture?: string;
  lastLocation?: { lat: number; lng: number };
}

// ─── Constants ─────────────────────────────────────
const ACCENT = '#2563eb';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  in_transit:       { label: 'In Transit',   color: '#2563eb', bg: '#eff6ff' },
  trip_started:     { label: 'In Transit',   color: '#2563eb', bg: '#eff6ff' },
  shipper_check_in: { label: 'At Pickup',    color: '#f59e0b', bg: '#fffbeb' },
  shipper_load_in:  { label: 'At Pickup',    color: '#f59e0b', bg: '#fffbeb' },
  shipper_load_out: { label: 'At Pickup',    color: '#f59e0b', bg: '#fffbeb' },
  receiver_check_in:{ label: 'At Delivery',  color: '#8b5cf6', bg: '#f5f3ff' },
  receiver_offload: { label: 'At Delivery',  color: '#8b5cf6', bg: '#f5f3ff' },
  trip_accepted:    { label: 'Pending',      color: '#64748b', bg: '#f8fafc' },
  assigned:         { label: 'Assigned',     color: '#06b6d4', bg: '#ecfeff' },
  booked:           { label: 'Booked',       color: '#94a3b8', bg: '#f1f5f9' },
  delivered:        { label: 'Delivered',     color: '#22c55e', bg: '#f0fdf4' },
  completed:        { label: 'Completed',    color: '#16a34a', bg: '#f0fdf4' },
};

const DRIVER_STATUS_PRIORITY: Record<string, number> = {
  on_trip: 0, in_transit: 1, at_pickup: 2, active: 3, on_duty: 4, waiting_for_approval: 5, off_duty: 6, inactive: 7,
};

const FLEET_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

// ─── Dashboard Page ────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  // ─── State ──────
  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverLimit, setDriverLimit] = useState(5);
  const [loadLimit, setLoadLimit] = useState(5);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  // ─── Fetch data ──────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [loadsRes, driversRes, trucksRes] = await Promise.all([
        loadApi.getAllLoads({ limit: 200 }), // Fetch enough for dashboard overview
        driverApi.getDrivers(),
        truckApi.getTrucks().catch(() => []),
      ]);
      setLoads(Array.isArray(loadsRes) ? loadsRes : []);
      setDrivers(Array.isArray(driversRes) ? driversRes as any : []);
      setTrucks(Array.isArray(trucksRes) ? trucksRes : []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh every 60s
  useEffect(() => {
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ─── Computed: today's loads ──────
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayLoads = useMemo(() =>
    loads.filter(l => {
      // Active loads OR loads created/updated today
      const activeStatuses = ['assigned', 'trip_accepted', 'trip_started', 'shipper_check_in',
        'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload', 'delivered'];
      if (activeStatuses.includes(l.status)) return true;
      const created = new Date(l.createdAt || '');
      return created >= todayStart;
    }),
  [loads, todayStart]);

  // ─── KPI numbers ──────
  const activeLoads = useMemo(() =>
    loads.filter(l => ['trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out',
      'in_transit', 'receiver_check_in', 'receiver_offload'].includes(l.status)).length,
  [loads]);

  const availableLoads = useMemo(() =>
    loads.filter(l => ['booked', 'rate_confirmed'].includes(l.status)).length,
  [loads]);

  const assignedDrivers = useMemo(() =>
    drivers.filter(d => ['on_trip', 'on_duty'].includes(d.status)).length,
  [drivers]);

  const deliveredToday = useMemo(() =>
    loads.filter(l => l.status === 'delivered' || l.status === 'completed').length,
  [loads]);

  // ─── Load status counts ──────
  const statusCounts = useMemo(() => {
    const c = { inTransit: 0, pending: 0, atPickup: 0, delivered: 0, toDeliver: 0 };
    loads.forEach(l => {
      if (['in_transit', 'trip_started'].includes(l.status)) c.inTransit++;
      else if (['booked', 'assigned', 'trip_accepted', 'rate_confirmed'].includes(l.status)) c.pending++;
      else if (['shipper_check_in', 'shipper_load_in', 'shipper_load_out'].includes(l.status)) c.atPickup++;
      else if (['delivered', 'completed'].includes(l.status)) c.delivered++;
      if (['receiver_check_in', 'receiver_offload'].includes(l.status)) c.toDeliver++;
    });
    return c;
  }, [loads]);

  // ─── Build driver-to-load map for locations & enrichment ──────
  const driverLoadMap = useMemo(() => {
    const map = new Map<string, Load>();
    const activeStatuses = ['assigned', 'trip_accepted', 'trip_started', 'shipper_check_in',
      'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'];
    loads.forEach(l => {
      // driverId could be an ObjectId string or an object with _id
      const rawDid = (l as any).driverId;
      const did = typeof rawDid === 'object' && rawDid?._id ? rawDid._id.toString() : rawDid?.toString?.() || rawDid;
      if (did && activeStatuses.includes(l.status)) {
        map.set(did, l);
      }
    });
    return map;
  }, [loads]);

  // ─── Drivers with active trips today (for Driver Activity panel) ──────
  const todayActiveDrivers = useMemo(() => {
    return drivers
      .filter(d => {
        const did = (d as any).id || (d as any)._id;
        // Check if driver has an active load (by driverId on load OR by currentLoadId on driver)
        const hasActiveLoad = driverLoadMap.has(did);
        const hasCurrentLoad = !!(d as any).currentLoadId;
        return hasActiveLoad || hasCurrentLoad || d.status === 'on_trip';
      })
      .sort((a, b) => (DRIVER_STATUS_PRIORITY[a.status] ?? 99) - (DRIVER_STATUS_PRIORITY[b.status] ?? 99));
  }, [drivers, driverLoadMap]);

  // ─── Driver locations from active loads (for map) ──────
  const driverLocations = useMemo(() => {
    const locs: Array<{ driver: DriverInfo; load: Load; lat: number; lng: number }> = [];
    drivers.forEach(d => {
      const did = (d as any).id || (d as any)._id;
      const load = driverLoadMap.get(did);
      if (!load) return;

      // Try currentLocation first
      const cl = (load as any).currentLocation;
      let lat = 0, lng = 0;
      if (cl) {
        lat = cl.lat || cl.latitude || 0;
        lng = cl.lng || cl.longitude || 0;
      }

      // Fall back to last entry in locationHistory
      if (!lat && !lng) {
        const hist = (load as any).locationHistory;
        if (Array.isArray(hist) && hist.length > 0) {
          const last = hist[hist.length - 1];
          lat = last.lat || last.latitude || 0;
          lng = last.lng || last.longitude || 0;
        }
      }

      // Fall back to statusHistory — GPS coords are logged with each status update
      if (!lat && !lng) {
        const sh = (load as any).statusHistory;
        if (Array.isArray(sh) && sh.length > 0) {
          // Find the most recent status entry with GPS data
          for (let i = sh.length - 1; i >= 0; i--) {
            if (sh[i].lat && sh[i].lng) {
              lat = sh[i].lat;
              lng = sh[i].lng;
              break;
            }
          }
        }
      }

      // Fall back to pickup location coordinates if available
      if (!lat && !lng) {
        const pickup = (load as any).pickupLocation;
        if (pickup?.coordinates?.length === 2) {
          lng = pickup.coordinates[0];
          lat = pickup.coordinates[1];
        } else if (pickup?.lat && pickup?.lng) {
          lat = pickup.lat;
          lng = pickup.lng;
        }
      }

      if (lat && lng) {
        locs.push({ driver: d, load, lat, lng });
      }
    });
    return locs;
  }, [drivers, driverLoadMap]);

  // ─── Fleet status for donut ──────
  const fleetData = useMemo(() => {
    const counts: Record<string, number> = {};
    trucks.forEach(t => {
      const s = t.status || 'available';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [trucks]);

  // ─── Active loads for table (no hard limit — lazy loaded in UI) ──────
  const tableLoads = useMemo(() =>
    todayLoads.filter(l => !['completed', 'cancelled'].includes(l.status)),
  [todayLoads]);

  // ─── Map (Leaflet) ──────
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    import('leaflet').then(L => {
      // Fix default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, { zoomControl: false, attributionControl: false }).setView([39.8, -98.5], 4);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      leafletMapRef.current = map;
    });
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map markers from active load locations
  const markersRef = useRef<any[]>([]);
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    import('leaflet').then(L => {
      // Clear old markers
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];

      const bounds: [number, number][] = [];
      driverLocations.forEach(({ driver, load, lat, lng }) => {
        const sc = STATUS_CONFIG[load.status] || { label: load.status, color: '#64748b' };
        const profilePic = (driver as any).documents?.photo;
        const picUrl = profilePic ? (profilePic.startsWith('http') ? profilePic : `${getApiOrigin()}${profilePic}`) : '';
        const initial = driver.name?.charAt(0)?.toUpperCase() || '?';

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:38px;height:38px;border-radius:50%;
            border:3px solid ${sc.color};
            box-shadow:0 2px 10px rgba(0,0,0,0.25);
            background:${picUrl ? `url(${picUrl}) center/cover` : sc.color};
            display:flex;align-items:center;justify-content:center;
            font-size:14px;color:#fff;font-weight:700;
            position:relative;
          ">${picUrl ? '' : initial}
            <div style="position:absolute;bottom:-3px;right:-3px;width:12px;height:12px;
              border-radius:50%;background:${sc.color};border:2px solid #fff;"></div>
          </div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const pickup = (load as any).pickupLocation;
        const delivery = (load as any).deliveryLocation;
        const fmtP = pickup?.city || pickup?.address || '—';
        const fmtD = delivery?.city || delivery?.address || '—';

        const popup = `
          <div style="min-width:180px;font-family:system-ui,sans-serif;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              ${picUrl
                ? `<img src="${picUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />`
                : `<div style="width:32px;height:32px;border-radius:50%;background:${sc.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${initial}</div>`
              }
              <div>
                <div style="font-weight:700;font-size:13px;">${driver.name}</div>
                <div style="font-size:11px;color:#64748b;">${driver.phone || ''}</div>
              </div>
            </div>
            <div style="background:${sc.bg || '#f1f5f9'};color:${sc.color};padding:3px 8px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:6px;">
              ${sc.label}
            </div>
            <div style="font-size:12px;color:#475569;">
              <div><b>Load:</b> ${load.loadNumber || '—'}</div>
              <div><b>From:</b> ${fmtP}</div>
              <div><b>To:</b> ${fmtD}</div>
              ${driver.truckNumber ? `<div><b>Truck:</b> ${driver.truckNumber}</div>` : ''}
            </div>
          </div>`;

        const marker = L.marker([lat, lng], { icon })
          .bindPopup(popup, { maxWidth: 250 })
          .addTo(map);
        markersRef.current.push(marker);
        bounds.push([lat, lng]);
      });
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      }
    });
  }, [driverLocations]);

  const getDriverStatusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      on_trip: { label: 'In Transit', color: '#2563eb' },
      in_transit: { label: 'In Transit', color: '#2563eb' },
      active: { label: 'Available', color: '#22c55e' },
      on_duty: { label: 'On Duty', color: '#22c55e' },
      off_duty: { label: 'Off Duty', color: '#94a3b8' },
      waiting_for_approval: { label: 'Pending', color: '#f59e0b' },
      inactive: { label: 'Inactive', color: '#ef4444' },
    };
    return map[s] || { label: s.replace(/_/g, ' '), color: '#64748b' };
  };

  const fmtLoc = (loc: any) => {
    if (!loc) return '—';
    if (loc.city) return `${loc.city}, ${loc.state || ''}`.replace(/,\s*$/, '');
    if (loc.address) return loc.address.length > 30 ? loc.address.substring(0, 30) + '...' : loc.address;
    return '—';
  };

  // ─── Render ──────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ─── Row 1: Summary KPI Cards ─── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
          <KPIBox label="Active Loads" value={activeLoads} icon={<LocalShipping />} color="#2563eb" trend={null} loading={loading} />
          <KPIBox label="Available Loads" value={availableLoads} icon={<Inventory />} color="#f59e0b" trend={null} loading={loading} />
          <KPIBox label="Assigned Drivers" value={assignedDrivers} icon={<People />} color="#8b5cf6" trend={null} loading={loading} />
          <KPIBox label="Deliveries Today" value={deliveredToday} icon={<CheckCircle />} color="#22c55e" trend={null} loading={loading} />
        </Box>

        {/* ─── Row 2: Map + Load Status + Driver Activity ─── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.3fr 0.8fr 0.9fr' }, gap: 2, mb: 3 }}>

          {/* Map */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0', minHeight: 320 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography fontWeight={700} fontSize={14} color="#0f172a">Driver Locations</Typography>
              <Chip size="small" label={`${driverLocations.length} tracking`}
                sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: alpha('#22c55e', 0.1), color: '#22c55e' }} />
            </Box>
            <Box ref={mapRef} sx={{ height: 280 }} />
          </Box>

          {/* Load Status Overview */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography fontWeight={700} fontSize={14} color="#0f172a">Load Status Overview</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <StatusCard label="In Transit" count={statusCounts.inTransit} color="#2563eb" bg="#eff6ff" />
              <StatusCard label="Pending" count={statusCounts.pending} color="#f59e0b" bg="#fffbeb" />
              <StatusCard label="At Pickup" count={statusCounts.atPickup} color="#ef4444" bg="#fef2f2" />
              <StatusCard label="Delivered" count={statusCounts.delivered} color="#22c55e" bg="#f0fdf4" />
            </Box>
            <StatusCard label="To Be Delivered" count={statusCounts.toDeliver} color="#8b5cf6" bg="#f5f3ff" />
          </Box>

          {/* Driver Activity */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
              <Typography fontWeight={700} fontSize={14} color="#0f172a">Driver Activity</Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, py: 1 }}>
              {loading ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} height={52} sx={{ borderRadius: 2, mb: 0.5 }} />)
              ) : todayActiveDrivers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography fontSize={13} color="text.secondary">No active drivers today</Typography>
                </Box>
              ) : (
                todayActiveDrivers.slice(0, driverLimit).map(d => {
                  const did = (d as any).id || (d as any)._id;
                  const st = getDriverStatusLabel(d.status);
                  const activeLoad = driverLoadMap.get(did);
                  const loadStatus = activeLoad ? (STATUS_CONFIG[activeLoad.status]?.label || activeLoad.status) : null;
                  const loadColor = activeLoad ? (STATUS_CONFIG[activeLoad.status]?.color || '#64748b') : null;
                  // Get profile picture from driver documents
                  const profilePic = (d as any).documents?.photo || d.profilePicture;
                  const picUrl = profilePic ? (profilePic.startsWith('http') ? profilePic : `${getApiOrigin()}${profilePic}`) : undefined;

                  return (
                    <Box key={did} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: 1, borderRadius: 2, mb: 0.5,
                      '&:hover': { bgcolor: '#f8fafc' }, transition: 'all 0.15s',
                    }}>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar
                          src={picUrl}
                          sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 700,
                            bgcolor: alpha(loadColor || st.color, 0.15), color: loadColor || st.color }}
                        >
                          {d.name?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Box sx={{
                          position: 'absolute', bottom: -1, right: -1,
                          width: 10, height: 10, borderRadius: '50%',
                          bgcolor: loadColor || st.color, border: '2px solid #fff',
                        }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontSize={13} fontWeight={600} noWrap>{d.name}</Typography>
                        <Typography fontSize={11} color="text.secondary" noWrap>
                          {activeLoad ? `#${activeLoad.loadNumber}` : d.phone || '—'}
                          {d.truckNumber ? ` | ${d.truckNumber}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        label={loadStatus || st.label}
                        size="small"
                        sx={{
                          height: 22, fontSize: 10, fontWeight: 700,
                          bgcolor: alpha(loadColor || st.color, 0.1), color: loadColor || st.color,
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                    </Box>
                  );
                })
              )}
              {todayActiveDrivers.length > driverLimit && (
                <Button
                  fullWidth size="small"
                  onClick={() => setDriverLimit(p => p + 5)}
                  sx={{ mt: 0.5, textTransform: 'none', fontWeight: 600, fontSize: 12, color: ACCENT }}
                >
                  Load more ({todayActiveDrivers.length - driverLimit} remaining)
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        {/* ─── Row 3: Active Loads Table + Fleet Status ─── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2 }}>

          {/* Active Loads Table */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography fontWeight={700} fontSize={14} color="#0f172a">Active Loads</Typography>
              <Chip size="small" label={`${Math.min(loadLimit, tableLoads.length)} of ${tableLoads.length} loads`}
                sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: '#f1f5f9' }} />
            </Box>
            <Box sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: '#64748b', borderBottom: '1px solid #f1f5f9', py: 1.2, whiteSpace: 'nowrap' } }}>
                    <TableCell>Load ID</TableCell>
                    <TableCell>Origin</TableCell>
                    <TableCell>Destination</TableCell>
                    <TableCell>Driver</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Pickup</TableCell>
                    <TableCell>Delivery</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(7).fill(0).map((_, j) => <TableCell key={j}><Skeleton width={80} /></TableCell>)}
                      </TableRow>
                    ))
                  ) : tableLoads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                        No active loads today
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableLoads.slice(0, loadLimit).map(l => {
                      const sc = STATUS_CONFIG[l.status] || { label: l.status, color: '#64748b', bg: '#f1f5f9' };
                      // Resolve driver name: could be populated object, string ID, or name field
                      const rawDid = (l as any).driverId;
                      let driverName = '—';
                      if (typeof rawDid === 'object' && rawDid?.name) {
                        driverName = rawDid.name;
                      } else if ((l as any).driverName) {
                        driverName = (l as any).driverName;
                      } else if (rawDid) {
                        const match = drivers.find(d => ((d as any).id || (d as any)._id) === rawDid.toString());
                        if (match) driverName = match.name;
                      }
                      return (
                        <TableRow key={l.id || (l as any)._id} sx={{
                          '&:hover': { bgcolor: '#fafbfc' },
                          '& td': { fontSize: 13, py: 1.2, borderBottom: '1px solid #f8fafc' },
                        }}>
                          <TableCell>
                            <Typography fontSize={13} fontWeight={700} color={ACCENT} sx={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/loads`)}>
                              {l.loadNumber || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{fmtLoc((l as any).pickupLocation)}</TableCell>
                          <TableCell>{fmtLoc((l as any).deliveryLocation)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: alpha(ACCENT, 0.1), color: ACCENT }}>
                                {typeof driverName === 'string' ? driverName.charAt(0) : '?'}
                              </Avatar>
                              <Typography fontSize={13} noWrap>{typeof driverName === 'string' ? driverName : '—'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={sc.label} size="small" sx={{
                              height: 22, fontSize: 10, fontWeight: 700,
                              bgcolor: sc.bg, color: sc.color,
                              '& .MuiChip-label': { px: 1 },
                            }} />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {l.pickupDate ? new Date(l.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {l.expectedDeliveryDate ? new Date(l.expectedDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
            {tableLoads.length > loadLimit && (
              <Box sx={{ px: 2, py: 1, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <Button
                  fullWidth size="small"
                  onClick={() => setLoadLimit(p => p + 5)}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12, color: ACCENT }}
                >
                  Load more ({tableLoads.length - loadLimit} remaining)
                </Button>
              </Box>
            )}
          </Box>

          {/* Fleet Status Donut */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography fontWeight={700} fontSize={14} color="#0f172a" sx={{ mb: 2 }}>Fleet Status</Typography>
            {fleetData.length > 0 ? (
              <>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fleetData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                        dataKey="value" paddingAngle={3} strokeWidth={0}>
                        {fleetData.map((_, i) => <Cell key={i} fill={FLEET_COLORS[i % FLEET_COLORS.length]} />)}
                      </Pie>
                      <ReTooltip
                        contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                        formatter={(value: any, name: any) => [`${value}`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mt: 1 }}>
                  {fleetData.map((d, i) => (
                    <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: FLEET_COLORS[i % FLEET_COLORS.length] }} />
                      <Typography fontSize={11} color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {d.name} ({d.value})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontSize={13} color="text.secondary">No vehicle data</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
  );
}

// ─── Sub-components ────────────────────────────────

function KPIBox({ label, value, icon, color, trend, loading }: {
  label: string; value: number; icon: React.ReactNode; color: string; trend: number | null; loading: boolean;
}) {
  return (
    <Box sx={{
      bgcolor: '#fff', borderRadius: 3, p: 2, border: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column', gap: 1,
      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }, transition: 'all 0.2s',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontSize={12} fontWeight={600} color="#64748b">{label}</Typography>
        <Box sx={{
          width: 32, height: 32, borderRadius: 2,
          bgcolor: alpha(color, 0.08), color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
      </Box>
      {loading ? (
        <Skeleton width={60} height={36} />
      ) : (
        <Typography fontSize={28} fontWeight={800} color="#0f172a" lineHeight={1}>
          {value}
        </Typography>
      )}
      {trend !== null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
          {trend >= 0 ? <TrendingUp sx={{ fontSize: 14, color: '#22c55e' }} /> : <TrendingDown sx={{ fontSize: 14, color: '#ef4444' }} />}
          <Typography fontSize={11} color={trend >= 0 ? '#22c55e' : '#ef4444'} fontWeight={600}>
            {Math.abs(trend)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function StatusCard({ label, count, color, bg }: {
  label: string; count: number; color: string; bg: string;
}) {
  return (
    <Box sx={{
      bgcolor: bg, borderRadius: 2, p: 1.5, border: `1px solid ${alpha(color, 0.15)}`,
      display: 'flex', flexDirection: 'column', gap: 0.3,
    }}>
      <Typography fontSize={11} fontWeight={600} color={alpha(color, 0.8)}>{label}</Typography>
      <Typography fontSize={24} fontWeight={800} color={color} lineHeight={1}>{count}</Typography>
    </Box>
  );
}
