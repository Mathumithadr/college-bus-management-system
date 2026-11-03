// BusTrackingPage — Shows the student's assigned bus, route timeline, and live position.
// 
// NOTE: Route switching to other routes is not supported in the current backend.
// Only the student's assigned route is displayed.

import React from 'react';
import { useTracking } from '../context/TrackingContext';
import { MapPin, AlertTriangle, Navigation, Clock } from 'lucide-react';
import LiveMapCard from '../components/dashboard/LiveMapCard';

export default function BusTrackingPage() {
  const { busInfo, liveLocation, isStale } = useTracking();

  // Route information (from busInfo)
  const currentRoute = busInfo?.routeId || busInfo?.route;
  const currentBus = busInfo?.busId || busInfo?.bus;

  // How far along the route are we?
  const currentSeq = liveLocation?.currentStopSequence || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ===== PAGE HEADER ===== */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-emerald-400" /> Bus Tracking
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {currentBus?.busNumber && currentRoute?.routeNumber
            ? `Tracking ${currentBus.busNumber} on ${currentRoute.routeNumber} - ${currentRoute.routeName}`
            : 'Loading your bus details...'}
        </p>
      </div>

      {/* ===== STALE DATA WARNING ===== */}
      {/* Displayed when the backend flags isStale (GPS > 120s old) */}
      {isStale && (
        <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Warning: Location data is over 2 minutes old. The bus may have moved.</span>
        </div>
      )}

      {/* ===== MANUAL LOCATION WARNING ===== */}
      {/* Displayed when the rep manually reported location (GPS unavailable) */}
      {liveLocation?.source === 'manual' && (
        <div className="flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 text-sm text-blue-400">
          <Navigation className="w-4 h-4 shrink-0" />
          <span>Location was manually reported by the representative (GPS unavailable).</span>
        </div>
      )}

      {/* ===== LIVE MAP ===== */}
      <LiveMapCard busInfo={currentRoute} liveLocation={liveLocation} />

      {/* ===== TEXTUAL TIMELINE ===== */}
      {/* Route Progress Section */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-400" /> Route Progress
        </h2>

        {!currentRoute?.stops || currentRoute.stops.length === 0 ? (
          <p className="text-sm text-slate-500">No stops configured for this route.</p>
        ) : (
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-700" />
            {currentRoute.stops.map((stop, index) => {
              const isPassed = stop.sequence < currentSeq;
              const isNear = stop.sequence === currentSeq + 1;
              const isFirst = stop.sequence === 1;

              return (
                <div key={stop._id || index} className="relative">
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-[#070d18] ${isPassed ? 'border-slate-600' : isNear || (currentSeq === 0 && isFirst) ? 'border-emerald-400 shadow-lg shadow-emerald-500/40' : 'border-slate-700'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${isPassed ? 'bg-slate-600' : isNear || (currentSeq === 0 && isFirst) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'
                      }`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isPassed ? 'text-slate-500' : isNear || (currentSeq === 0 && isFirst) ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {stop.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isPassed ? '✓ Passed' : isNear || (currentSeq === 0 && isFirst) ? '→ Next Stop' : 'Upcoming'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ===== LAST UPDATE TIME ===== */}
      {liveLocation?.recordedAt && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          Last GPS update: {new Date(liveLocation.recordedAt).toLocaleTimeString()}
        </div>
      )}

    </div>
  );
}