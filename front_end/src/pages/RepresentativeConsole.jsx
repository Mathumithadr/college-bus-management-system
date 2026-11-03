import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import {
  Play, Square, MapPin, AlertTriangle, Radio,
  CheckCircle2, RefreshCw, Navigation, Clock
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Bus Icon
const busIcon = L.divIcon({
  className: 'custom-bus-icon',
  html: `<div style="background-color:#fbbf24; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border: 3px solid white; box-shadow: 0 4px 12px rgba(251,191,36,0.6); font-size: 18px;">🚌</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Helper to fly the map to the current position
function MapFollower({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position.lat && position.lng) {
      map.flyTo([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);
  return null;
}

export default function RepresentativeConsole() {
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // GPS State
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);
  const [lastPing, setLastPing] = useState(null);
  const [currentCoords, setCurrentCoords] = useState({ lat: 11.0168, lng: 76.9558 }); // Default Coimbatore
  const [gpsError, setGpsError] = useState(false);

  // Manual Fallback State
  const [manualStop, setManualStop] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  // Delay State
  const [delayMinutes, setDelayMinutes] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [showDelayForm, setShowDelayForm] = useState(false);

  // End Trip State
  const [showEndTripForm, setShowEndTripForm] = useState(false);
  const [endTripReason, setEndTripReason] = useState('');

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/rep/dashboard');
      const data = res.data || res;

      if (!data.assignment) {
        setError('You are not assigned to any bus. Contact Admin.');
      } else {
        setAssignment(data.assignment);
        setActiveTrip(data.trip);

        // If there's an active trip, set the map to the first stop
        if (data.assignment.routeId.stops.length > 0) {
          const firstStop = data.assignment.routeId.stops[0];
          setCurrentCoords({ lat: firstStop.latitude, lng: firstStop.longitude });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load representative state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    return () => stopGpsTracking();
  }, [fetchState]);

  const handleStartTrip = async () => {
    try {
      const res = await axiosClient.post(`/rep/buses/${assignment.busId._id}/trips/start`);
      setActiveTrip(res.data.trip || res.trip);
      setSuccessMsg('Trip started successfully! You can now start GPS.');
    } catch (err) {
      setError(err.message || 'Failed to start trip');
    }
  };

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setGpsError(true);
      return;
    }

    setIsTracking(true);
    setGpsError(false);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });

        try {
          await axiosClient.post(`/rep/trips/${activeTrip._id}/location`, {
            latitude, longitude, accuracyMeters: accuracy, recordedAt: new Date().toISOString(),
          });
          setLastPing(new Date().toLocaleTimeString());
        } catch (err) {
          if (err.code === 'FORBIDDEN' || err.code === 'REPRESENTATIVE_NOT_ACTIVE') {
            stopGpsTracking();
            setError('You are no longer the active representative.');
          }
        }
      },
      () => { setGpsError(true); setIsTracking(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const handleManualLocation = async (e) => {
    e.preventDefault();
    if (!manualStop) return;
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/location/manual`, {
        latitude: 0, longitude: 0, recordedAt: new Date().toISOString(), stopName: manualStop
      });
      setSuccessMsg('Manual location reported.');
      setShowManualForm(false);
      setManualStop('');
    } catch (err) {
      setError(err.message || 'Failed to report manual location');
    }
  };

  const handleReportDelay = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/delay`, {
        updateType: 'delay', reason: delayReason || 'Traffic', expectedDelayMinutes: parseInt(delayMinutes, 10),
      });
      setSuccessMsg(`Delay of ${delayMinutes} mins broadcasted.`);
      setShowDelayForm(false);
      setDelayMinutes(''); setDelayReason('');
    } catch (err) {
      setError(err.message || 'Failed to report delay');
    }
  };

  const handleEndTrip = async (e) => {
    e.preventDefault();
    if (endTripReason.length < 10) return setError('Reason must be at least 10 characters.');
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/end`, { reason: endTripReason });
      stopGpsTracking();
      setActiveTrip(null);
      setShowEndTripForm(false);
      setSuccessMsg('Trip ended successfully.');
    } catch (err) {
      setError(err.message || 'Failed to end trip');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-emerald-400"><RefreshCw className="w-8 h-8 animate-spin" /></div>;
  if (error && !assignment) return <div className="max-w-4xl mx-auto mt-10 p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-center"><AlertTriangle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  const routeStops = assignment?.routeId?.stops || [];
  const routePolyline = routeStops.map(s => [s.latitude, s.longitude]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Representative Console</h1>
          <p className="text-sm text-slate-400 mt-1">
            Bus: <span className="text-emerald-400 font-semibold">{assignment?.busId?.busNumber}</span> |
            Route: <span className="text-emerald-400 font-semibold">{assignment?.routeId?.routeName}</span>
          </p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <p className="text-xs text-slate-400">Logged in as</p>
          <p className="text-sm font-bold text-white">{user?.name}</p>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {successMsg && <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400"><CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}</div>}

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT: THE MAP (Always Visible) */}
        <div className="lg:col-span-2 bg-[#0c162b] border border-[#16274a] rounded-2xl overflow-hidden shadow-xl relative" style={{ minHeight: '450px' }}>
          <div style={{ height: '450px', width: '100%' }}>
            <MapContainer
              center={[currentCoords.lat, currentCoords.lng]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapFollower position={currentCoords} />

              {routePolyline.length > 1 && (
                <Polyline positions={routePolyline} color="#10b981" weight={4} dashArray="10 10" />
              )}

              <Marker position={[currentCoords.lat, currentCoords.lng]} icon={busIcon} />
            </MapContainer>
          </div>

          {/* Floating GPS Status on Map */}
          <div className="absolute top-4 right-4 z-[999] bg-[#0a1324]/95 backdrop-blur-md border border-[#1b2f52] rounded-xl px-4 py-2 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-xs text-white">{isTracking ? 'Live GPS Active' : activeTrip ? 'GPS Paused' : 'Trip Not Started'}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="space-y-4">

          {/* Trip Control Card */}
          {!activeTrip ? (
            <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl text-center">
              <Radio className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white mb-2">Ready to start?</h2>
              <p className="text-xs text-slate-400 mb-4">Click below when you are at the first stop.</p>
              <button onClick={handleStartTrip} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition">
                <Play className="w-5 h-5" /> Start Trip
              </button>
            </div>
          ) : (
            <>
              {/* GPS Panel */}
              <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-5 shadow-xl">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Navigation className="w-4 h-4 text-emerald-400" /> GPS Control</h2>

                {currentCoords.lat && (
                  <div className="bg-[#0e192f] rounded-lg p-3 text-xs space-y-1 mb-3">
                    <p className="text-slate-400">Lat: <span className="text-white font-mono">{currentCoords.lat.toFixed(5)}</span></p>
                    <p className="text-slate-400">Lng: <span className="text-white font-mono">{currentCoords.lng.toFixed(5)}</span></p>
                    <p className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Last: <span className="text-white">{lastPing || 'Waiting...'}</span></p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {!isTracking ? (
                    <button onClick={startGpsTracking} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" /> Start GPS
                    </button>
                  ) : (
                    <button onClick={stopGpsTracking} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm">
                      <Square className="w-4 h-4" /> Stop GPS
                    </button>
                  )}
                  <button onClick={() => setShowManualForm(!showManualForm)} className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 font-bold rounded-lg text-xs">
                    Manual Fallback
                  </button>
                </div>

                {showManualForm && (
                  <form onSubmit={handleManualLocation} className="mt-3 p-3 bg-[#0e192f] border border-[#1b2b4c] rounded-xl space-y-2">
                    <select required value={manualStop} onChange={(e) => setManualStop(e.target.value)} className="w-full bg-[#0c162b] border border-[#1b2b4c] rounded-lg px-2 py-1.5 text-white text-xs">
                      <option value="">-- Select Stop --</option>
                      {routeStops.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg">Submit</button>
                      <button type="button" onClick={() => setShowManualForm(false)} className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded-lg">Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Actions Panel */}
              <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-5 shadow-xl space-y-3">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Actions</h2>

                {!showDelayForm ? (
                  <button onClick={() => setShowDelayForm(true)} className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-lg text-xs">
                    Report Delay
                  </button>
                ) : (
                  <form onSubmit={handleReportDelay} className="space-y-2">
                    <input type="number" required placeholder="Minutes" value={delayMinutes} onChange={e => setDelayMinutes(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-lg px-3 py-1.5 text-white text-xs" />
                    <input type="text" placeholder="Reason (e.g. Traffic)" value={delayReason} onChange={e => setDelayReason(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-lg px-3 py-1.5 text-white text-xs" />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg">Send</button>
                      <button type="button" onClick={() => setShowDelayForm(false)} className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded-lg">Cancel</button>
                    </div>
                  </form>
                )}

                {!showEndTripForm ? (
                  <button onClick={() => setShowEndTripForm(true)} className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-xs">
                    End Trip
                  </button>
                ) : (
                  <form onSubmit={handleEndTrip} className="space-y-2">
                    <textarea required rows={2} placeholder="Reason (min 10 chars)" value={endTripReason} onChange={(e) => setEndTripReason(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-lg px-3 py-1.5 text-white text-xs resize-none" />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg">Confirm</button>
                      <button type="button" onClick={() => setShowEndTripForm(false)} className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded-lg">Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}