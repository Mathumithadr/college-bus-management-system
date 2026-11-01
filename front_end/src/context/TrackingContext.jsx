// TrackingContext — polls GET /api/student/bus/location every 5 seconds and shares live telemetry across all map components
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';
import { useAuth } from './AuthContext.jsx';

// Shared context so both the map and telemetry cards re-render from the same polling source
const TrackingContext = createContext(null);

// Poll interval in milliseconds — 5 seconds matches backend GPS accumulator cadence
const POLL_INTERVAL_MS = 5000;

export function TrackingProvider({ children }) {
  // busInfo holds route, stops, and representative contact from GET /api/student/bus
  const [busInfo, setBusInfo] = useState(null);

  // liveLocation holds GPS coordinates, speed, ETA, and staleness flag from GET /api/student/bus/location
  const [liveLocation, setLiveLocation] = useState(null);

  // trackingError holds the last API error so the map can show a warning instead of crashing
  const [trackingError, setTrackingError] = useState(null);

  // isStale shows a warning badge if the last GPS ping is older than 30 seconds
  const [isStale, setIsStale] = useState(false);

  const pollTimerRef = useRef(null);
  const { user } = useAuth();

  // fetchBusInfo — loads static bus and route assignment once at mount
  const fetchBusInfo = useCallback(async () => {
    try {
      const res = await axiosClient.get('/student/bus');
      // Normalize assignment, route, and bus objects from backend envelope
      const assignment = res.data?.assignment || res.assignment || res.data || {};
      const route = assignment.routeId || assignment.route || {};
      const bus = assignment.busId || assignment.bus || {};
      setBusInfo({ ...assignment, route, bus });
      setTrackingError(null);
    } catch (err) {
      // Log but don't crash — display a friendly message
      console.warn('[TrackingContext] Bus info lookup:', err?.message);
      setTrackingError(err?.message || 'Bus assignment currently unavailable');
    }
  }, []);

  // fetchLiveLocation — polls the backend GPS stream and updates map marker position
  const fetchLiveLocation = useCallback(async () => {
    try {
      const res = await axiosClient.get('/student/bus/location');
      // Extract location and status from backend payload
      const locData = res.data?.location || res.location || (res.data?.latitude ? res.data : null);
      const status = res.data?.locationStatus || res.locationStatus || 'UNAVAILABLE';
      const staleFlag = res.data?.isStale ?? res.isStale ?? false;

      // Only set liveLocation if valid coordinate data exists
      if (locData && typeof locData.latitude === 'number' && typeof locData.longitude === 'number') {
        setLiveLocation({ ...locData, locationStatus: status });
      } else {
        setLiveLocation(null);
      }

      setIsStale(staleFlag);
      setTrackingError(null);
    } catch (err) {
      // A single failed poll is normal (e.g. no active trip running)
      console.warn('[TrackingContext] Location poll note:', err?.message);
    }
  }, []);

  // Start polling on mount for students/representatives, stop when unmounting or on logout
  useEffect(() => {
    // Only students and representatives have assigned buses and access to /student/* endpoints
    const canPoll = user && (user.role === 'student' || user.permissions?.includes('representative'));
    if (!canPoll) return;

    // Load bus assignment data once
    fetchBusInfo();

    // Start live location polling cycle
    fetchLiveLocation();
    pollTimerRef.current = setInterval(fetchLiveLocation, POLL_INTERVAL_MS);

    return () => {
      // Clear interval timer to prevent memory leaks when navigating away
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [user, fetchBusInfo, fetchLiveLocation]);

  return (
    <TrackingContext.Provider value={{ busInfo, liveLocation, trackingError, isStale, refetch: fetchBusInfo }}>
      {children}
    </TrackingContext.Provider>
  );
}

// useTracking — hook for map and card components to access live telemetry
export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('[useTracking] Must be used inside <TrackingProvider>');
  return ctx;
}
