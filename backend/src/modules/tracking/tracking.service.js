// Location tracking service: query-derived 3-sample accumulator (no in-memory state)
import Trip from '../../models/Trip.js';
import Route from '../../models/Route.js';
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
    const inRadius = distance <= GPS.NEAR_STOP_RADIUS_M;
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

  const route = await Route.findById(trip.routeId);
  const stops = (route?.stops || []).slice().sort((a, b) => a.sequence - b.sequence);
  const nextStop = stops.find((s) => s.sequence === trip.currentStopSequence + 1);

  if (!nextStop) {
    return { locationId: saved._id, accumulatorResult: 'NO_NEXT_STOP', streakCount: 0 };
  }

  const distance = haversineMeters(latitude, longitude, nextStop.latitude, nextStop.longitude);
  const inRadius = distance <= GPS.NEAR_STOP_RADIUS_M;

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
      lastConfirmedStopName: nextStop.stopName,
      nearStopOrder: nextStop.sequence + 1,
      gpsQuality: 'GOOD',
    });
    await TripEvent.create({
      tripId,
      eventType: 'stop_confirmed',
      actorId: repId,
      details: { stopSequence: nextStop.sequence, stopName: nextStop.stopName, method: 'gps_accumulator' },
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

  const saved = await BusLocationUpdate.create({
    tripId, busId, representativeId: repId,
    latitude, longitude,
    source: 'manual',
    stopId: stopId || null,
    stopName: stopName || null,
    recordedAt: new Date(recordedAt),
  });

  return { locationId: saved._id, source: 'manual' };
};

// Return latest location and its freshness for a bus
export const getBusCurrentLocation = async (busId) => {
  const latest = await BusLocationUpdate.findOne({ busId }).sort({ recordedAt: -1 });
  if (!latest) return { location: null, locationStatus: 'UNAVAILABLE' };
  return { location: latest, locationStatus: getLocationStatus(latest.recordedAt, latest.source) };
};

// No-op kept for backward compatibility; accumulator is now stateless
export const clearTripAccumulator = (_tripId) => {};
