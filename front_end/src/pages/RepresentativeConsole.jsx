import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import {
  Play, Square, MapPin, AlertTriangle, Radio,
  ShieldAlert, CheckCircle2, UserCheck, RefreshCw
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
  const [showManualForm, setShowManualForm] = useState(false);

  // Delay State
  const [delayMinutes, setDelayMinutes] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [showDelayForm, setShowDelayForm] = useState(false);

  // Handover State
  const [showHandoverModal, setShowHandoverModal] = useState(false);

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
    // Cleanup GPS on unmount
    return () => stopGpsTracking();
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

  // 5. Manual Location Fallback
  const handleManualLocation = async (e) => {
    e.preventDefault();
    if (!manualStop) return;

    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/location/manual`, {
        latitude: 0, // Optional if stopName is provided, backend relies on stopName
        longitude: 0,
        recordedAt: new Date().toISOString(),
        stopName: manualStop
      });
      alert("Manual location reported successfully.");
      setManualStop('');
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
                <p className="text-xs text-slate-400">Select the stop you are currently at (Fallback for GPS failure):</p>
                <input
                  type="text"
                  required
                  placeholder="Enter Stop Name (e.g., Central Gate)"
                  value={manualStop}
                  onChange={e => setManualStop(e.target.value)}
                  className="w-full bg-[#0c162b] border border-[#1b2b4c] rounded-lg px-3 py-2 text-white text-sm"
                />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm">Submit Location</button>
                  <button type="button" onClick={() => setShowManualForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
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

    </div>
  );
}