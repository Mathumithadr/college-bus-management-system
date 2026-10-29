// StudentDashboard — the primary page matching the approved dark UI template: welcome card, live map, bus details, next stop
import React, { useState } from 'react';
import { useTracking } from '../context/TrackingContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { MapPin, Bus, Calendar, AlertCircle } from 'lucide-react';
import WelcomeHeroCard from '../components/dashboard/WelcomeHeroCard.jsx';
import LiveMapCard from '../components/dashboard/LiveMapCard.jsx';
import BusDetailsCard from '../components/dashboard/BusDetailsCard.jsx';
import NextStopCard from '../components/dashboard/NextStopCard.jsx';

export default function StudentDashboard() {
  const { user } = useAuth();
  // Consume live telemetry from the polling context — no extra API calls needed here
  const { busInfo, liveLocation, trackingError, isStale } = useTracking();

  return (
    // Outer wrapper — vertical stack of dashboard sections with consistent gap
    <div className="space-y-5">

      {/* WELCOME HERO CARD — shows greeting, student name, and today's date badge */}
      <WelcomeHeroCard user={user} />

      {/* STALENESS WARNING — shown when no GPS ping received for >30 seconds */}
      {isStale && (
        <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Last GPS update was more than 30 seconds ago. Location may be inaccurate.</span>
        </div>
      )}

      {/* TRACKING ERROR ALERT — shown when the backend /api/student/bus/location call fails */}
      {trackingError && !liveLocation && (
        <div className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Could not load live tracking data. {trackingError}</span>
        </div>
      )}

      {/* LIVE MAP CARD — interactive Leaflet map with route polyline and pulsing bus marker */}
      <LiveMapCard busInfo={busInfo} liveLocation={liveLocation} />

      {/* BOTTOM ROW — bus details and next stop displayed side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* BUS DETAILS CARD — number, route, status badge, speed from GET /api/student/bus & /location */}
        <BusDetailsCard busInfo={busInfo} liveLocation={liveLocation} />

        {/* NEXT STOP CARD — vertical timeline stepper for upcoming stops from liveLocation */}
        <NextStopCard liveLocation={liveLocation} busInfo={busInfo} />
      </div>
    </div>
  );
}
