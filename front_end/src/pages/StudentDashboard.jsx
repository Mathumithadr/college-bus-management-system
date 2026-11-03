import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import WelcomeHeroCard from '../components/dashboard/WelcomeHeroCard';
import { MapPin, ArrowRight, Bus, Clock, AlertTriangle, Phone, UserCheck } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { busInfo, liveLocation, isStale } = useTracking();

  const currentBus = busInfo?.busId || busInfo?.bus;
  const currentRoute = busInfo?.routeId || busInfo?.route;
  const activeRep = busInfo?.representatives?.find(r => r.roleType === 'primary')?.representativeId;

  // Determine trip status
  const tripStarted = liveLocation && liveLocation.latitude;
  const tripFinished = liveLocation?.status === 'completed';

  return (
    <div className="space-y-6">
      <WelcomeHeroCard user={user} />

      {/* ==================== MAIN BUS CARD ==================== */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bus className="w-5 h-5 text-amber-400" /> My Bus Status
          </h2>
          {tripStarted && !isStale ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Tracking
            </span>
          ) : tripStarted && isStale ? (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/30">
              <AlertTriangle className="w-3 h-3" /> Stale Data
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-500/10 px-2 py-1 rounded-full border border-slate-500/30">
              <Clock className="w-3 h-3" /> Trip Not Started
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#0e192f] rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Assigned Bus</p>
            <p className="text-lg font-bold text-white">{currentBus?.busNumber || 'Loading...'}</p>
          </div>
          <div className="bg-[#0e192f] rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Route</p>
            <p className="text-lg font-bold text-white">{currentRoute?.routeNumber || 'Loading...'}</p>
          </div>
        </div>

        {/* Rep Contact Info */}
        {activeRep && (
          <div className="bg-[#0e192f] rounded-xl p-4 flex items-center justify-between border border-[#1b2b4c]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Bus Representative</p>
                <p className="text-sm font-bold text-white">{activeRep.name}</p>
              </div>
            </div>
            {activeRep.phone && (
              <a href={`tel:${activeRep.phone}`} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold rounded-lg transition">
                <Phone className="w-3.5 h-3.5" /> Call Rep
              </a>
            )}
          </div>
        )}

        {/* Live Tracking CTA */}
        <div className="mt-4">
          {tripStarted ? (
            <Link to="/tracking" className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition">
              View Live Map <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="text-center p-4 bg-slate-500/5 border border-slate-500/10 rounded-xl">
              <p className="text-sm text-slate-400">The bus hasn't started the trip yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== QUICK LINKS ==================== */}
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
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1">Report Issue</h3>
          <p className="text-xs text-slate-400">Submit a complaint or query</p>
        </Link>
      </div>
    </div>
  );
}