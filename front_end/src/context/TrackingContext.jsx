// TrackingContext — polls GET /api/student/bus/location every 30 seconds
// and shares live telemetry across all map components
// 
// NOTE: Route switching to "other routes" is currently not supported
// because the backend doesn't have a GET /api/student/routes endpoint.
// Students can only track their assigned bus.

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from './AuthContext';

const TrackingContext = createContext(null);
const POLL_INTERVAL_MS = 30000;   // 30 seconds, per your requirement

export function TrackingProvider({ children }) {
  const { user } = useAuth();
  
  // Static bus info (bus number, route, stops) — loaded once on mount
  const [busInfo, setBusInfo] = useState(null);
  
  // Live GPS location — updated every 30s
  const [liveLocation, setLiveLocation] = useState(null);
  
  // Error state if the bus fetch fails
  const [trackingError, setTrackingError] = useState(null);
  
  // Whether the last GPS update is older than 120s (backend flags this)
  const [isStale, setIsStale] = useState(false);
  
  // Timer reference for cleanup
  const pollTimerRef = useRef(null);

  // ─── Fetch Assigned Bus Info ────────────────────────────────
  // GET /api/student/bus → returns { bus, route, assignment }
  const fetchBusInfo = useCallback(async () => {
    try {
      const res = await axiosClient.get('/student/bus');
      const assignment = res.data?.assignment || res.assignment || res.data || res;
      setBusInfo(assignment);
      setTrackingError(null);
    } catch (err) {
      setTrackingError(err?.message || 'Bus assignment unavailable');
    }
  }, []);

  // ─── Fetch Live Location ────────────────────────────────────
  // GET /api/student/bus/location → returns { latitude, longitude, isStale, ... }
  const fetchLiveLocation = useCallback(async () => {
    try {
      const res = await axiosClient.get('/student/bus/location');
      const locData = res.data?.location || res.location || (res.data?.latitude ? res.data : null);
      
      if (locData && typeof locData.latitude === 'number') {
        setLiveLocation(locData);
      }
      
      // Backend returns isStale flag based on 120s threshold
      setIsStale(res.data?.isStale ?? res.isStale ?? false);
    } catch (err) {
      // Silent — this happens normally when no active trip is running
    }
  }, []);

  // ─── Poll Setup ─────────────────────────────────────────────
  // Only poll for students (including reps — they're students + permissions)
  useEffect(() => {
    const canPoll = user && user.role === 'student';
    if (!canPoll) return;

    fetchBusInfo();
    fetchLiveLocation();
    pollTimerRef.current = setInterval(fetchLiveLocation, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [user, fetchBusInfo, fetchLiveLocation]);

  return (
    <TrackingContext.Provider value={{
      busInfo,
      liveLocation,
      trackingError,
      isStale,
      refetch: fetchBusInfo,
    }}>
      {children}
    </TrackingContext.Provider>
  );
}

// Hook that any component uses to access tracking state
export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used inside <TrackingProvider>');
  return ctx;
}