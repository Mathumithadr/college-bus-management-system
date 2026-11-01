// NextStopCard — vertical timeline stepper showing current target stop and remaining upcoming stops
import React from 'react';
import { MapPin } from 'lucide-react';

export default function NextStopCard({ liveLocation, busInfo }) {
  // currentStop is the next stop the bus is approaching (from GET /api/student/bus/location)
  const currentStop = liveLocation?.currentStop || null;

  // nextStop is the one after currentStop (e.g. Campus North after Tech Park Gate)
  const nextStop = liveLocation?.nextStop || null;

  // Fallback stop names from route definition if live data not yet loaded
  const stops = busInfo?.route?.stops?.slice().sort((a, b) => a.sequence - b.sequence) || [];

  // Build display items from live telemetry or fall back to the static route stop list
  const displayStops = currentStop
    ? [
        { name: currentStop.name, eta: currentStop.etaMinutes, km: currentStop.distanceKm, active: true  },
        { name: nextStop?.name,   eta: nextStop?.etaMinutes,   km: nextStop?.distanceKm,   active: false },
      ].filter((s) => s.name)
    : stops.slice(0, 2).map((s, i) => ({
        name: s.stopName, eta: null, km: null, active: i === 0,
      }));

  return (
    <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl hover:border-emerald-500/30 transition">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-base">Next Stop</h3>
        </div>
        <span className="text-slate-400 text-lg">›</span>
      </div>

      {/* Vertical stepper timeline — each stop is a circle node on a vertical line */}
      <div className="space-y-4 relative pl-7">
        {/* Vertical connecting line drawn behind all nodes */}
        <div className="absolute left-2.5 top-2 bottom-2 w-[2px] bg-slate-700" />

        {displayStops.map((stop, idx) => (
          <div key={idx} className="relative">
            {/* Active stop gets a glowing double-ring emerald node; upcoming stops get hollow gray */}
            <div className={`absolute -left-7 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              stop.active
                ? 'border-emerald-400 bg-[#070d18] shadow-lg shadow-emerald-500/40'
                : 'border-slate-600 bg-[#070d18]'
            }`}>
              <div className={`w-2 h-2 rounded-full ${stop.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </div>

            {/* Stop name and ETA/distance details */}
            <div className={idx > 0 ? 'pt-1' : ''}>
              <div className={`text-sm font-bold ${stop.active ? 'text-white' : 'text-slate-300'}`}>
                {stop.name || 'Loading...'}
              </div>
              {/* Show ETA and distance if live data is available */}
              {stop.eta !== null && stop.km !== null ? (
                <div className={`text-xs mt-0.5 ${stop.active ? 'text-slate-400' : 'text-slate-500'}`}>
                  ~ {stop.eta} min ({stop.km} km)
                </div>
              ) : (
                <div className="text-xs text-slate-500 mt-0.5">Awaiting live data...</div>
              )}
            </div>
          </div>
        ))}

        {/* Empty state when no stops are available at all */}
        {displayStops.length === 0 && (
          <p className="text-sm text-slate-500">No stop data available yet.</p>
        )}
      </div>
    </div>
  );
}
