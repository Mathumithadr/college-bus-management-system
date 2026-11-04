import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import {
  Play, Square, MapPin, AlertTriangle, Radio,
  ShieldAlert, CheckCircle2, UserCheck, RefreshCw, Pause
} from 'lucide-react';

export default function RepresentativeConsole() {
  const { user } = useAuth();

  // Data State
  const [assignedBus, setAssignedBus] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // GPS State
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);
  const [lastPing, setLastPing] = useState(null);
  const [gpsError, setGpsError] = useState(false);

  // Manual Fallback State
  const [manualStop, setManualStop] = useState('');
  const [selectedManualStopId, setSelectedManualStopId] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  // Delay State
  const [delayMinutes, setDelayMinutes] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [showDelayForm, setShowDelayForm] = useState(false);

  // Handover State
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  // Dynamic Route Stops & Simulation State
  const [routeStops, setRouteStops] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const pauseTimerRef = useRef(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const simulationTimerRef = useRef(null);
  const simulationStateRef = useRef({ stopIdx: 0, pingNum: 1, activeStops: [], currentTripId: null });

  // 1. Fetch Assigned Bus and Active Trip on Mount
  const fetchState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Get the bus assigned to this rep
      const busRes = await axiosClient.get('/rep/buses');
      const buses = busRes.data?.buses || busRes.buses || busRes.data || [];

      if (buses.length === 0) {
        setError('You are not assigned to any bus. Please contact the Admin.');
        setLoading(false);
        return;
      }

      const myBus = buses[0]; // Assuming a rep handles one bus at a time
      setAssignedBus(myBus.busId);

      // Extract route stops dynamically from the assignment
      const stops = myBus.routeId?.stops || [];
      setRouteStops(stops);

      // Check if there is already an active trip for this bus
      const stateRes = await axiosClient.get(`/rep/buses/${myBus.busId._id}/state`);
      const stateData = stateRes.data || stateRes;

      if (stateData.currentTripId) {
        setActiveTrip({ _id: stateData.currentTripId });
      }
    } catch (err) {
      console.error("Failed to load state", err);
      setError(err?.message || 'Failed to load representative state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    // Cleanup GPS and simulation on unmount
    return () => {
      stopGpsTracking();
      stopSimulation();
    };
  }, [fetchState]);

  // 2. Start Trip
  const handleStartTrip = async () => {
    if (!assignedBus) return;
    try {
      const res = await axiosClient.post(`/rep/buses/${assignedBus._id}/trips/start`);
      const trip = res.data?.trip || res.trip || res.data;
      setActiveTrip(trip);
    } catch (err) {
      alert(err.message || 'Failed to start trip');
    }
  };

  // 3. End Trip
  const handleEndTrip = async () => {
    if (!window.confirm("Are you sure you want to end this trip?")) return;
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/end`);
      stopGpsTracking();
      stopSimulation();
      setActiveTrip(null);
      setShowManualForm(false);
    } catch (err) {
      alert(err.message || 'Failed to end trip');
    }
  };

  // 4. GPS Tracking
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setGpsError(true);
      return;
    }

    setIsTracking(true);
    setGpsError(false);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await axiosClient.post(`/rep/trips/${activeTrip._id}/location`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            recordedAt: new Date().toISOString(),
          });
          setLastPing(new Date().toLocaleTimeString());
        } catch (err) {
          console.error("Failed to send GPS ping", err);
          // If backend rejects the ping (e.g., 403 due to handover), stop tracking
          if (err.code === 'FORBIDDEN' || err.code === 'REPRESENTATIVE_NOT_ACTIVE') {
            stopGpsTracking();
            alert("You are no longer the active representative.");
          }
        }
      },
      (error) => {
        console.error("GPS Error:", error);
        setGpsError(true);
        setIsTracking(false);
      },
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

  // 5. GPS Telemetry Simulation (For Demo / External Evaluation)
  const stopSimulation = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulating(false);
    setIsPaused(false);
    setDebugInfo(null);
    simulationStateRef.current = { stopIdx: 0, pingNum: 1, activeStops: [], currentTripId: null };
  };

  const executeSimulationPing = async () => {
    const state = simulationStateRef.current;
    if (!state || !state.activeStops || state.activeStops.length === 0) return;

    if (state.stopIdx >= state.activeStops.length) {
      stopSimulation();
      alert("🏁 Simulation complete! Bus has reached the college campus.");
      return;
    }

    const target = state.activeStops[state.stopIdx];
    // Slight natural GPS drift (~2 meters) to simulate hardware antenna readings
    const latJitter = (Math.random() - 0.5) * 0.00004;
    const lngJitter = (Math.random() - 0.5) * 0.00004;

    const payloadLat = Number((target.latitude + latJitter).toFixed(5));
    const payloadLng = Number((target.longitude + lngJitter).toFixed(5));

    setDebugInfo({
      name: target.name,
      lat: payloadLat,
      lng: payloadLng,
      ping: state.pingNum,
      currentStopNum: state.stopIdx + 1,
      totalStops: state.activeStops.length,
    });

    try {
      await axiosClient.post(`/rep/trips/${state.currentTripId}/location`, {
        latitude: payloadLat,
        longitude: payloadLng,
        accuracyMeters: 4.5,
        recordedAt: new Date().toISOString(),
      });
      setLastPing(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Simulation ping error:", err);
    }

    // 3-ping accumulator logic: increment pingNum. When ping reaches 3, advance to next stop
    if (state.pingNum >= 3) {
      state.stopIdx += 1;
      state.pingNum = 1;
    } else {
      state.pingNum += 1;
    }
  };

  const startSimulation = () => {
    if (!activeTrip) {
      alert("Please start the trip first!");
      return;
    }

    // Stop real GPS tracking if running
    stopGpsTracking();

    // Fallback stops (Route 2) if database hasn't loaded route stops yet
    const fallbackStops = [
      { name: 'Uzhavar Sandhai (Near Market Gate, Trichy Road)', latitude: 11.00210, longitude: 77.02050 },
      { name: 'Ramanathapuram (Near 80 Feet Road Signal)', latitude: 10.99350, longitude: 76.98920 },
      { name: 'Peelamedu (Near PSG Tech Bus Shelter)', latitude: 11.02420, longitude: 77.00280 },
      { name: 'Thanneer Panthal (Near VKG Bakery)', latitude: 11.03360, longitude: 77.01420 },
      { name: 'Cheran Ma Nagar (Near SBI ATM / Main Bus Stop)', latitude: 11.04890, longitude: 77.01250 },
      { name: 'Vilankurichi (Near Vinayagar Temple Bus Stop)', latitude: 11.05480, longitude: 77.00410 },
      { name: 'KCT Campus (Saravanampatti Main Gate)', latitude: 11.08270, longitude: 76.98980 },
    ];

    let activeStops = (routeStops && routeStops.length > 0)
      ? routeStops.filter(s => typeof s?.latitude === 'number' && typeof s?.longitude === 'number')
      : fallbackStops;

    // Ensure KCT Campus is included as the destination terminal
    const hasKct = activeStops.some(s => s.name?.toLowerCase().includes('kct') || s.name?.toLowerCase().includes('kumaraguru'));
    if (!hasKct) {
      activeStops = [
        ...activeStops,
        { name: 'KCT Campus (Saravanampatti Main Gate)', latitude: 11.08270, longitude: 76.98980 }
      ];
    }

    if (activeStops.length === 0) {
      alert("No stops found for this route.");
      return;
    }

    simulationStateRef.current = {
      stopIdx: 0,
      pingNum: 1,
      activeStops,
      currentTripId: activeTrip._id,
    };

    setIsSimulating(true);
    setIsPaused(false);
    setGpsError(false);

    // First ping immediately
    executeSimulationPing();

    // Then every 3 seconds (3 pings * 3s = 9s per stop)
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    simulationTimerRef.current = setInterval(executeSimulationPing, 3000);
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const pauseSimulation = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsPaused(true);
    setPausedSeconds(0);
    if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    pauseTimerRef.current = setInterval(() => {
      setPausedSeconds(s => s + 1);
    }, 1000);
  };

  const resumeSimulation = () => {
    if (!simulationStateRef.current?.activeStops?.length) return;
    setIsPaused(false);
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    // Send immediate ping on resume, then resume 3s interval
    executeSimulationPing();
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    simulationTimerRef.current = setInterval(executeSimulationPing, 3000);
  };

  // 5. Manual Location Fallback (Moves route and bus live)
  const handleManualLocation = async (e) => {
    e.preventDefault();

    const fallbackStops = [
      { name: 'Uzhavar Sandhai (Near Market Gate, Trichy Road)', latitude: 11.00210, longitude: 77.02050 },
      { name: 'Ramanathapuram (Near 80 Feet Road Signal)', latitude: 10.99350, longitude: 76.98920 },
      { name: 'Peelamedu (Near PSG Tech Bus Shelter)', latitude: 11.02420, longitude: 77.00280 },
      { name: 'Thanneer Panthal (Near VKG Bakery)', latitude: 11.03360, longitude: 77.01420 },
      { name: 'Cheran Ma Nagar (Near SBI ATM / Main Bus Stop)', latitude: 11.04890, longitude: 77.01250 },
      { name: 'Vilankurichi (Near Vinayagar Temple Bus Stop)', latitude: 11.05480, longitude: 77.00410 },
      { name: 'KCT Campus (Saravanampatti Main Gate)', latitude: 11.08270, longitude: 76.98980 },
    ];
    const availableStops = (routeStops && routeStops.length > 0) ? routeStops : fallbackStops;
    const stopObj = availableStops.find(s => String(s._id || s.name) === String(selectedManualStopId)) || availableStops[0];

    if (!stopObj) {
      alert("Please select a stop to update the bus location.");
      return;
    }

    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/location/manual`, {
        latitude: stopObj.latitude,
        longitude: stopObj.longitude,
        stopId: stopObj._id || null,
        stopName: stopObj.name,
        recordedAt: new Date().toISOString(),
      });

      // Advance simulator pointer to the selected stop so if simulation resumes, it proceeds from next stop
      const foundIdx = availableStops.findIndex(s => s.name === stopObj.name);
      if (foundIdx !== -1 && simulationStateRef.current) {
        simulationStateRef.current.stopIdx = Math.min(foundIdx + 1, availableStops.length - 1);
        simulationStateRef.current.pingNum = 1;
      }

      setLastPing(new Date().toLocaleTimeString());
      setDebugInfo({
        name: stopObj.name,
        lat: stopObj.latitude,
        lng: stopObj.longitude,
        ping: 3,
        currentStopNum: foundIdx !== -1 ? foundIdx + 1 : 1,
        totalStops: availableStops.length,
      });

      alert(`✅ Bus location successfully updated to: ${stopObj.name}!\nThe bus icon and route progress on the map have moved.`);
      setShowManualForm(false);
    } catch (err) {
      alert(err.message || 'Failed to report manual location');
    }
  };

  // 6. Report Delay
  const handleReportDelay = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/delay`, {
        updateType: 'delay',
        reason: delayReason || 'Traffic',
        expectedDelayMinutes: parseInt(delayMinutes, 10),
      });
      setShowDelayForm(false);
      setDelayMinutes('');
      setDelayReason('');
      alert("Delay broadcasted to students.");
    } catch (err) {
      alert(err.message || 'Failed to report delay');
    }
  };

  // 7. Handover to Vice
  const handleHandover = async () => {
    if (!window.confirm("Are you sure you want to handover control to the Vice Representative?")) return;
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/handovers`, {
        reason: "Primary rep requested handover"
      });
      alert("Handover requested. Waiting for Vice Rep to accept.");
      setShowHandoverModal(false);
      // Optionally stop GPS here, as the Vice must accept before they can track
      stopGpsTracking();
    } catch (err) {
      alert(err.message || 'Failed to request handover');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-emerald-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Representative Console</h1>
          <p className="text-sm text-slate-400">
            Assigned Bus: <span className="text-emerald-400 font-semibold">{assignedBus?.busNumber}</span>
          </p>
        </div>
        <div className="text-sm text-slate-400">Welcome, {user.name}</div>
      </div>

      {/* TRIP CONTROL CARD */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5 text-emerald-400" /> Trip Control
        </h2>

        {!activeTrip ? (
          <button
            onClick={handleStartTrip}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Play className="w-5 h-5" /> Start Trip
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-emerald-400 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Trip In Progress
                </p>
                <p className="text-xs text-slate-400 mt-1">Trip ID: {activeTrip._id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isSimulating ? (
                  <button onClick={startSimulation} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition shadow-lg shadow-purple-600/30">
                    <Play className="w-4 h-4" /> Simulate GPS
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {!isPaused ? (
                      <button onClick={pauseSimulation} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition shadow-lg shadow-amber-600/30">
                        <Pause className="w-4 h-4" /> Pause
                      </button>
                    ) : (
                      <button onClick={resumeSimulation} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 animate-pulse">
                        <Play className="w-4 h-4" /> Resume
                      </button>
                    )}
                    <button onClick={stopSimulation} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition">
                      <Square className="w-4 h-4" /> Stop
                    </button>
                  </div>
                )}

                {!isTracking ? (
                  <button onClick={startGpsTracking} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Start GPS
                  </button>
                ) : (
                  <button onClick={stopGpsTracking} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg flex items-center gap-2">
                    <Square className="w-4 h-4" /> Stop GPS
                  </button>
                )}
                <button onClick={() => setShowManualForm(!showManualForm)} className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-sm font-bold rounded-lg border border-blue-500/30 transition">
                  Manual Location
                </button>
                <button onClick={() => setShowHandoverModal(!showHandoverModal)} className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 text-sm font-bold rounded-lg border border-purple-500/30 transition">
                  Handover
                </button>
                <button onClick={handleEndTrip} className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 text-sm font-bold rounded-lg border border-rose-500/30 transition">
                  End Trip
                </button>
              </div>
            </div>

            {/* Live Status Indicators */}
            {isSimulating && (
              <div className={`text-sm flex flex-col md:flex-row md:items-center gap-2 ${isPaused ? 'text-amber-400' : 'text-purple-400'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-purple-400 animate-pulse'}`} />
                  {isPaused ? (
                    <span className="font-semibold">
                      Simulation Paused: <span className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">{formatSeconds(pausedSeconds)}</span> (Holding at Stop {debugInfo?.currentStopNum || ''}: {debugInfo?.name})
                    </span>
                  ) : (
                    <span>
                      Transmitting Simulation Telemetry... Last ping: {lastPing || 'Sending...'}
                    </span>
                  )}
                </div>
                {isPaused && (
                  <span className="text-xs text-slate-400">
                    {pausedSeconds < 180
                      ? `[Tier 2 Vice Rep claim in ${180 - pausedSeconds}s | Tier 3 Admin Alert in ${300 - pausedSeconds}s]`
                      : pausedSeconds < 300
                      ? `⚠️ [Tier 2 Failover Active — Vice Rep can claim now | Tier 3 in ${300 - pausedSeconds}s]`
                      : `🚨 [Tier 3 Telemetry Blackout Alert Active on Admin Dashboard]`}
                  </span>
                )}
              </div>
            )}

            {isTracking && (
              <div className="text-sm text-emerald-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Streaming GPS... Last ping: {lastPing || 'Waiting...'}
              </div>
            )}

            {gpsError && !showManualForm && (
              <div className="text-sm text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                GPS signal lost or permission denied. Please use Manual Location.
              </div>
            )}

            {/* Manual Fallback Form */}
            {showManualForm && (
              <form onSubmit={handleManualLocation} className="p-4 bg-[#0e192f] border border-[#1b2b4c] rounded-xl space-y-3">
                <p className="text-xs text-slate-300 font-semibold">Select Current Route Stop (Updates live bus coordinates & marks route progress):</p>
                <select
                  required
                  value={selectedManualStopId}
                  onChange={e => setSelectedManualStopId(e.target.value)}
                  className="w-full bg-[#0c162b] border border-[#1b2b4c] rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose Stop to Move Bus --</option>
                  {((routeStops && routeStops.length > 0) ? routeStops : [
                    { name: 'Uzhavar Sandhai (Near Market Gate, Trichy Road)', latitude: 11.00210, longitude: 77.02050 },
                    { name: 'Ramanathapuram (Near 80 Feet Road Signal)', latitude: 10.99350, longitude: 76.98920 },
                    { name: 'Peelamedu (Near PSG Tech Bus Shelter)', latitude: 11.02420, longitude: 77.00280 },
                    { name: 'Thanneer Panthal (Near VKG Bakery)', latitude: 11.03360, longitude: 77.01420 },
                    { name: 'Cheran Ma Nagar (Near SBI ATM / Main Bus Stop)', latitude: 11.04890, longitude: 77.01250 },
                    { name: 'Vilankurichi (Near Vinayagar Temple Bus Stop)', latitude: 11.05480, longitude: 77.00410 },
                    { name: 'KCT Campus (Saravanampatti Main Gate)', latitude: 11.08270, longitude: 76.98980 },
                  ]).map((s, idx) => (
                    <option key={s._id || s.name} value={s._id || s.name}>
                      Stop {idx + 1}: {s.name} ({s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition">
                    Move Bus to Selected Stop
                  </button>
                  <button type="button" onClick={() => setShowManualForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Handover Form */}
            {showHandoverModal && (
              <div className="p-4 bg-[#0e192f] border border-[#1b2b4c] rounded-xl space-y-3">
                <p className="text-xs text-slate-400">Transfer control to the Vice Representative. They must accept the request.</p>
                <div className="flex gap-2">
                  <button onClick={handleHandover} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4" /> Request Handover
                  </button>
                  <button type="button" onClick={() => setShowHandoverModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DELAY REPORTING CARD */}
      {activeTrip && (
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Report Delay
          </h2>

          {!showDelayForm ? (
            <button onClick={() => setShowDelayForm(true)} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold rounded-xl transition">
              Report Traffic or Delay
            </button>
          ) : (
            <form onSubmit={handleReportDelay} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Expected Delay (Minutes) *</label>
                <input type="number" required min="1" max="120" value={delayMinutes} onChange={e => setDelayMinutes(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason (Optional)</label>
                <input type="text" value={delayReason} onChange={e => setDelayReason(e.target.value)} placeholder="e.g. Heavy traffic" className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl">Broadcast Delay</button>
                <button type="button" onClick={() => setShowDelayForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* FLOATING TELEMETRY HUD (Simulation for Viva / External Examiners) */}
      {isSimulating && debugInfo && (
        <div className={`fixed bottom-6 right-6 bg-[#0a1222]/95 backdrop-blur-md border ${isPaused ? 'border-amber-500/50' : 'border-purple-500/50'} rounded-2xl p-4 shadow-2xl z-50 w-80 text-white transition-all`}>
          <div className="flex items-center justify-between border-b border-[#1b2b4c] pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${isPaused ? 'text-amber-400' : 'text-purple-400 animate-pulse'}`} />
              <span className={`text-xs font-bold tracking-wide uppercase ${isPaused ? 'text-amber-400' : 'text-purple-400'}`}>
                {isPaused ? 'Telemetry (PAUSED)' : 'GPS Telemetry HUD'}
              </span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
            }`}>
              {isPaused ? `⏸ Paused ${formatSeconds(pausedSeconds)}` : 'Demo Active'}
            </span>
          </div>

          {/* Live Paused Stopwatch for 3-minute failover demo */}
          {isPaused && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 mb-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  ⏱️ Hold Duration:
                </span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {formatSeconds(pausedSeconds)}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                {pausedSeconds < 180 ? (
                  <span>Countdown to 3m: <strong className="text-amber-400">{180 - pausedSeconds}s</strong> remaining until Tier 2 Vice Rep claim window unlocks.</span>
                ) : pausedSeconds < 300 ? (
                  <span className="text-amber-300 font-semibold">⚠️ 3+ min reached! Tier 2 Vice Rep takeover active. Admin 5m alert in {300 - pausedSeconds}s.</span>
                ) : (
                  <span className="text-rose-400 font-semibold">🚨 5+ min reached! Tier 3 Admin Critical Telemetry Alert active.</span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs">
            <div>
              <p className="text-[11px] text-slate-400">Target Stop ({debugInfo.currentStopNum}/{debugInfo.totalStops}):</p>
              <p className="font-semibold text-emerald-400 truncate">{debugInfo.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-[#0e192f] p-2 rounded-lg border border-[#1b2b4c]">
                <span className="text-[10px] text-slate-400 block">Latitude</span>
                <span className="font-mono text-emerald-400 font-semibold">{debugInfo.lat}</span>
              </div>
              <div className="bg-[#0e192f] p-2 rounded-lg border border-[#1b2b4c]">
                <span className="text-[10px] text-slate-400 block">Longitude</span>
                <span className="font-mono text-emerald-400 font-semibold">{debugInfo.lng}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">3-Sample Accumulator:</span>
              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Ping {debugInfo.ping} / 3 {debugInfo.ping === 3 ? '✓ Confirmed' : ''}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-1.5 w-full bg-[#16274a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${(debugInfo.ping / 3) * 100}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-500 mt-2 text-center font-mono truncate">
            POST /api/rep/trips/{activeTrip?._id?.slice(-8)}/location
          </p>
        </div>
      )}

    </div>
  );
}