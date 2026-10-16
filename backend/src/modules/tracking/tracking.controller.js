// Tracking controller: trip lifecycle, GPS, handover, and vice claim
import { sendSuccess } from '../../utils/response.js';
import { processGpsPing, processManualLocation } from './tracking.service.js';
import { startTrip, endTrip, confirmStopManually, reportTripDelay } from './trips.service.js';
import {
  requestRepresentativeHandover,
  respondToRepresentativeHandover,
  claimRepresentativeControl,
} from './handover.service.js';

// POST /api/rep/buses/:busId/trips/start
export const startTripController = async (req, res, next) => {
  try {
    const result = await startTrip({
      busId: req.params.busId,
      routeId: req.repAssignment?.routeId || null,
      repId: req.user._id,
      ip: req.ip,
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// POST /api/rep/trips/:tripId/end
export const endTripController = async (req, res, next) => {
  try {
    const result = await endTrip({
      tripId: req.params.tripId, repId: req.user._id,
      ip: req.ip, correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// POST /api/rep/trips/:tripId/location
export const gpsLocationController = async (req, res, next) => {
  try {
    const { latitude, longitude, accuracyMeters, recordedAt } = req.body;
    const result = await processGpsPing({
      tripId: req.params.tripId,
      busId: req.repAssignment.busId,
      repId: req.user._id,
      latitude, longitude, accuracyMeters, recordedAt,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// POST /api/rep/trips/:tripId/location/manual
export const manualLocationController = async (req, res, next) => {
  try {
    const { latitude, longitude, recordedAt, stopId, stopName } = req.body;
    const result = await processManualLocation({
      tripId: req.params.tripId,
      busId: req.repAssignment.busId,
      repId: req.user._id,
      latitude, longitude, recordedAt, stopId, stopName,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// POST /api/rep/trips/:tripId/stops/:stopSequence/confirm
export const confirmStopController = async (req, res, next) => {
  try {
    const result = await confirmStopManually({
      tripId: req.params.tripId, repId: req.user._id,
      stopSequence: req.params.stopSequence,
      ip: req.ip, correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// POST /api/rep/trips/:tripId/delay
export const reportDelayController = async (req, res, next) => {
  try {
    const { updateType, reason, expectedDelayMinutes } = req.body;
    const result = await reportTripDelay({
      tripId: req.params.tripId, repId: req.user._id,
      updateType, reason, expectedDelayMinutes,
      ip: req.ip, correlationId: req.correlationId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// POST /api/rep/trips/:tripId/handovers
export const requestHandoverController = async (req, res, next) => {
  try {
    const result = await requestRepresentativeHandover({
      tripId: req.params.tripId, primaryRepId: req.user._id,
      reason: req.body.reason, ip: req.ip, correlationId: req.correlationId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// PATCH /api/rep/trips/:tripId/handovers/:handoverId/respond
export const respondHandoverController = async (req, res, next) => {
  try {
    const result = await respondToRepresentativeHandover({
      tripId: req.params.tripId, handoverId: req.params.handoverId,
      viceRepId: req.user._id, action: req.body.action,
      ip: req.ip, correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// POST /api/rep/trips/:tripId/handovers/claim
export const claimHandoverController = async (req, res, next) => {
  try {
    const result = await claimRepresentativeControl({
      tripId: req.params.tripId, viceRepId: req.user._id,
      ip: req.ip, correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};
