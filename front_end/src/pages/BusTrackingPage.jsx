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

  // Extract stops safely from route
  const stopsList = (currentRoute?.stops || []).slice();
  if (stopsList.length > 0 && !stopsList.some((s) => s.name?.toLowerCase().includes('kct') || s.name?.toLowerCase().includes('kumaraguru'))) {
    stopsList.push({
      _id: 'kct-campus-terminal',
      name: 'KCT Campus (Saravanampatti Main Gate)',
      sequence: stopsList.length + 1,
      latitude: 11.08270,
      longitude: 76.98980,
    });
  }

  // Determine bus GPS coordinates safely with numerical validation
  const liveLat = Number(liveLocation?.latitude ?? liveLocation?.location?.latitude);
  const liveLng = Number(liveLocation?.longitude ?? liveLocation?.location?.longitude);
  const hasLiveCoords = !isNaN(liveLat) && !isNaN(liveLng) && liveLat !== 0 && liveLng !== 0;

  // How far along the route are we?
  let currentSeq = Number(liveLocation?.currentStopSequence || liveLocation?.location?.currentStopSequence || 0);

  // Auto-detect current stop sequence from live GPS coordinates if backend sequence is lagging or 0
  if (hasLiveCoords && stopsList.length > 0) {
    let closestIndex = -1;
    let minDistance = Infinity;

    stopsList.forEach((stop, idx) => {
      if (typeof stop?.latitude === 'number' && typeof stop?.longitude === 'number') {
        const dLat = (stop.latitude - liveLat) * 111000;
        const dLng = (stop.longitude - liveLng) * 111000 * Math.cos(liveLat * (Math.PI / 180));
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = idx;
        }
      }
    });

    if (closestIndex !== -1 && minDistance <= 350) {
      const detectedSeq = stopsList[closestIndex].sequence != null ? stopsList[closestIndex].sequence : (closestIndex + 1);
      if (detectedSeq > currentSeq) {
        currentSeq = detectedSeq;
      }
    }
  }

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

        {(() => {
          if (stopsList.length === 0) {
            return <p className="text-sm text-slate-500">No stops configured for this route.</p>;
          }

          return (
            <div className="relative pl-6 space-y-6">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-700" />
              {stopsList.map((stop, index) => {
                const seq = stop.sequence != null ? stop.sequence : index + 1;
                const isPassed = currentSeq > 0 && seq < currentSeq;
                const isCurrent = currentSeq > 0 && seq === currentSeq;
                const isNext = (currentSeq === 0 && seq === 1) || (currentSeq > 0 && seq === currentSeq + 1);

                return (
                  <div key={stop._id || index} className="relative">
                    <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-[#070d18] ${
                      isCurrent
                        ? 'border-emerald-400 shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400/30'
                        : isNext
                        ? 'border-cyan-400 shadow-md shadow-cyan-500/30'
                        : isPassed
                        ? 'border-slate-600'
                        : 'border-slate-700'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isCurrent
                          ? 'bg-emerald-400 animate-pulse'
                          : isNext
                          ? 'bg-cyan-400 animate-pulse'
                          : isPassed
                          ? 'bg-slate-600'
                          : 'bg-slate-700'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-bold ${
                          isCurrent
                            ? 'text-emerald-400'
                            : isNext
                            ? 'text-cyan-400'
                            : isPassed
                            ? 'text-slate-500'
                            : 'text-slate-300'
                        }`}>
                          {stop.name}
                        </h3>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Current Bus Location
                          </span>
                        )}
                        {isNext && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            Approaching
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isPassed
                          ? '✓ Passed'
                          : isCurrent
                          ? '📍 Bus is here'
                          : isNext
                          ? '→ Next Stop'
                          : 'Upcoming'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
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