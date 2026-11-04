// Location tracking service: query-derived 3-sample accumulator (no in-memory state)
import Trip from '../../models/Trip.js';
import Route from '../../models/Route.js';
import Stop from '../../models/Stop.js';
import BusLocationUpdate from '../../models/BusLocationUpdate.js';
import TripEvent from '../../models/TripEvent.js';
import { haversineMeters } from '../../utils/haversine.js';
import { getLocationStatus } from '../../utils/staleness.js';
import { GPS } from '../../config/constants.js';
import {
  noActiveTripError,
  locationTimestampError,
  stateConflictError,
} from '../../utils/errors.js';

// Derive the current consecutive-streak count from DB rows, not from process memory
const deriveStreak = async (tripId, nextStop) => {
  if (!nextStop || typeof nextStop.latitude !== 'number' || typeof nextStop.longitude !== 'number') {
    return 0;
  }
  const recent = await BusLocationUpdate
    .find({ tripId, source: 'gps' })
    .sort({ recordedAt: -1 })
    .limit(GPS.STREAK_REQUIRED + 5);

  let streak = 0;
  for (const reading of recent) {
    const distance = haversineMeters(
      reading.latitude, reading.longitude,
      nextStop.latitude, nextStop.longitude
    );
    const isGood = (reading.accuracyMeters != null ? reading.accuracyMeters : Infinity) <= GPS.GOOD_ACCURACY_M;
    const inRadius = distance <= 150; // 150m urban tolerance
    if (isGood && inRadius) {
      streak += 1;
    } else {
      const acc = reading.accuracyMeters != null ? reading.accuracyMeters : 0;
      const isHold =
        acc > GPS.GOOD_ACCURACY_M &&
        acc <= GPS.HOLD_ACCURACY_M &&
        inRadius;
      if (!isHold) break;
    }
  }
  return streak;
};

// Ingest a GPS telemetry point and evaluate the query-derived accumulator
export const processGpsPing = async ({ tripId, busId, repId, latitude, longitude, accuracyMeters, recordedAt }) => {
  const now = Date.now();
  const recorded = new Date(recordedAt).getTime();
  if (recorded > now + 30_000) throw locationTimestampError('recordedAt cannot be in the future');
  if (now - recorded > 300_000) throw locationTimestampError('recordedAt is too old (> 5 minutes)');

  const trip = await Trip.findById(tripId);
  if (!trip) throw noActiveTripError();
  if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');

  const latest = await BusLocationUpdate.findOne({ tripId }).sort({ recordedAt: -1 });
  if (latest && new Date(recordedAt).getTime() <= new Date(latest.recordedAt).getTime()) {
    throw locationTimestampError('recordedAt must be strictly newer than latestRecordedAt');
  }

  const saved = await BusLocationUpdate.create({
    tripId, busId, representativeId: repId,
    latitude, longitude,
    source: 'gps',
    accuracyMeters: accuracyMeters != null ? accuracyMeters : null,
    recordedAt: new Date(recordedAt),
  });

  // Update telemetry status on every valid GPS ping
  await Trip.findByIdAndUpdate(tripId, {
    telemetryStatus: 'ACTIVE',
    lastPingAt: new Date(),
  });

  const route = await Route.findById(trip.routeId).populate('stops');
  const stops = (route?.stops || []).map((s, idx) => ({
    sequence: s.sequence != null ? s.sequence : idx + 1,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    _id: s._id,
  }));

  // Check if bus is near ANY stop ahead on the route
  let matchedStop = null;
  let minDistance = Infinity;

  for (const s of stops) {
    if (typeof s.latitude === 'number' && typeof s.longitude === 'number') {
      const d = haversineMeters(latitude, longitude, s.latitude, s.longitude);
      if (d < minDistance) {
        minDistance = d;
      }
      if (d <= 150 && s.sequence > (trip.currentStopSequence || 0)) {
        if (!matchedStop || s.sequence > matchedStop.sequence) {
          matchedStop = s;
        }
      }
    }
  }

  if (matchedStop) {
    const streak = await deriveStreak(tripId, matchedStop);
    if (streak >= 1 || (accuracyMeters != null && accuracyMeters <= GPS.GOOD_ACCURACY_M)) {
      await Trip.findByIdAndUpdate(tripId, {
        currentStopSequence: matchedStop.sequence,
        lastConfirmedStopName: matchedStop.name,
        nearStopOrder: matchedStop.sequence + 1,
        gpsQuality: 'GOOD',
      });
      await TripEvent.create({
        tripId,
        eventType: 'stop_confirmed',
        actorId: repId,
        details: { stopSequence: matchedStop.sequence, stopName: matchedStop.name, method: 'gps_accumulator' },
      });
      return { locationId: saved._id, accumulatorResult: 'STOP_CONFIRMED', streakCount: streak, stopSequence: matchedStop.sequence, stopName: matchedStop.name };
    }
  }

  const nextStop = stops.find((s) => s.sequence === (trip.currentStopSequence || 0) + 1);

  if (!nextStop) {
    return { locationId: saved._id, accumulatorResult: 'NO_NEXT_STOP', streakCount: 0 };
  }

  const distance = haversineMeters(latitude, longitude, nextStop.latitude, nextStop.longitude);
  const inRadius = distance <= 150;

  if (!inRadius || (accuracyMeters != null ? accuracyMeters : Infinity) > GPS.HOLD_ACCURACY_M) {
    return { locationId: saved._id, accumulatorResult: 'RESET', streakCount: 0 };
  }

  const acc = accuracyMeters != null ? accuracyMeters : 0;
  if (acc > GPS.GOOD_ACCURACY_M && acc <= GPS.HOLD_ACCURACY_M) {
    const streak = await deriveStreak(tripId, nextStop);
    return { locationId: saved._id, accumulatorResult: 'HOLD', streakCount: streak };
  }

  const streak = await deriveStreak(tripId, nextStop);
  if (streak >= GPS.STREAK_REQUIRED) {
    await Trip.findByIdAndUpdate(tripId, {
      currentStopSequence: nextStop.sequence,
      lastConfirmedStopName: nextStop.name,
      nearStopOrder: nextStop.sequence + 1,
      gpsQuality: 'GOOD',
    });
    await TripEvent.create({
      tripId,
      eventType: 'stop_confirmed',
      actorId: repId,
      details: { stopSequence: nextStop.sequence, stopName: nextStop.name, method: 'gps_accumulator' },
    });
    return { locationId: saved._id, accumulatorResult: 'STOP_CONFIRMED', streakCount: 0 };
  }

  return { locationId: saved._id, accumulatorResult: 'STREAK_' + streak, streakCount: streak };
};

// Record manual location update; requires stopId or stopName for reliability
export const processManualLocation = async ({ tripId, busId, repId, latitude, longitude, recordedAt, stopId, stopName }) => {
  if (!stopId && !stopName) throw stateConflictError('Manual location requires stopId or stopName');

  const trip = await Trip.findById(tripId);
  if (!trip) throw noActiveTripError();
  if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');

  const route = await Route.findById(trip.routeId).populate('stops');
  let targetStop = null;
  let targetSeq = (trip.currentStopSequence || 0) + 1;

  if (route && route.stops && route.stops.length > 0) {
    if (stopId) {
      targetStop = route.stops.find(s => String(s._id) === String(stopId));
    }
    if (!targetStop && stopName) {
      targetStop = route.stops.find(s => s.name?.toLowerCase().trim() === stopName.toLowerCase().trim() || s.name?.toLowerCase().includes(stopName.toLowerCase()));
    }
  }

  const finalLat = typeof latitude === 'number' && latitude !== 0 ? latitude : (targetStop ? targetStop.latitude : 11.0021);
  const finalLng = typeof longitude === 'number' && longitude !== 0 ? longitude : (targetStop ? targetStop.longitude : 77.0205);
  const finalStopName = targetStop ? targetStop.name : stopName;

  if (targetStop) {
    targetSeq = targetStop.sequence != null ? targetStop.sequence : (route.stops.findIndex(s => String(s._id) === String(targetStop._id)) + 1);
  }

  const saved = await BusLocationUpdate.create({
    tripId, busId, representativeId: repId,
    latitude: finalLat,
    longitude: finalLng,
    source: 'manual',
    stopId: targetStop?._id || stopId || null,
    stopName: finalStopName || null,
    recordedAt: new Date(recordedAt || Date.now()),
  });

  // Update Trip telemetry and advance current stop sequence so routes move!
  await Trip.findByIdAndUpdate(tripId, {
    currentStopSequence: targetSeq,
    lastConfirmedStopName: finalStopName,
    nearStopOrder: targetSeq + 1,
    telemetryStatus: 'ACTIVE',
    lastPingAt: new Date(),
  });

  await TripEvent.create({
    tripId,
    eventType: 'stop_confirmed',
    actorId: repId,
    details: { stopSequence: targetSeq, stopName: finalStopName, method: 'manual' },
  });

  return { locationId: saved._id, source: 'manual', stopSequence: targetSeq, stopName: finalStopName };
};

// Return latest location and its freshness for a bus with trip progress & delay status
export const getBusCurrentLocation = async (busId) => {
  const [latest, trip] = await Promise.all([
    BusLocationUpdate.findOne({ busId }).sort({ recordedAt: -1 }),
    Trip.findOne({ busId, tripStatus: 'in_progress' }),
  ]);

  let latestDelay = null;
  if (trip && trip.delayStatus === 'delayed') {
    const TripUpdate = (await import('../../models/TripUpdate.js')).default;
    latestDelay = await TripUpdate.findOne({ tripId: trip._id, updateType: 'delay' }).sort({ reportedAt: -1 });
  }

  if (!latest) return { location: null, locationStatus: 'UNAVAILABLE' };
  return {
    location: {
      ...latest.toObject(),
      currentStopSequence: trip ? trip.currentStopSequence : 0,
      lastConfirmedStopName: trip ? trip.lastConfirmedStopName : null,
      delayStatus: trip ? trip.delayStatus : 'on_time',
      expectedDelayMinutes: latestDelay ? latestDelay.expectedDelayMinutes : (trip ? trip.expectedDelayMinutes : 0),
      delayReason: latestDelay ? latestDelay.reason : null,
      activeTripId: trip ? trip._id : null,
    },
    locationStatus: getLocationStatus(latest.recordedAt, latest.source),
    currentStopSequence: trip ? trip.currentStopSequence : 0,
    tripStatus: trip ? trip.tripStatus : 'not_started',
    delayStatus: trip ? trip.delayStatus : 'on_time',
    delay: latestDelay ? {
      expectedDelayMinutes: latestDelay.expectedDelayMinutes,
      reason: latestDelay.reason,
      reportedAt: latestDelay.reportedAt,
    } : null,
  };
};

// No-op kept for backward compatibility; accumulator is now stateless
export const clearTripAccumulator = (_tripId) => {};
