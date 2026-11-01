import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { Play, Square, MapPin, AlertTriangle, Radio, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function RepresentativeConsole() {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  // GPS State
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);
  const [lastPing, setLastPing] = useState(null);

  // Delay State
  const [delayMinutes, setDelayMinutes] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [showDelayForm, setShowDelayForm] = useState(false);

  // Fetch active trip on mount
  useEffect(() => {
    const fetchActiveTrip = async () => {
      try {
        // Assuming the backend might have a route to check active trip, 
        // or we check the rep's bus state. 
        // For now, we'll rely on local state after starting, 
        // but in production, you'd fetch: GET /api/rep/buses/:busId/state
        setLoading(false);
      } catch (error) {
        console.error("Failed to load state", error);
        setLoading(false);
      }
    };
    fetchActiveTrip();
  }, []);

  const handleStartTrip = async () => {
    try {
      // Note: Need the busId. In your backend, a rep is assigned to a bus. 
      // In a real app, you'd fetch the rep's active assignment first.
      // For this example, we assume we have the busId or the backend resolves it.
      const busId = user.assignedBusId || "REPLACE_WITH_ACTUAL_BUS_ID";

      const res = await axiosClient.post(`/rep/buses/${busId}/trips/start`);
      setActiveTrip(res.data.trip);
    } catch (err) {
      alert(err.message || 'Failed to start trip');
    }
  };

  const handleEndTrip = async () => {
    if (!window.confirm("Are you sure you want to end this trip?")) return;

    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/end`);
      stopGpsTracking();
      setActiveTrip(null);
    } catch (err) {
      alert(err.message || 'Failed to end trip');
    }
  };

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
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
        }
      },
      (error) => {
        console.error("GPS Error:", error);
        alert("Please enable location permissions.");
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

  const handleReportDelay = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/delay`, {
        reason: delayReason,
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

  if (loading) return <div className="text-white p-10">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Representative Console</h1>
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
            <Play className="w-5 h-5" /> Start Morning Trip
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-emerald-400 font-semibold">Trip In Progress</p>
                <p className="text-xs text-slate-400 mt-1">ID: {activeTrip._id}</p>
              </div>
              <div className="flex gap-2">
                {!isTracking ? (
                  <button onClick={startGpsTracking} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Start GPS
                  </button>
                ) : (
                  <button onClick={stopGpsTracking} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg flex items-center gap-2">
                    <Square className="w-4 h-4" /> Stop GPS
                  </button>
                )}
                <button onClick={handleEndTrip} className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 text-sm font-bold rounded-lg border border-rose-500/30 transition">
                  End Trip
                </button>
              </div>
            </div>

            {isTracking && (
              <div className="text-sm text-emerald-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Streaming GPS... Last ping: {lastPing || 'Waiting...'}
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
                <label className="block text-xs text-slate-400 mb-1">Expected Delay (Minutes)</label>
                <input type="number" required min="1" max="120" value={delayMinutes} onChange={e => setDelayMinutes(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason (Optional)</label>
                <input type="text" value={delayReason} onChange={e => setDelayReason(e.target.value)} placeholder="e.g. Heavy traffic" className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl">Broadcast</button>
                <button type="button" onClick={() => setShowDelayForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  );
}