import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLoadTracking, type LocationUpdatePayload } from '@/hooks/usePusher';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPoint { lat: number; lng: number; timestamp?: string; speed?: number; accuracy?: number; }
interface MapLocation { lat?: number; lng?: number; city?: string; state?: string; address?: string; }

interface TripTrackingMapProps {
  currentLocation: LocationPoint | null;
  locationHistory: LocationPoint[];
  pickupLocation?: MapLocation | null;
  deliveryLocation?: MapLocation | null;
  driverName?: string;
  loadNumber?: string;
  loadId?: string;
  status?: string;
  height?: number | string;
  showRoute?: boolean;
  autoRefresh?: boolean;
  onRefresh?: () => void;
  onRealtimeLocation?: (data: LocationUpdatePayload) => void;
}

// ─── Utils ──────────────────────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcDistance(pts: LocationPoint[]): number {
  let t = 0;
  for (let i = 1; i < pts.length; i++) t += haversineDistance(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  return t;
}

function fmtDur(ms: number): string {
  if (ms < 0) return '—';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h === 0 ? `${m} min` : `${h}h ${m}m`;
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function detectStops(pts: LocationPoint[], minMs = 180000, rKm = 0.1) {
  if (pts.length < 3) return [];
  const ts = pts.filter(p => p.timestamp);
  if (ts.length < 3) return [];
  const stops: { lat: number; lng: number; startTime: string; endTime: string; duration: number }[] = [];
  let cs = 0;
  for (let i = 1; i < ts.length; i++) {
    if (haversineDistance(ts[cs].lat, ts[cs].lng, ts[i].lat, ts[i].lng) > rKm) {
      const s = new Date(ts[cs].timestamp!).getTime(), e = new Date(ts[i - 1].timestamp!).getTime();
      if (e - s >= minMs) {
        let sLat = 0, sLng = 0, c = 0;
        for (let j = cs; j < i; j++) { sLat += ts[j].lat; sLng += ts[j].lng; c++; }
        stops.push({ lat: sLat / c, lng: sLng / c, startTime: ts[cs].timestamp!, endTime: ts[i - 1].timestamp!, duration: e - s });
      }
      cs = i;
    }
  }
  const s = new Date(ts[cs].timestamp!).getTime(), e = new Date(ts[ts.length - 1].timestamp!).getTime();
  if (e - s >= minMs && cs < ts.length - 1) {
    let sLat = 0, sLng = 0, c = 0;
    for (let j = cs; j < ts.length; j++) { sLat += ts[j].lat; sLng += ts[j].lng; c++; }
    stops.push({ lat: sLat / c, lng: sLng / c, startTime: ts[cs].timestamp!, endTime: ts[ts.length - 1].timestamp!, duration: e - s });
  }
  return stops;
}

// ─── Uber-style Markers ─────────────────────────────────────

const TRUCK_ICON = L.divIcon({
  html: `<div class="uber-truck-marker">
    <div class="uber-truck-inner">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="1" y="6" width="15" height="10" rx="2" fill="#fff"/>
        <path d="M16 9h3l3 4v3h-6V9z" fill="#fff"/>
        <circle cx="6" cy="18" r="2" fill="#111"/>
        <circle cx="19" cy="18" r="2" fill="#111"/>
      </svg>
    </div>
    <div class="uber-truck-pulse"></div>
  </div>`,
  iconSize: [56, 56],
  iconAnchor: [28, 28],
  className: '',
});

function makeLocIcon(color: string, label: string, isPickup: boolean) {
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:32px;height:32px;border-radius:50%;background:${color};display:grid;place-items:center;
        box-shadow:0 4px 12px ${color}55;border:3px solid #fff;">
        <span style="font-size:14px;line-height:1;">${label}</span>
      </div>
      <div style="width:3px;height:${isPickup ? 12 : 10}px;background:${color};border-radius:0 0 2px 2px;margin-top:-1px;"></div>
      <div style="width:8px;height:4px;border-radius:50%;background:${color}40;margin-top:1px;"></div>
    </div>`,
    iconSize: [32, 52],
    iconAnchor: [16, 52],
    className: '',
  });
}

const PICKUP_ICON = makeLocIcon('#000', '📦', true);
const DELIVERY_ICON = makeLocIcon('#22c55e', '📍', false);

function createStopIcon(dur: string) {
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="width:18px;height:18px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:grid;place-items:center;font-size:8px;">⏸</div>
      <div style="background:#111;color:#fff;font-size:8px;padding:1px 5px;border-radius:4px;margin-top:2px;white-space:nowrap;font-weight:600;">${dur}</div>
    </div>`,
    iconSize: [60, 40],
    iconAnchor: [30, 10],
    className: '',
  });
}

// ─── Status/Phase Config ────────────────────────────────────

const PRE_TRIP = ['assigned', 'trip_accepted'];
const ACTIVE_TRIP = ['trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'];
const POST_TRIP = ['delivered', 'completed'];

const STATUS_SHORT: Record<string, string> = {
  assigned: 'Assigned', trip_accepted: 'Ready', trip_started: 'En Route to Pickup',
  shipper_check_in: 'At Shipper', shipper_load_in: 'Loading', shipper_load_out: 'Loaded',
  in_transit: 'In Transit', receiver_check_in: 'At Receiver', receiver_offload: 'Offloading',
  delivered: 'Delivered', completed: 'Completed',
};

// ─── Map Tile Layers ────────────────────────────────────────
const TILES = {
  clean: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
};

// ─── Component ──────────────────────────────────────────────

export default function TripTrackingMap({
  currentLocation, locationHistory, pickupLocation, deliveryLocation,
  driverName = 'Driver', loadNumber = '', loadId = '', status = '',
  height = 350, showRoute = true, autoRefresh = false, onRefresh, onRealtimeLocation,
}: TripTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFittedRef = useRef(false);
  const prevLenRef = useRef(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [plannedRoute, setPlannedRoute] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const plannedFetchedRef = useRef(false);
  const [showStats, setShowStats] = useState(false);
  const [isCentered, setIsCentered] = useState(true);

  // Pusher
  const isActive = ACTIVE_TRIP.includes(status);
  const { connected: pusherConnected, updateCount: realtimeUpdates } = useLoadTracking({
    loadId: loadId || null,
    onLocationUpdate: useCallback((d: LocationUpdatePayload) => { if (onRealtimeLocation) onRealtimeLocation(d); }, [onRealtimeLocation]),
    enabled: !!loadId && isActive,
  });

  const fmtLoc = (l: MapLocation | null | undefined) => l ? [l.city, l.state].filter(Boolean).join(', ') || l.address || '—' : '—';
  const phase: 'pre' | 'active' | 'post' = PRE_TRIP.includes(status) ? 'pre' : POST_TRIP.includes(status) ? 'post' : 'active';

  // ─── Auto-geocode pickup/delivery when lat/lng is missing ───
  const [geocodedPickup, setGeocodedPickup] = useState<{lat: number; lng: number} | null>(null);
  const [geocodedDelivery, setGeocodedDelivery] = useState<{lat: number; lng: number} | null>(null);
  const [geocodeError, setGeocodeError] = useState(false);
  const geocodeAttemptRef = useRef(0);

  const runGeocode = useCallback(() => {
    const needsPickup = pickupLocation && !pickupLocation.lat && (pickupLocation.city || pickupLocation.address);
    const needsDelivery = deliveryLocation && !deliveryLocation.lat && (deliveryLocation.city || deliveryLocation.address);
    if (!needsPickup && !needsDelivery) return;

    geocodeAttemptRef.current += 1;
    const attempt = geocodeAttemptRef.current;
    setGeocodeError(false);

    const geocode = async (loc: MapLocation, label: string): Promise<{lat: number; lng: number} | null> => {
      // Try different query formats for better geocoding results
      const queries = [
        [loc.city, loc.state, 'India'].filter(Boolean).join(', '),
        [loc.address, loc.city, loc.state].filter(Boolean).join(', '),
        loc.city || '',
      ].filter(q => q.length > 0);

      for (const q of queries) {
        try {
          console.log(`[Geocode] ${label} attempt ${attempt}: "${q}"`);
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in`, {
            headers: { 'Accept-Language': 'en' },
          });
          if (!r.ok) { console.warn(`[Geocode] ${label}: HTTP ${r.status}`); continue; }
          const data = await r.json();
          if (data?.[0]?.lat && data?.[0]?.lon) {
            const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            console.log(`[Geocode] ${label} resolved:`, result);
            return result;
          }
          console.warn(`[Geocode] ${label}: no results for "${q}"`);
        } catch (err) {
          console.error(`[Geocode] ${label} failed:`, err);
        }
        // Nominatim requires 1s between requests
        await new Promise(r => setTimeout(r, 1100));
      }
      return null;
    };

    (async () => {
      let gotPickup = false, gotDelivery = false;
      if (needsPickup && pickupLocation) {
        const coords = await geocode(pickupLocation, 'Pickup');
        if (coords) { setGeocodedPickup(coords); gotPickup = true; }
        // Wait before next geocoding request
        await new Promise(r => setTimeout(r, 1100));
      }
      if (needsDelivery && deliveryLocation) {
        const coords = await geocode(deliveryLocation, 'Delivery');
        if (coords) { setGeocodedDelivery(coords); gotDelivery = true; }
      }
      // If either failed, mark error for retry button
      if ((needsPickup && !gotPickup) || (needsDelivery && !gotDelivery)) {
        setGeocodeError(true);
      }
    })();
  }, [pickupLocation, deliveryLocation]);

  // Auto-geocode on mount
  useEffect(() => {
    if (geocodeAttemptRef.current === 0) runGeocode();
  }, [runGeocode]);

  // Effective pickup/delivery with geocoded fallback
  const effectivePickup = useMemo(() => {
    if (pickupLocation?.lat) return pickupLocation;
    if (geocodedPickup && pickupLocation) return { ...pickupLocation, ...geocodedPickup };
    return pickupLocation;
  }, [pickupLocation, geocodedPickup]);

  const effectiveDelivery = useMemo(() => {
    if (deliveryLocation?.lat) return deliveryLocation;
    if (geocodedDelivery && deliveryLocation) return { ...deliveryLocation, ...geocodedDelivery };
    return deliveryLocation;
  }, [deliveryLocation, geocodedDelivery]);

  // Fetch planned route from OSRM
  const [routeError, setRouteError] = useState(false);

  const fetchRoute = useCallback(() => {
    if (!effectivePickup?.lat || !effectivePickup?.lng || !effectiveDelivery?.lat || !effectiveDelivery?.lng) return;
    setRouteLoading(true);
    setRouteError(false);
    (async () => {
      try {
        console.log('[Route] Fetching OSRM route:', effectivePickup, '→', effectiveDelivery);
        const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${effectivePickup.lng},${effectivePickup.lat};${effectiveDelivery.lng},${effectiveDelivery.lat}?overview=full&geometries=geojson`);
        if (!r.ok) { console.error(`[Route] OSRM HTTP ${r.status}`); setRouteError(true); return; }
        const d = await r.json();
        if (d.code === 'Ok' && d.routes?.[0]) {
          setPlannedRoute(d.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]));
          setRouteDistance(`${(d.routes[0].distance / 1000).toFixed(1)} km`);
          const h = Math.floor(d.routes[0].duration / 3600), m = Math.floor((d.routes[0].duration % 3600) / 60);
          setRouteDuration(h > 0 ? `${h}h ${m}m` : `${m} min`);
          console.log('[Route] Route loaded:', d.routes[0].distance, 'm');
        } else {
          console.warn('[Route] OSRM no route:', d.code);
          // Fallback: draw a straight line between pickup and delivery
          setPlannedRoute([[effectivePickup.lat, effectivePickup.lng], [effectiveDelivery.lat, effectiveDelivery.lng]]);
          setRouteDistance(null);
          setRouteDuration(null);
        }
      } catch (err) {
        console.error('[Route] OSRM fetch failed:', err);
        setRouteError(true);
        // Fallback: straight line
        if (effectivePickup?.lat && effectiveDelivery?.lat) {
          setPlannedRoute([[effectivePickup.lat, effectivePickup.lng], [effectiveDelivery.lat, effectiveDelivery.lng]]);
        }
      } finally { setRouteLoading(false); }
    })();
  }, [effectivePickup?.lat, effectivePickup?.lng, effectiveDelivery?.lat, effectiveDelivery?.lng]);

  // Auto-fetch route when coordinates become available
  useEffect(() => {
    if (!plannedFetchedRef.current && effectivePickup?.lat && effectiveDelivery?.lat) {
      plannedFetchedRef.current = true;
      fetchRoute();
    }
  }, [fetchRoute, effectivePickup?.lat, effectiveDelivery?.lat]);

  const tripStats = useMemo(() => {
    if (locationHistory.length < 2) return null;
    const dist = calcDistance(locationHistory);
    const ts = locationHistory.filter(p => p.timestamp).map(p => new Date(p.timestamp!).getTime());
    if (ts.length < 2) return { dist, time: 0, avg: 0, max: 0 };
    const time = Math.max(...ts) - Math.min(...ts);
    const avg = time > 0 ? dist / (time / 3600000) : 0;
    let max = 0; locationHistory.forEach(p => { if (p.speed && p.speed * 3.6 > max) max = p.speed * 3.6; });
    return { dist, time, avg, max };
  }, [locationHistory]);

  const stops = useMemo(() => (phase !== 'post' && phase !== 'active') ? [] : detectStops(locationHistory), [locationHistory, phase]);

  const allPoints = useMemo(() => {
    const pts: [number, number][] = [];
    if (currentLocation) pts.push([currentLocation.lat, currentLocation.lng]);
    locationHistory.forEach(p => pts.push([p.lat, p.lng]));
    if (effectivePickup?.lat && effectivePickup?.lng) pts.push([effectivePickup.lat, effectivePickup.lng]);
    if (effectiveDelivery?.lat && effectiveDelivery?.lng) pts.push([effectiveDelivery.lat, effectiveDelivery.lng]);
    if (plannedRoute) plannedRoute.forEach(p => pts.push(p));
    return pts;
  }, [currentLocation, locationHistory, effectivePickup, effectiveDelivery, plannedRoute]);

  // ─── Init Map ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 80.0],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
    });

    // Clean Carto Voyager tiles (like Uber)
    L.tileLayer(TILES.voyager, { maxZoom: 19, attribution: '&copy; CARTO' }).addTo(map);

    // Zoom control bottom-right (Uber style)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    // Track user interaction
    map.on('dragstart', () => setIsCentered(false));

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markersRef.current = null; routeLayerRef.current = null; hasFittedRef.current = false; } };
  }, []);

  // ─── Draw on map ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current, markers = markersRef.current, rl = routeLayerRef.current;
    if (!map || !markers || !rl) return;
    markers.clearLayers();
    rl.clearLayers();

    // Planned route (Uber-style: dark with glow)
    if (plannedRoute && plannedRoute.length > 1) {
      L.polyline(plannedRoute, { color: '#000', weight: 8, opacity: 0.06, lineJoin: 'round', lineCap: 'round' }).addTo(rl as any);
      L.polyline(plannedRoute, { color: phase === 'pre' ? '#111' : '#94a3b8', weight: 4, opacity: phase === 'pre' ? 0.7 : 0.4, dashArray: phase === 'pre' ? undefined : '10, 8', lineJoin: 'round', lineCap: 'round' }).addTo(rl as any);
    }

    // Actual route (vibrant blue with glow)
    if (showRoute && locationHistory.length >= 1) {
      const coords = locationHistory.map(p => [p.lat, p.lng] as [number, number]);
      if (currentLocation) coords.push([currentLocation.lat, currentLocation.lng]);
      if (coords.length >= 2) {
        L.polyline(coords, { color: '#4285F4', weight: 12, opacity: 0.1, lineJoin: 'round', lineCap: 'round' }).addTo(rl as any);
        L.polyline(coords, { color: '#4285F4', weight: 5, opacity: 0.9, lineJoin: 'round', lineCap: 'round' }).addTo(rl as any);
      }
    }

    // Stop markers
    stops.forEach(stop => {
      const dm = Math.round(stop.duration / 60000);
      const ds = dm >= 60 ? `${Math.floor(dm / 60)}h${dm % 60}m` : `${dm}m`;
      const m = L.marker([stop.lat, stop.lng], { icon: createStopIcon(ds), zIndexOffset: 400 });
      m.bindPopup(`<div style="font-size:12px"><b>Stopped ${ds}</b><br/>${fmtTime(stop.startTime)} → ${fmtTime(stop.endTime)}</div>`);
      markers.addLayer(m);
    });

    // Pickup
    if (effectivePickup?.lat && effectivePickup?.lng) {
      const m = L.marker([effectivePickup.lat, effectivePickup.lng], { icon: PICKUP_ICON, zIndexOffset: 600 });
      m.bindPopup(`<div style="font-size:13px;font-weight:600">Pickup</div><div style="font-size:11px;color:#666">${fmtLoc(effectivePickup)}</div>`);
      markers.addLayer(m);
    }

    // Delivery
    if (effectiveDelivery?.lat && effectiveDelivery?.lng) {
      const m = L.marker([effectiveDelivery.lat, effectiveDelivery.lng], { icon: DELIVERY_ICON, zIndexOffset: 600 });
      m.bindPopup(`<div style="font-size:13px;font-weight:600">Delivery</div><div style="font-size:11px;color:#666">${fmtLoc(effectiveDelivery)}</div>`);
      markers.addLayer(m);
    }

    // Driver marker (Uber style)
    if (currentLocation) {
      const tm = L.marker([currentLocation.lat, currentLocation.lng], { icon: TRUCK_ICON, zIndexOffset: 1000 });
      tm.bindPopup(`<div style="min-width:140px;font-size:12px">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">${driverName}</div>
        <div style="color:#666">Load #${loadNumber}</div>
        <div style="color:#666">${STATUS_SHORT[status] || status}</div>
        ${currentLocation.speed ? `<div style="color:#4285F4;font-weight:600;margin-top:4px">${(currentLocation.speed * 3.6).toFixed(0)} km/h</div>` : ''}
      </div>`);
      markers.addLayer(tm);
    }

    // Fit bounds
    const grew = locationHistory.length > prevLenRef.current + 3;
    if (allPoints.length > 0 && (!hasFittedRef.current || grew)) {
      map.fitBounds(L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1]))), { padding: [60, 60], maxZoom: 16 });
      hasFittedRef.current = true;
      prevLenRef.current = locationHistory.length;
    } else if (currentLocation && hasFittedRef.current && phase === 'active' && isCentered) {
      map.panTo([currentLocation.lat, currentLocation.lng], { animate: true, duration: 0.8 });
    }

    setLastUpdate(new Date());
  }, [currentLocation, locationHistory, effectivePickup, effectiveDelivery, driverName, loadNumber, status, showRoute, allPoints, plannedRoute, stops, phase, isCentered]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;
    const id = setInterval(onRefresh, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, onRefresh]);

  const noData = !currentLocation && locationHistory.length === 0 && !(effectivePickup?.lat) && !(effectiveDelivery?.lat);

  // Re-center button
  const reCenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (currentLocation) {
      map.flyTo([currentLocation.lat, currentLocation.lng], 15, { duration: 0.6 });
    } else if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1]))), { padding: [60, 60], maxZoom: 16, animate: true });
    }
    setIsCentered(true);
  }, [currentLocation, allPoints]);

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#f8f9fa' }}>
      {/* ━━━ MAP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* ━━━ FLOATING TOP PILL (Uber style) ━━━━━━━━━━━━━━━━━━ */}
      <div className="uber-float-top">
        <div className="uber-pill">
          {phase === 'active' && (
            <div className="uber-live-dot" />
          )}
          <span className="uber-pill-label">
            {STATUS_SHORT[status] || status.replace(/_/g, ' ')}
          </span>
          {pusherConnected && phase === 'active' && (
            <span className="uber-live-badge">LIVE</span>
          )}
          {routeLoading && <span className="uber-loading">Loading...</span>}
        </div>
      </div>

      {/* ━━━ FLOATING ROUTE INFO (top center) ━━━━━━━━━━━━━━━━ */}
      {plannedRoute && routeDistance && (
        <div className="uber-route-info">
          <div className="uber-route-row">
            <span className="uber-dot" style={{ background: '#000' }} />
            <span className="uber-route-text">{fmtLoc(effectivePickup)}</span>
          </div>
          <div className="uber-route-line" />
          <div className="uber-route-row">
            <span className="uber-dot" style={{ background: '#22c55e' }} />
            <span className="uber-route-text">{fmtLoc(effectiveDelivery)}</span>
          </div>
          <div className="uber-route-eta">
            <span style={{ fontWeight: 800, fontSize: 14 }}>{routeDistance}</span>
            <span style={{ color: '#6b7280', margin: '0 4px' }}>·</span>
            <span style={{ fontWeight: 600 }}>{routeDuration}</span>
          </div>
        </div>
      )}

      {/* ━━━ GEOCODE / ROUTE ERROR — Retry button ━━━━━━━━━━━━━ */}
      {(geocodeError || routeError) && !plannedRoute && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 1000, background: 'rgba(0,0,0,0.8)', borderRadius: 12, padding: '16px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Route loading failed</span>
          <button
            onClick={() => {
              geocodeAttemptRef.current = 0;
              plannedFetchedRef.current = false;
              setGeocodeError(false);
              setRouteError(false);
              runGeocode();
            }}
            style={{
              background: '#4285F4', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ━━━ GEOCODING loading overlay ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {geocodeAttemptRef.current > 0 && !geocodedPickup && !geocodedDelivery && !geocodeError && !effectivePickup?.lat && !effectiveDelivery?.lat && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 1000, background: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: '16px 24px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Loading route...</span>
        </div>
      )}

      {/* ━━━ RE-CENTER BUTTON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!isCentered && (
        <button className="uber-recenter" onClick={reCenter} title="Re-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
          </svg>
        </button>
      )}

      {/* ━━━ REFRESH BUTTON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {onRefresh && (
        <button className="uber-refresh" onClick={onRefresh}>
          ↻
        </button>
      )}

      {/* ━━━ SPEED INDICATOR (active phase) ━━━━━━━━━━━━━━━━━━━ */}
      {currentLocation?.speed && phase === 'active' && (
        <div className="uber-speed">
          <div className="uber-speed-val">{(currentLocation.speed * 3.6).toFixed(0)}</div>
          <div className="uber-speed-unit">km/h</div>
        </div>
      )}

      {/* ━━━ BOTTOM STATS CARD (glassmorphism) ━━━━━━━━━━━━━━━━ */}
      {(tripStats || locationHistory.length > 0 || lastUpdate) && (
        <div className="uber-bottom-card" onClick={() => setShowStats(!showStats)}>
          <div className="uber-bottom-handle" />
          <div className="uber-bottom-row">
            {tripStats ? (
              <>
                <div className="uber-stat">
                  <div className="uber-stat-val">{tripStats.dist.toFixed(1)}<span className="uber-stat-unit"> km</span></div>
                  <div className="uber-stat-label">Distance</div>
                </div>
                <div className="uber-stat-divider" />
                <div className="uber-stat">
                  <div className="uber-stat-val">{fmtDur(tripStats.time)}</div>
                  <div className="uber-stat-label">Duration</div>
                </div>
                <div className="uber-stat-divider" />
                <div className="uber-stat">
                  <div className="uber-stat-val">{tripStats.avg.toFixed(0)}<span className="uber-stat-unit"> km/h</span></div>
                  <div className="uber-stat-label">Avg Speed</div>
                </div>
              </>
            ) : (
              <>
                <div className="uber-stat">
                  <div className="uber-stat-val">{locationHistory.length}</div>
                  <div className="uber-stat-label">GPS Points</div>
                </div>
                <div className="uber-stat-divider" />
                <div className="uber-stat">
                  <div className="uber-stat-val">{realtimeUpdates}</div>
                  <div className="uber-stat-label">Live Updates</div>
                </div>
              </>
            )}
          </div>

          {/* Expanded stats */}
          {showStats && tripStats && (
            <div className="uber-stats-expanded">
              {tripStats.max > 0 && (
                <div className="uber-stat-extra">
                  <span>Max Speed</span><span style={{ fontWeight: 700 }}>{tripStats.max.toFixed(0)} km/h</span>
                </div>
              )}
              {stops.length > 0 && (
                <div className="uber-stat-extra">
                  <span>Stops</span><span style={{ fontWeight: 700, color: '#f59e0b' }}>{stops.length}</span>
                </div>
              )}
              {stops.map((s, i) => {
                const dm = Math.round(s.duration / 60000);
                return (
                  <div key={i} className="uber-stat-extra" style={{ fontSize: 11, color: '#9ca3af' }}>
                    <span>Stop {i + 1}</span>
                    <span>{fmtTime(s.startTime)} → {fmtTime(s.endTime)} ({dm}m)</span>
                  </div>
                );
              })}
              <div className="uber-stat-extra" style={{ fontSize: 10, color: '#9ca3af' }}>
                <span>Last update</span>
                <span>{lastUpdate?.toLocaleTimeString() || '—'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━ NO DATA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {noData && !plannedRoute && (
        <div className="uber-no-data">
          {phase === 'post' ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Trip Completed</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                No GPS route data was recorded for this trip.
              </div>
              <div style={{ fontSize: 11, color: '#b0b0b0', marginTop: 6 }}>
                Route data is recorded when the driver uses live tracking during the trip.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📡</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Waiting for GPS</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                {phase === 'pre' ? 'Route appears when locations have coordinates' : 'Tracking starts when driver begins trip'}
              </div>
            </>
          )}
        </div>
      )}

      {/* ━━━ STYLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <style>{`
        /* ── Uber Truck Marker ── */
        .uber-truck-marker {
          position: relative; width: 56px; height: 56px;
          display: grid; place-items: center;
        }
        .uber-truck-inner {
          width: 40px; height: 40px; border-radius: 50%;
          background: #111; display: grid; place-items: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.35);
          border: 3px solid #fff; z-index: 2; position: relative;
        }
        .uber-truck-pulse {
          position: absolute; top: 50%; left: 50%;
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(66,133,244,0.2);
          transform: translate(-50%, -50%);
          animation: uberPulse 2s ease-out infinite;
        }
        @keyframes uberPulse {
          0% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
        }

        /* ── Floating Top Pill ── */
        .uber-float-top {
          position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
          z-index: 500; pointer-events: none;
        }
        .uber-pill {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          padding: 6px 14px; border-radius: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
          pointer-events: auto;
        }
        .uber-live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e; animation: uberDotPulse 1.5s infinite;
        }
        @keyframes uberDotPulse {
          0%,100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }
        }
        .uber-pill-label {
          font-size: 13px; font-weight: 700; color: #111; letter-spacing: -0.2px;
        }
        .uber-live-badge {
          font-size: 9px; font-weight: 800; color: #fff; background: #22c55e;
          padding: 1px 6px; border-radius: 4px; letter-spacing: 0.5px;
        }
        .uber-loading { font-size: 10px; color: #9ca3af; }

        /* ── Route Info Card ── */
        .uber-route-info {
          position: absolute; top: 52px; left: 12px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-radius: 14px; padding: 10px 14px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.1);
          z-index: 500; max-width: 220px;
        }
        .uber-route-row {
          display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #111;
        }
        .uber-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .uber-route-text {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .uber-route-line {
          width: 2px; height: 14px; background: #d1d5db; margin: 2px 0 2px 3px; border-radius: 1px;
        }
        .uber-route-eta {
          margin-top: 8px; padding-top: 8px; border-top: 1px solid #f3f4f6;
          font-size: 12px; color: #111;
        }

        /* ── Re-center ── */
        .uber-recenter {
          position: absolute; bottom: 100px; right: 12px; z-index: 500;
          width: 40px; height: 40px; border-radius: 50%;
          background: #fff; border: none; cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          display: grid; place-items: center; color: #4285F4;
          transition: transform 0.15s;
        }
        .uber-recenter:active { transform: scale(0.92); }

        /* ── Refresh ── */
        .uber-refresh {
          position: absolute; bottom: 100px; right: 60px; z-index: 500;
          width: 36px; height: 36px; border-radius: 50%;
          background: #fff; border: none; cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          display: grid; place-items: center; font-size: 16px; color: #6b7280;
        }

        /* ── Speed ── */
        .uber-speed {
          position: absolute; bottom: 150px; left: 12px; z-index: 500;
          background: #111; color: #fff; border-radius: 12px;
          padding: 6px 10px; text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          min-width: 50px;
        }
        .uber-speed-val { font-size: 18px; font-weight: 800; line-height: 1; }
        .uber-speed-unit { font-size: 9px; font-weight: 600; opacity: 0.6; margin-top: 1px; }

        /* ── Bottom Card ── */
        .uber-bottom-card {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 500;
          background: rgba(255,255,255,0.97); backdrop-filter: blur(16px);
          border-radius: 20px 20px 0 0;
          padding: 8px 16px 14px;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          cursor: pointer; transition: all 0.2s;
        }
        .uber-bottom-handle {
          width: 36px; height: 4px; border-radius: 2px;
          background: #d1d5db; margin: 0 auto 10px;
        }
        .uber-bottom-row {
          display: flex; align-items: center; justify-content: center; gap: 0;
        }
        .uber-stat {
          flex: 1; text-align: center; padding: 2px 8px;
        }
        .uber-stat-val {
          font-size: 16px; font-weight: 800; color: #111; line-height: 1.2;
        }
        .uber-stat-unit { font-size: 11px; font-weight: 500; color: #6b7280; }
        .uber-stat-label {
          font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase;
          letter-spacing: 0.3px; margin-top: 2px;
        }
        .uber-stat-divider {
          width: 1px; height: 28px; background: #e5e7eb; flex-shrink: 0;
        }
        .uber-stats-expanded {
          margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6;
          display: grid; gap: 4px;
        }
        .uber-stat-extra {
          display: flex; justify-content: space-between;
          font-size: 12px; color: #6b7280; padding: 2px 0;
        }

        /* ── No Data ── */
        .uber-no-data {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          display: grid; place-items: center; place-content: center;
          background: rgba(255,255,255,0.9); backdrop-filter: blur(4px);
          z-index: 400; text-align: center; padding: 20px;
        }

        /* ── Map overrides ── */
        .leaflet-control-zoom { border: none !important; border-radius: 12px !important; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important; }
        .leaflet-control-zoom a { width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 18px !important; color: #111 !important; background: #fff !important; border: none !important; }
        .leaflet-control-zoom a:hover { background: #f3f4f6 !important; }
      `}</style>
    </div>
  );
}
