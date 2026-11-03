import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Bus, MapPin, User } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export default function AdminLateBusesPage() {
  const [lateBuses, setLateBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLateBuses = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axiosClient.get('/admin/late-buses');
        setLateBuses(res.data?.lateBuses || res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load late buses');
      } finally {
        setLoading(false);
      }
    };
    fetchLateBuses();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber-400" /> Late Buses
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          All buses with currently reported delays.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {loading && <div className="text-slate-400 py-10 text-center">Loading...</div>}

      {!loading && lateBuses.length === 0 && (
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-12 text-center">
          <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Late Buses</h2>
          <p className="text-sm text-slate-400">
            All buses are currently running on time.
          </p>
        </div>
      )}

      {!loading && lateBuses.length > 0 && (
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">
            {lateBuses.length} Late {lateBuses.length === 1 ? 'Bus' : 'Buses'}
          </h2>

          <div className="space-y-3">
            {lateBuses.map((trip) => (
              <div key={trip._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Bus className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {trip.busId?.busNumber || 'Unknown Bus'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {trip.routeId?.routeName || 'Unknown Route'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    DELAYED
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 mb-1">Reporter</p>
                    <p className="text-white font-medium flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {trip.activeRepresentativeId?.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Started At</p>
                    <p className="text-white font-medium">
                      {trip.startTime ? new Date(trip.startTime).toLocaleTimeString() : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Last Stop</p>
                    <p className="text-white font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {trip.lastConfirmedStopName || 'Not reported'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}