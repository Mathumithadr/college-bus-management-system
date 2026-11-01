import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import WelcomeHeroCard from '../components/dashboard/WelcomeHeroCard';
import { MapPin, ArrowRight, Bus, Clock, AlertTriangle } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { busInfo, liveLocation, isStale } = useTracking();

  // Determine how many stops away based on backend data
  const currentSeq = liveLocation?.currentStopSequence || 0;
  const totalStops = busInfo?.routeId?.stops?.length || 0;
  const stopsRemaining = Math.max(0, totalStops - currentSeq);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Welcome Banner */}
      <WelcomeHeroCard user={user} />

      {/* 2. Quick Status Card */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bus className="w-5 h-5 text-amber-400" /> My Bus Status
          </h2>
          {isStale ? (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/30">
              <AlertTriangle className="w-3 h-3" /> Stale Data
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30">
              <Clock className="w-3 h-3" /> Live
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0e192f] rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Assigned Bus</p>
            <p className="text-lg font-bold text-white">{busInfo?.busId?.busNumber || 'Loading...'}</p>
          </div>
          <div className="bg-[#0e192f] rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Route</p>
            <p className="text-lg font-bold text-white">{busInfo?.routeId?.routeNumber || 'Loading...'}</p>
          </div>
        </div>

        {liveLocation ? (
          <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-semibold">
                {liveLocation.lastConfirmedStopName
                  ? `Last confirmed: ${liveLocation.lastConfirmedStopName}`
                  : 'Tracking in progress...'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {stopsRemaining > 0
                  ? `${stopsRemaining} stop${stopsRemaining > 1 ? 's' : ''} remaining`
                  : 'Approaching final stop'}
              </p>
            </div>
            <Link
              to="/tracking"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition"
            >
              View Details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-slate-500/5 border border-slate-500/20 rounded-xl text-center">
            <p className="text-sm text-slate-400">No active trip currently.</p>
            <Link
              to="/tracking"
              className="text-xs text-emerald-400 hover:underline mt-1 inline-block"
            >
              Open Live Tracking
            </Link>
          </div>
        )}
      </div>

      {/* 3. Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/tracking" className="bg-[#0c162b] border border-[#16274a] hover:border-emerald-500/50 rounded-2xl p-5 transition group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1">Live Tracking</h3>
          <p className="text-xs text-slate-400">See route timeline and bus position</p>
        </Link>

        <Link to="/attendance" className="bg-[#0c162b] border border-[#16274a] hover:border-amber-500/50 rounded-2xl p-5 transition group">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1">Attendance</h3>
          <p className="text-xs text-slate-400">Request exemption for delays</p>
        </Link>

        <Link to="/reports" className="bg-[#0c162b] border border-[#16274a] hover:border-blue-500/50 rounded-2xl p-5 transition group">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Bus className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1">Report Issue</h3>
          <p className="text-xs text-slate-400">Submit a complaint or query</p>
        </Link>
      </div>
    </div>
  );
}