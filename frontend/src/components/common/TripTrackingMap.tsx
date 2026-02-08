import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp?: string;
  speed?: number;
  accuracy?: number;
}

interface MapLocation {
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
  address?: string;
}

interface TripTrackingMapProps {
  currentLocation: LocationPoint | null;
  locationHistory: LocationPoint[];
  pickupLocation?: MapLocation | null;
  deliveryLocation?: MapLocation | null;
  driverName?: string;
  loadNumber?: string;
  status?: string;
  height?: number | string;
  showRoute?: boolean;
  autoRefresh?: boolean;
  onRefresh?: () => void;
}

// ─── Utility Functions ─────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateTotalDistance(points: LocationPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }
  return total;
}

function formatDuration(ms: number): string {
  if (ms < 0) return '—';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Custom Icons ───────────────────────────────────────────

const truckIcon = L.divIcon({
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#3b82f6;border:3px solid #fff;display:grid;place-items:center;box-shadow:0 3px 12px rgba(59,130,246,0.5);font-size:20px;animation:truckPulse 2s ease-in-out infinite;">🚛</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: '',
});

const pickupIcon = L.divIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:32px;height:32px;border-radius:50%;background:#ef4444;border:3px solid #fff;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:15px;">📦</div><div style="width:2px;height:8px;background:#ef4444;"></div></div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  className: '',
});

const deliveryIcon = L.divIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:32px;height:32px;border-radius:50%;background:#22c55e;border:3px solid #fff;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:15px;">🏁</div><div style="width:2px;height:8px;background:#22c55e;"></div></div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  className: '',
});

const startIcon = L.divIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:28px;height:28px;border-radius:50%;background:#8b5cf6;border:3px solid #fff;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:12px;font-weight:700;color:#fff;">S</div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: '',
});

function createTimeDot(time: string, index: number, speed?: number) {
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="width:12px;height:12px;border-radius:50%;background:rgba(59,130,246,0.9);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>
      <div style="background:rgba(0,0,0,0.8);color:#fff;font-size:9px;padding:1px 5px;border-radius:4px;margin-top:2px;white-space:nowrap;font-weight:500;line-height:1.3;text-align:center;">
        ${time}${speed ? `<br/>${(speed * 3.6).toFixed(0)}km/h` : ''}
      </div>
    </div>`,
    iconSize: [80, 40],
    iconAnchor: [40, 6],
    className: '',
  });
}

function createMajorTimeDot(dateTime: string, speed?: number) {
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(37,99,235,0.4);"></div>
      <div style="background:rgba(37,99,235,0.95);color:#fff;font-size:10px;padding:3px 7px;border-radius:6px;margin-top:3px;white-space:nowrap;font-weight:600;line-height:1.3;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.2);">
        ${dateTime}${speed ? `<br/>⚡ ${(speed * 3.6).toFixed(0)} km/h` : ''}
      </div>
    </div>`,
    iconSize: [120, 50],
    iconAnchor: [60, 8],
    className: '',
  });
}

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  trip_accepted: 'Ready to Start',
  trip_started: 'On Route to Pickup',
  shipper_check_in: 'Checked In at Shipper',
  shipper_load_in: 'Loading',
  shipper_load_out: 'Loaded — En Route',
  in_transit: 'In Transit',
  receiver_check_in: 'At Receiver',
  receiver_offload: 'Offloading',
  delivered: 'Delivered',
  completed: 'Completed',
};

// ─── Component ─────────────────────────────────────────────

export default function TripTrackingMap({
  currentLocation,
  locationHistory,
  pickupLocation,
  deliveryLocation,
  driverName = 'Driver',
  loadNumber = '',
  status = '',
  height = 350,
  showRoute = true,
  autoRefresh = false,
  onRefresh,
}: TripTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const hasFittedRef = useRef(false);
  const prevHistoryLenRef = useRef(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const formatLoc = (loc: MapLocation | null | undefined) => {
    if (!loc) return 'Unknown';
    return [loc.address, loc.city, loc.state].filter(Boolean).join(', ') || 'Unknown';
  };

  // Calculate trip stats
  const tripStats = useMemo(() => {
    if (locationHistory.length < 2) return null;
    const totalDistance = calculateTotalDistance(locationHistory);
    const timestamps = locationHistory.filter(p => p.timestamp).map(p => new Date(p.timestamp!).getTime());
    let travelTime = 0;
    let avgSpeed = 0;
    let maxSpeed = 0;
    let startTime = '';
    let lastTime = '';

    if (timestamps.length >= 2) {
      const earliest = Math.min(...timestamps);
      const latest = Math.max(...timestamps);
      travelTime = latest - earliest;
      avgSpeed = travelTime > 0 ? (totalDistance / (travelTime / 3600000)) : 0;
      startTime = new Date(earliest).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      lastTime = new Date(latest).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    locationHistory.forEach(p => {
      if (p.speed && p.speed > maxSpeed) maxSpeed = p.speed;
    });

    return { totalDistance, travelTime, avgSpeed, maxSpeed: maxSpeed * 3.6, startTime, lastTime };
  }, [locationHistory]);

  // All points for bounds calculation
  const allPoints = useMemo(() => {
    const pts: [number, number][] = [];
    if (currentLocation) pts.push([currentLocation.lat, currentLocation.lng]);
    locationHistory.forEach(p => pts.push([p.lat, p.lng]));
    if (pickupLocation?.lat && pickupLocation?.lng) pts.push([pickupLocation.lat, pickupLocation.lng]);
    if (deliveryLocation?.lat && deliveryLocation?.lng) pts.push([deliveryLocation.lat, deliveryLocation.lng]);
    return pts;
  }, [currentLocation, locationHistory, pickupLocation, deliveryLocation]);

  // Initialize map ONCE
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = [20.5937, 78.9629];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ prefix: false }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
        routeLineRef.current = null;
        hasFittedRef.current = false;
      }
    };
  }, []);

  // Update markers and route when data changes
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // 1. Pickup marker
    if (pickupLocation?.lat && pickupLocation?.lng) {
      const m = L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon });
      m.bindPopup(`
        <div style="min-width:150px">
          <div style="font-weight:700;margin-bottom:4px">📦 Pickup Location</div>
          <div style="font-size:12px;color:#666">${formatLoc(pickupLocation)}</div>
        </div>
      `);
      markers.addLayer(m);
    }

    // 2. Delivery marker
    if (deliveryLocation?.lat && deliveryLocation?.lng) {
      const m = L.marker([deliveryLocation.lat, deliveryLocation.lng], { icon: deliveryIcon });
      m.bindPopup(`
        <div style="min-width:150px">
          <div style="font-weight:700;margin-bottom:4px">🏁 Delivery Location</div>
          <div style="font-size:12px;color:#666">${formatLoc(deliveryLocation)}</div>
        </div>
      `);
      markers.addLayer(m);
    }

    // 3. Route polyline and time markers from location history
    if (showRoute && locationHistory.length >= 1) {
      const routeCoords = locationHistory.map(p => [p.lat, p.lng] as [number, number]);
      if (currentLocation) {
        routeCoords.push([currentLocation.lat, currentLocation.lng]);
      }

      // Draw gradient-like route segments
      if (routeCoords.length >= 2) {
        // Main route line
        routeLineRef.current = L.polyline(routeCoords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        // Shadow line for depth
        L.polyline(routeCoords, {
          color: '#1d4ed8',
          weight: 7,
          opacity: 0.15,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);
      }

      // Start point marker
      if (locationHistory.length > 0) {
        const firstPt = locationHistory[0];
        const startMarker = L.marker([firstPt.lat, firstPt.lng], { icon: startIcon, zIndexOffset: 500 });
        const startDt = firstPt.timestamp ? formatDateTime(firstPt.timestamp) : 'Trip Start';
        startMarker.bindPopup(`
          <div style="min-width:150px">
            <div style="font-weight:700;margin-bottom:4px;color:#8b5cf6">🟣 Trip Started</div>
            <div style="font-size:12px;color:#666">${startDt}</div>
            <div style="font-size:11px;color:#888;margin-top:2px">${firstPt.lat.toFixed(5)}, ${firstPt.lng.toFixed(5)}</div>
          </div>
        `);
        markers.addLayer(startMarker);
      }

      // Time-labeled markers at smart intervals
      const totalPts = locationHistory.length;
      if (totalPts > 1) {
        // Determine time span to decide labeling strategy
        const timestamped = locationHistory.filter(p => p.timestamp);
        const hasTimestamps = timestamped.length > 1;

        if (hasTimestamps) {
          const firstTime = new Date(timestamped[0].timestamp!).getTime();
          const lastTime = new Date(timestamped[timestamped.length - 1].timestamp!).getTime();
          const spanMs = lastTime - firstTime;
          const spanHours = spanMs / 3600000;

          // Smart interval: more frequent labels for shorter trips
          let intervalMs: number;
          if (spanHours <= 1) intervalMs = 5 * 60000;      // every 5 min
          else if (spanHours <= 3) intervalMs = 15 * 60000; // every 15 min
          else if (spanHours <= 8) intervalMs = 30 * 60000; // every 30 min
          else intervalMs = 60 * 60000;                     // every 1 hour

          // Track which day we're on for multi-day trips
          let lastLabelTime = firstTime;
          let lastLabelDate = new Date(firstTime).toDateString();
          let labelCount = 0;
          const maxLabels = 25; // prevent clutter

          for (let i = 1; i < timestamped.length && labelCount < maxLabels; i++) {
            const pt = timestamped[i];
            const ptTime = new Date(pt.timestamp!).getTime();
            const ptDate = new Date(pt.timestamp!).toDateString();

            if (ptTime - lastLabelTime >= intervalMs) {
              const dateChanged = ptDate !== lastLabelDate;

              if (dateChanged || (ptTime - lastLabelTime >= intervalMs * 3)) {
                // Major label (with date)
                const label = formatDateTime(pt.timestamp!);
                const icon = createMajorTimeDot(label, pt.speed);
                const marker = L.marker([pt.lat, pt.lng], { icon, zIndexOffset: 300 });
                marker.bindPopup(`
                  <div style="min-width:160px">
                    <div style="font-weight:700;font-size:13px;margin-bottom:4px">📍 ${label}</div>
                    <table style="font-size:11px;color:#555;border-collapse:collapse;width:100%">
                      <tr><td style="padding:2px 6px 2px 0;color:#888">Coords</td><td>${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}</td></tr>
                      ${pt.speed ? `<tr><td style="padding:2px 6px 2px 0;color:#888">Speed</td><td>${(pt.speed * 3.6).toFixed(0)} km/h</td></tr>` : ''}
                      ${pt.accuracy ? `<tr><td style="padding:2px 6px 2px 0;color:#888">Accuracy</td><td>${pt.accuracy.toFixed(0)}m</td></tr>` : ''}
                    </table>
                  </div>
                `);
                markers.addLayer(marker);
              } else {
                // Minor label (time only)
                const timeStr = formatTime(pt.timestamp!);
                const icon = createTimeDot(timeStr, i, pt.speed);
                const marker = L.marker([pt.lat, pt.lng], { icon, zIndexOffset: 200 });
                marker.bindPopup(`
                  <div style="min-width:140px">
                    <div style="font-weight:700;font-size:12px;margin-bottom:4px">${formatDateTime(pt.timestamp!)}</div>
                    <div style="font-size:11px;color:#666">${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}</div>
                    ${pt.speed ? `<div style="font-size:11px;color:#3b82f6">⚡ ${(pt.speed * 3.6).toFixed(0)} km/h</div>` : ''}
                  </div>
                `);
                markers.addLayer(marker);
              }

              lastLabelTime = ptTime;
              lastLabelDate = ptDate;
              labelCount++;
            }
          }
        } else {
          // No timestamps — show dots at intervals
          const step = Math.max(1, Math.floor(totalPts / 12));
          for (let i = step; i < totalPts; i += step) {
            const p = locationHistory[i];
            const dot = L.divIcon({
              html: `<div style="width:10px;height:10px;border-radius:50%;background:rgba(59,130,246,0.7);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
              className: '',
            });
            const marker = L.marker([p.lat, p.lng], { icon: dot });
            marker.bindPopup(`<div style="font-size:11px">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>`);
            markers.addLayer(marker);
          }
        }
      }
    }

    // 4. Current location (truck) marker
    if (currentLocation) {
      const truckMarker = L.marker(
        [currentLocation.lat, currentLocation.lng],
        { icon: truckIcon, zIndexOffset: 1000 }
      );
      const popupTime = currentLocation.timestamp
        ? formatDateTime(currentLocation.timestamp)
        : 'Just now';
      truckMarker.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px">🚛 ${driverName}</div>
          <table style="font-size:11px;color:#555;border-collapse:collapse;width:100%">
            <tr><td style="padding:2px 8px 2px 0;color:#888">Load</td><td style="font-weight:600">${loadNumber}</td></tr>
            <tr><td style="padding:2px 8px 2px 0;color:#888">Status</td><td>${STATUS_LABELS[status] || status.replace(/_/g, ' ')}</td></tr>
            <tr><td style="padding:2px 8px 2px 0;color:#888">Updated</td><td>${popupTime}</td></tr>
            <tr><td style="padding:2px 8px 2px 0;color:#888">GPS</td><td>${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}</td></tr>
            ${currentLocation.speed ? `<tr><td style="padding:2px 8px 2px 0;color:#888">Speed</td><td>${(currentLocation.speed * 3.6).toFixed(0)} km/h</td></tr>` : ''}
          </table>
        </div>
      `);
      markers.addLayer(truckMarker);
    }

    // 5. Fit bounds
    const historyGrew = locationHistory.length > prevHistoryLenRef.current + 3;
    if (allPoints.length > 0 && (!hasFittedRef.current || historyGrew)) {
      const bounds = L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      hasFittedRef.current = true;
      prevHistoryLenRef.current = locationHistory.length;
    } else if (currentLocation && hasFittedRef.current) {
      map.panTo([currentLocation.lat, currentLocation.lng], { animate: true, duration: 0.5 });
    }

    setLastUpdate(new Date());
  }, [currentLocation, locationHistory, pickupLocation, deliveryLocation, driverName, loadNumber, status, showRoute, allPoints]);

  // Auto refresh polling
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;
    const interval = setInterval(onRefresh, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const noData = !currentLocation && locationHistory.length === 0
    && !(pickupLocation?.lat && pickupLocation?.lng)
    && !(deliveryLocation?.lat && deliveryLocation?.lng);

  const hasRealTracking = currentLocation || locationHistory.length > 0;

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--dm-border, #e5e7eb)' }}>
      {/* Map Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: hasRealTracking ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.06)',
        borderBottom: '1px solid var(--dm-border, #e5e7eb)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            {hasRealTracking ? 'Live Tracking' : 'Trip Map'}
          </span>
          {hasRealTracking && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e', display: 'inline-block',
              animation: 'mapPulse 2s infinite',
            }} />
          )}
          {locationHistory.length > 0 && (
            <span style={{
              fontSize: 10, background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
              padding: '2px 6px', borderRadius: 4, fontWeight: 600,
            }}>
              {locationHistory.length} pts
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdate && (
            <span style={{ fontSize: 10, color: '#6b7280' }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                background: '#3b82f6', color: '#fff', border: 'none',
                borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} style={{ height, width: '100%', background: '#e8f0fe' }} />

      {/* No Data Overlay */}
      {noData && (
        <div style={{
          position: 'absolute', top: 40, left: 0, right: 0, bottom: 0,
          display: 'grid', placeItems: 'center',
          background: 'rgba(255,255,255,0.9)', zIndex: 400,
        }}>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No location data yet</div>
            <div style={{ fontSize: 12, color: '#6b7280', maxWidth: 250 }}>
              Location tracking begins when the driver starts the trip and enables GPS access.
            </div>
          </div>
        </div>
      )}

      {/* Trip Stats Bar */}
      {tripStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: 1, padding: 0,
          borderTop: '1px solid var(--dm-border, #e5e7eb)',
          background: 'linear-gradient(180deg, rgba(59,130,246,0.04), rgba(255,255,255,1))',
        }}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Distance</div>
            <div style={statValueStyle}>{tripStats.totalDistance.toFixed(1)} km</div>
          </div>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Duration</div>
            <div style={statValueStyle}>{formatDuration(tripStats.travelTime)}</div>
          </div>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Avg Speed</div>
            <div style={statValueStyle}>{tripStats.avgSpeed.toFixed(0)} km/h</div>
          </div>
          {tripStats.maxSpeed > 0 && (
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Max Speed</div>
              <div style={statValueStyle}>{tripStats.maxSpeed.toFixed(0)} km/h</div>
            </div>
          )}
          {tripStats.startTime && (
            <div style={{ ...statBoxStyle, gridColumn: 'span 2' }}>
              <div style={statLabelStyle}>Trip Window</div>
              <div style={{ ...statValueStyle, fontSize: 11 }}>{tripStats.startTime} → {tripStats.lastTime}</div>
            </div>
          )}
        </div>
      )}

      {/* Legend Footer */}
      <div style={{
        display: 'flex', gap: 10, padding: '6px 12px',
        borderTop: '1px solid var(--dm-border, #e5e7eb)',
        fontSize: 10, color: '#6b7280', flexWrap: 'wrap',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.97)',
      }}>
        {currentLocation && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>🚛 Driver</span>}
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>🟣 Start</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>📦 Pickup</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>🏁 Delivery</span>
        {locationHistory.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 14, height: 3, background: '#3b82f6', borderRadius: 2, display: 'inline-block' }} />
            Route ({locationHistory.length})
          </span>
        )}
        {currentLocation && (
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#3b82f6' }}>
            {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </span>
        )}
      </div>

      <style>{`
        @keyframes mapPulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes truckPulse {
          0% { box-shadow: 0 3px 12px rgba(59,130,246,0.5); }
          50% { box-shadow: 0 3px 20px rgba(59,130,246,0.8); }
          100% { box-shadow: 0 3px 12px rgba(59,130,246,0.5); }
        }
      `}</style>
    </div>
  );
}

// ─── Stat Box Styles ────────────────────────────────────────

const statBoxStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'center',
  borderRight: '1px solid rgba(0,0,0,0.05)',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 2,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#111827',
};
