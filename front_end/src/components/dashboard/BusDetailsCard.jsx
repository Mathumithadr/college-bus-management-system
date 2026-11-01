// BusDetailsCard — shows bus number, route, direction, On Time/Delayed status, and live speed from API
import React from 'react';
import { Bus } from 'lucide-react';

export default function BusDetailsCard({ busInfo, liveLocation }) {
  // busNumber comes from GET /api/student/bus response — fallback to "Loading..."
  const busNumber   = busInfo?.bus?.busNumber       || 'Loading...';
  const routeNumber = busInfo?.route?.routeNumber   || '—';
  const routeName   = busInfo?.route?.routeName     || '—';

  // delayStatus from GET /api/student/bus/location — determines badge color
  const delayStatus = liveLocation?.delayStatus || 'on_time';
  const speed       = liveLocation?.speed       ?? '—';

  // isDelayed drives the badge color (amber = delayed, emerald = on time)
  const isDelayed = delayStatus === 'delayed';

  return (
    <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl hover:border-emerald-500/30 transition">
      {/* Card header with bus icon and title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bus className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-base">Your Bus Details</h3>
        </div>
        {/* Chevron arrow — placeholder for navigating to a detailed bus page */}
        <span className="text-slate-400 text-lg">›</span>
      </div>

      {/* Content row: bus graphic thumbnail on left, status info on right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Bus thumbnail placeholder — amber colored bus icon in a dark rounded square */}
          <div className="w-16 h-16 rounded-2xl bg-[#121f3a] border border-[#1e345e] flex items-center justify-center text-amber-400 shadow-inner">
            <Bus className="w-9 h-9" />
          </div>

          <div>
            {/* Bus number from busInfo.bus.busNumber — primary bold identifier */}
            <div className="text-lg font-extrabold text-white">{busNumber}</div>
            {/* Route number from busInfo.route.routeNumber */}
            <div className="text-xs text-slate-300 font-medium mt-0.5">{routeNumber}</div>
            {/* Route name (e.g. "Tech Park → College") from busInfo.route.routeName */}
            <div className="text-xs text-slate-400 mt-0.5">{routeName}</div>
          </div>
        </div>

        {/* Right section: delay status badge and live speed reading */}
        <div className="text-right">
          {/* Status badge — green when on_time, amber when delayed */}
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
            isDelayed
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          }`}>
            {isDelayed ? 'Delayed' : 'On Time'}
          </span>

          {/* Speed reading from liveLocation.speed — updates every 5 seconds */}
          <div className="mt-2">
            <div className="text-[11px] text-slate-400 font-medium">Speed</div>
            <div className="text-sm font-bold text-white">{speed !== '—' ? `${speed} km/h` : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
