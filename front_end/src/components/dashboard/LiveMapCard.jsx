// LiveMapCard — Leaflet interactive map card with glowing route lines, stop markers, bus icon, and GPS toggle
import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix Leaflet default marker icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom bus HTML icon used as the Leaflet marker for the active bus position
const busIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <!-- Outer radar pulse ring — glowing emerald animation -->
      <div style="position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.15);border:2px solid rgba(16,185,129,0.5);" class="radar-ring"></div>
      <!-- Inner amber bus badge -->
      <div style="width:32px;height:32px;border-radius:50%;background:#fbbf24;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(251,191,36,0.4);">
        🚌
      </div>
    </div>`,
  iconSize: [56, 56],
  iconAnchor: [28, 28],
});

// MapBoundsController — safely fits the map bounds to route stops
function MapBoundsController({ stops }) {
  const map = useMap();
  React.useEffect(() => {
    if (stops && stops.length > 1) {
      const validStops = stops.filter(
        (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number' && !isNaN(s.latitude) && !isNaN(s.longitude)
      );
      if (validStops.length > 1) {
        const bounds = L.latLngBounds(validStops.map((s) => [s.latitude, s.longitude]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [stops, map]);
  return null;
}

export default function LiveMapCard({ busInfo, liveLocation }) {
  // Layer toggle states — each controls visibility of a map layer
  const [layers, setLayers] = useState({
    yourRoute: true,
    otherRoutes: true,
    busLocations: true,
    stops: true,
  });

  // liveGps toggle controls whether live tracking is enabled
  const [liveGps, setLiveGps] = useState(true);

  // Extract stops safely from bus assignment
  const stops = busInfo?.route?.stops || [];

  // Filter valid stop coordinates for the polyline
  const validStops = stops
    .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number' && !isNaN(s.latitude) && !isNaN(s.longitude))
    .slice()
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  // Determine bus GPS coordinates safely with numerical validation
  const liveLat = Number(liveLocation?.latitude ?? liveLocation?.location?.latitude);
  const liveLng = Number(liveLocation?.longitude ?? liveLocation?.location?.longitude);
  const hasLiveCoords = !isNaN(liveLat) && !isNaN(liveLng) && liveLat !== 0 && liveLng !== 0;

  // Fallback to first valid stop or default coordinates (Chennai)
  const defaultCenter = [13.0827, 80.2707];
  const busPosition = hasLiveCoords
    ? [liveLat, liveLng]
    : validStops.length > 0
    ? [validStops[0].latitude, validStops[0].longitude]
    : defaultCenter;

  // Build the route polyline positions
  const routePositions = validStops.map((s) => [s.latitude, s.longitude]);

  return (
    <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-4 shadow-xl space-y-3">
      {/* Card header with map pin icon and title */}
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-emerald-400" />
        <h2 className="font-bold text-white text-base">Live Bus Tracking</h2>
      </div>

      {/* Leaflet map container — safe center coordinates */}
      <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-[#14233e]">
        <MapContainer
          center={busPosition}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          {/* Tile layer */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Auto-fit map bounds when stops load */}
          {validStops.length > 1 && <MapBoundsController stops={validStops} />}

          {/* Glowing emerald route polyline connecting stop coordinates */}
          {layers.yourRoute && routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{ color: '#10b981', weight: 5, opacity: 0.85, dashArray: '10 5' }}
            />
          )}

          {/* Stop circle markers */}
          {layers.stops &&
            validStops.map((stop) => (
              <CircleMarker
                key={stop._id || stop.sequence}
                center={[stop.latitude, stop.longitude]}
                radius={8}
                pathOptions={{ color: '#10b981', fillColor: '#ffffff', fillOpacity: 1, weight: 3 }}
              />
            ))}

          {/* Bus marker rendered when live coordinates are available or default stop exists */}
          {layers.busLocations && (
            <Marker position={busPosition} icon={busIcon} />
          )}
        </MapContainer>

        {/* FLOATING TOP-LEFT: Route layer filter checkboxes */}
        <div className="absolute top-3 left-3 bg-[#0a1324]/95 backdrop-blur-md border border-[#1b2f52] rounded-xl p-3 shadow-2xl space-y-2 text-xs z-[999]">
          {[
            { key: 'yourRoute', label: 'Your Route', accent: 'accent-emerald-500' },
            { key: 'otherRoutes', label: 'Other Routes', accent: 'accent-blue-500' },
            { key: 'busLocations', label: 'Bus Locations', accent: 'accent-amber-500' },
            { key: 'stops', label: 'Stops', accent: 'accent-slate-400' },
          ].map(({ key, label, accent }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={(e) => setLayers((prev) => ({ ...prev, [key]: e.target.checked }))}
                className={`w-4 h-4 rounded ${accent} bg-[#070d18] border-slate-600 focus:ring-0`}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* FLOATING BOTTOM-LEFT: Live GPS toggle pill */}
        <div className="absolute bottom-3 left-3 bg-[#0a1324]/95 backdrop-blur-md border border-[#1b2f52] rounded-full px-3.5 py-2 shadow-2xl flex items-center gap-3 z-[999]">
          <button
            onClick={() => setLiveGps((prev) => !prev)}
            className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors ${
              liveGps ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                liveGps ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-white">Live GPS Tracking</span>
        </div>
      </div>
    </div>
  );
}
