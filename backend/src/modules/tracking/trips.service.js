// Trip lifecycle: start/end/delay/admin terminate/cancel with in-transaction authority rechecks
import mongoose from 'mongoose';
import Trip from '../../models/Trip.js';
import Route from '../../models/Route.js';
import TripEvent from '../../models/TripEvent.js';
import TripUpdate from '../../models/TripUpdate.js';
import { writeAuditLog } from '../../middleware/audit.js';
import {
  tripAlreadyActiveError, notFoundError, stateConflictError, forbiddenError, stopOrderError,
} from '../../utils/errors.js';

// Start a trip atomically, verifying no in-progress trip exists for the bus
export const startTrip = async ({ busId, routeId, repId, ip, correlationId }) => {
  const session = await mongoose.startSession();
  try {
    let trip;
    await session.withTransaction(async () => {
      const existing = await Trip.findOne({ busId, tripStatus: 'in_progress' }).session(session);
      if (existing) throw tripAlreadyActiveError();
      const [created] = await Trip.create([{
        busId, routeId, activeRepresentativeId: repId, startedBy: repId, tripStatus: 'in_progress',
      }], { session });
      trip = created;
      await TripEvent.create([{
        tripId: trip._id, eventType: 'trip_started', actorId: repId, details: { busId, routeId },
      }], { session });
    });
    await writeAuditLog({ actorId: repId, action: 'TRIP_STARTED', resourceType: 'Trip', resourceId: trip._id, ipAddress: ip, correlationId });
    return { trip };
  } finally { session.endSession(); }
};

// End a trip; authority is rechecked inside the transaction
export const endTrip = async ({ tripId, repId, ip, correlationId }) => {
  const session = await mongoose.startSession();
  try {
    let trip;
    await session.withTransaction(async () => {
      trip = await Trip.findById(tripId).session(session);
      if (!trip) throw notFoundError('Trip');
      if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');
      if (String(trip.activeRepresentativeId) !== String(repId)) {
        throw forbiddenError('Only the active representative can end this trip');
      }
      trip.tripStatus = 'completed';
      trip.endTime = new Date();
      await trip.save({ session });
      await TripEvent.create([{
        tripId: trip._id, eventType: 'trip_ended', actorId: repId,
        details: { terminatedBy: 'representative' },
      }], { session });
    });
    await writeAuditLog({ actorId: repId, action: 'TRIP_ENDED', resourceType: 'Trip', resourceId: trip._id, ipAddress: ip, correlationId });
    return { trip };
  } finally { session.endSession(); }
};

// Manually confirm a scheduled stop ahead of current sequence
export const confirmStopManually = async ({ tripId, repId, stopSequence, ip, correlationId }) => {
  const seq = parseInt(stopSequence, 10);
  const trip = await Trip.findById(tripId);
  if (!trip) throw notFoundError('Trip');
  if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');
  if (String(trip.activeRepresentativeId) !== String(repId)) {
    throw forbiddenError('Only the active representative can confirm stops');
  }
  if (seq <= trip.currentStopSequence) throw stopOrderError('Stop sequence must be ahead of current');
  const route = await Route.findById(trip.routeId);
  const targetStop = route?.stops?.find((s) => s.sequence === seq);
  if (!targetStop) throw notFoundError('Stop in route');
  await Trip.findByIdAndUpdate(tripId, {
    currentStopSequence: seq, lastConfirmedStopName: targetStop.stopName, nearStopOrder: seq + 1,
  });
  await TripEvent.create({
    tripId, eventType: 'stop_confirmed', actorId: repId,
    details: { stopSequence: seq, stopName: targetStop.stopName, method: 'manual_override' },
  });
  return { currentStopSequence: seq, stopName: targetStop.stopName };
};

// Report a delay; writes top-level expectedDelayMinutes to TripUpdate
export const reportTripDelay = async ({ tripId, repId, updateType = 'delay', reason, expectedDelayMinutes, ip, correlationId }) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw notFoundError('Trip');
  if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');
  if (String(trip.activeRepresentativeId) !== String(repId)) {
    throw forbiddenError('Only the active representative can report updates');
  }
  const update = await TripUpdate.create({
    tripId: trip._id, busId: trip.busId, reportedBy: repId,
    updateType,
    reason: reason || updateType,
    expectedDelayMinutes: expectedDelayMinutes != null ? expectedDelayMinutes : 0,
    details: {},
  });
  if (updateType === 'delay') {
    trip.delayStatus = 'delayed';
    await trip.save();
    await TripEvent.create({
      tripId: trip._id, eventType: 'delay_reported', actorId: repId,
      details: { updateId: update._id, expectedDelayMinutes: expectedDelayMinutes != null ? expectedDelayMinutes : 0 },
    });
  }
  await writeAuditLog({ actorId: repId, action: 'TRIP_UPDATE_REPORTED', resourceType: 'TripUpdate', resourceId: update._id, ipAddress: ip, correlationId });
  return { update };
};

// Admin terminate: trip → completed, event, audit all atomic
export const terminateTripByAdmin = async ({ tripId, adminId, reason, ip, correlationId }) => {
  const session = await mongoose.startSession();
  try {
    let trip;
    await session.withTransaction(async () => {
      trip = await Trip.findById(tripId).session(session);
      if (!trip) throw notFoundError('Trip');
      if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');
      trip.tripStatus = 'completed';
      trip.endTime = new Date();
      await trip.save({ session });
      await TripEvent.create([{
        tripId: trip._id, eventType: 'trip_ended', actorId: adminId,
        details: { terminatedBy: 'admin', reason: reason || null },
      }], { session });
    });
    await writeAuditLog({ actorId: adminId, action: 'TRIP_TERMINATED_BY_ADMIN', resourceType: 'Trip', resourceId: trip._id, ipAddress: ip, correlationId });
    return { trip };
  } finally { session.endSession(); }
};

// Admin cancel: trip → cancelled, event, audit all atomic
export const cancelTripByAdmin = async ({ tripId, adminId, reason, ip, correlationId }) => {
  const session = await mongoose.startSession();
  try {
    let trip;
    await session.withTransaction(async () => {
      trip = await Trip.findById(tripId).session(session);
      if (!trip) throw notFoundError('Trip');
      if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');
      trip.tripStatus = 'cancelled';
      trip.endTime = new Date();
      await trip.save({ session });
      await TripEvent.create([{
        tripId: trip._id, eventType: 'trip_cancelled', actorId: adminId,
        details: { reason: reason || null },
      }], { session });
    });
    await writeAuditLog({ actorId: adminId, action: 'TRIP_CANCELLED_BY_ADMIN', resourceType: 'Trip', resourceId: trip._id, ipAddress: ip, correlationId });
    return { trip };
  } finally { session.endSession(); }
};
