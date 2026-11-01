// RepresentativeConsole — trip cockpit for Primary/Vice reps: start/end trip, GPS stream, delay broadcast, handover
import React, { useState, useEffect } from 'react';
import { Bus, MapPin, AlertCircle, CheckCircle, Radio, ArrowRightLeft } from 'lucide-react';
import axiosClient from '../api/axiosClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function RepresentativeConsole() {
  const { user } = useAuth();

  // activeTrip holds the current in-progress trip from GET /api/rep/trips/active
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // GPS streaming state — browser Geolocation API provides coordinates
  const [streaming, setStreaming] = useState(false);
  const [streamWatchId, setStreamWatchId] = useState(null);

  // Delay modal state
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayMinutes, setDelayMinutes]     = useState('');
  const [delayReason, setDelayReason]       = useState('');

  // Fetch the active trip for this representative on mount
  useEffect(() => {
    const fetchActiveTrip = async () => {
      try {
        const res = await axiosClient.get('/rep/trips/active');
        setActiveTrip(res.data?.activeTrip || null);
      } catch {
        // No active trip is normal — not an error
      } finally {
        setLoading(false);
      }
    };
    fetchActiveTrip();
  }, []);

  // handleStartTrip — calls POST /api/rep/buses/:busId/trips/start to begin transit
  const handleStartTrip = async () => {
    // busId comes from the representative's assignment stored in the user profile
    const busId = user?.assignedBusId;
    if (!busId) { setError('No bus assigned. Contact admin.'); return; }
    setError('');
    try {
      const res = await axiosClient.post(`/rep/buses/${busId}/trips/start`, { tripType: 'morning', initialStopSequence: 1 });
      setActiveTrip(res.data?.trip);
      setSuccess('Trip started successfully!');
    } catch (err) {
      setError(err?.message || 'Failed to start trip.');
    }
  };

  // handleEndTrip — calls POST /api/rep/trips/:tripId/end to complete the trip atomically
  const handleEndTrip = async () => {
    if (!activeTrip) return;
    setError('');
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/end`);
      setActiveTrip(null);
      setSuccess('Trip ended successfully.');
    } catch (err) {
      setError(err?.message || 'Failed to end trip.');
    }
  };

  // startGpsStream — uses browser Geolocation to watch position and POST to /api/rep/trips/:tripId/location
  const startGpsStream = () => {
    if (!activeTrip || !navigator.geolocation) {
      setError('Geolocation is not available on this device.');
      return;
    }
    setStreaming(true);
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await axiosClient.post(`/rep/trips/${activeTrip._id}/location`, {
            latitude:     pos.coords.latitude,
            longitude:    pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
            speed:        pos.coords.speed || 0,
            recordedAt:   new Date().toISOString(),
          });
        } catch {
          // Single failed GPS post is acceptable; streaming continues
        }
      },
      (err) => {
        setError('GPS permission denied or unavailable.');
        setStreaming(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    setStreamWatchId(id);
  };

  // stopGpsStream — clears the Geolocation watch and stops sending coordinates
  const stopGpsStream = () => {
    if (streamWatchId) navigator.geolocation.clearWatch(streamWatchId);
    setStreaming(false);
    setStreamWatchId(null);
  };

  // handleDelay — broadcasts trip delay via POST /api/rep/trips/:tripId/delay
  const handleDelay = async () => {
    if (!activeTrip || !delayMinutes) return;
    try {
      await axiosClient.post(`/rep/trips/${activeTrip._id}/delay`, {
        expectedDelayMinutes: parseInt(delayMinutes, 10),
        reason: delayReason,
      });
      setSuccess(`Delay of ${delayMinutes} min broadcasted. Students will be notified.`);
      setShowDelayModal(false);
      setDelayMinutes('');
      setDelayReason('');
    } catch (err) {
      setError(err?.message || 'Failed to broadcast delay.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Radio className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-extrabold text-white">Representative Transit Console</h1>
      </div>

      {/* Alerts */}
      {error   && <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* TRIP CONTROL CARD */}
          <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
            <h2 className="font-bold text-white text-base mb-4">Trip Control</h2>
            {activeTrip ? (
              <div className="space-y-3">
                {/* Active trip info */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                  <div className="text-sm font-bold text-emerald-400">Trip in Progress</div>
                  <div className="text-xs text-slate-400 mt-0.5">Trip ID: {activeTrip._id?.slice(-8)}</div>
                  <div className="text-xs text-slate-400">Stop {activeTrip.currentStopSequence} · {activeTrip.delayStatus === 'delayed' ? '⚠ Delayed' : '✓ On Time'}</div>
                </div>
                <button onClick={handleEndTrip} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-xl transition">
                  End Trip
                </button>
              </div>
            ) : (
              <button onClick={handleStartTrip} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition">
                Start Morning Trip
              </button>
            )}
          </div>

          {/* GPS STREAMING CARD */}
          {activeTrip && (
            <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
              <h2 className="font-bold text-white text-base mb-4">Live GPS Streaming</h2>
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${streaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-sm text-slate-300">{streaming ? 'Streaming GPS to server...' : 'GPS stream is paused'}</span>
                {streaming ? (
                  <button onClick={stopGpsStream} className="ml-auto px-4 py-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 text-sm font-semibold rounded-xl transition">
                    Stop Stream
                  </button>
                ) : (
                  <button onClick={startGpsStream} className="ml-auto px-4 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 text-sm font-semibold rounded-xl transition">
                    Start Stream
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DELAY BROADCAST CARD */}
          {activeTrip && (
            <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
              <h2 className="font-bold text-white text-base mb-4">Broadcast Delay</h2>
              {!showDelayModal ? (
                <button onClick={() => setShowDelayModal(true)} className="px-5 py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 font-semibold text-sm rounded-xl transition">
                  Report Delay
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Minutes input — sends expectedDelayMinutes to POST /api/rep/trips/:id/delay */}
                  <input type="number" min="1" max="120" placeholder="Delay in minutes..."
                    value={delayMinutes} onChange={(e) => setDelayMinutes(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500" />
                  <input type="text" placeholder="Reason (e.g. highway traffic)..."
                    value={delayReason} onChange={(e) => setDelayReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500" />
                  <div className="flex gap-3">
                    <button onClick={handleDelay} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-xl transition">
                      Broadcast
                    </button>
                    <button onClick={() => setShowDelayModal(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm rounded-xl transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
