// Handover service: primary init, vice respond, vice claim after 5-min silence, admin override
import mongoose from 'mongoose';
import Trip from '../../models/Trip.js';
import TripEvent from '../../models/TripEvent.js';
import BusLocationUpdate from '../../models/BusLocationUpdate.js';
import RepresentativeAssignment from '../../models/RepresentativeAssignment.js';
import RepresentativeHandover from '../../models/RepresentativeHandover.js';
import { writeAuditLog } from '../../middleware/audit.js';
import {
  notFoundError, stateConflictError, forbiddenError, handoverPendingError,
} from '../../utils/errors.js';

// Primary initiates handover to the assigned vice
export const requestRepresentativeHandover = async ({ tripId, primaryRepId, reason, ip, correlationId }) => {
  const session = await mongoose.startSession();
  try {
    let handover;
    await session.withTransaction(async () => {
      const trip = await Trip.findById(tripId).session(session);
      if (!trip) throw notFoundError('Trip');
      if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');
      if (String(trip.activeRepresentativeId) !== String(primaryRepId)) {
        throw forbiddenError('Only the active representative can request a handover');
      }
      const existing = await RepresentativeHandover.findOne({ tripId, status: 'pending' }).session(session);
      if (existing) throw handoverPendingError();
      const vice = await RepresentativeAssignment.findOne({ busId: trip.busId, roleType: 'vice', status: 'active' }).session(session);
      if (!vice) throw notFoundError('Active vice representative');
      const [created] = await RepresentativeHandover.create([{
        tripId, previousRepresentativeId: primaryRepId,
        newRepresentativeId: vice.representativeId,
        status: 'pending', reason: reason || null,
      }], { session });
      handover = created;
      await TripEvent.create([{
        tripId, eventType: 'handover_requested', actorId: primaryRepId,
        details: { handoverId: handover._id, targetRepresentativeId: vice.representativeId },
      }], { session });
    });
    await writeAuditLog({ actorId: primaryRepId, action: 'HANDOVER_REQUESTED', resourceType: 'RepresentativeHandover', resourceId: handover._id, ipAddress: ip, correlationId });
    return { handover };
  } finally { session.endSession(); }
};

// Vice responds with accept or reject; accept atomically transfers authority
export const respondToRepresentativeHandover = async ({ tripId, handoverId, viceRepId, action, ip, correlationId }) => {
  const session = await mongoose.startSession();
  try {
    let handover;
    await session.withTransaction(async () => {
      handover = await RepresentativeHandover.findById(handoverId).session(session);
      if (!handover || String(handover.tripId) !== String(tripId)) throw notFoundError('Handover');
      if (handover.status !== 'pending') throw stateConflictError('Handover is not pending');
      if (String(handover.newRepresentativeId) !== String(viceRepId)) {
        throw forbiddenError('Only the designated vice can respond');
      }
      handover.status = action === 'accept' ? 'accepted' : 'rejected';
      handover.respondedAt = new Date();
      handover.respondedBy = viceRepId;
      await handover.save({ session });
      if (action === 'accept') {
        await Trip.findByIdAndUpdate(tripId, { activeRepresentativeId: viceRepId }, { session });
        await TripEvent.create([{
          tripId, eventType: 'handover_accepted', actorId: viceRepId,
          details: { handoverId: handover._id },
        }], { session });
      } else {
        await TripEvent.create([{
          tripId, eventType: 'handover_rejected', actorId: viceRepId,
          details: { handoverId: handover._id },
        }], { session });
      }
    });
    await writeAuditLog({ actorId: viceRepId, action: action === 'accept' ? 'HANDOVER_ACCEPTED' : 'HANDOVER_REJECTED', resourceType: 'RepresentativeHandover', resourceId: handover._id, ipAddress: ip, correlationId });
    return { handover };
  } finally { session.endSession(); }
};

// Vice claims control after >= 5 minutes of primary GPS silence (conditional atomic update)
export const claimRepresentativeControl = async ({ tripId, viceRepId, ip, correlationId }) => {
  const INACTIVITY_MS = 5 * 60 * 1000;
  const cutoff = new Date(Date.now() - INACTIVITY_MS);

  const session = await mongoose.startSession();
  try {
    let updatedTrip;
    await session.withTransaction(async () => {
      const trip = await Trip.findById(tripId).session(session);
      if (!trip) throw notFoundError('Trip');
      if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');

      const vice = await RepresentativeAssignment.findOne({
        busId: trip.busId, representativeId: viceRepId, roleType: 'vice', status: 'active',
      }).session(session);
      if (!vice) throw forbiddenError('Only the assigned vice representative can claim control');

      const lastPrimaryPing = await BusLocationUpdate.findOne({
        tripId: trip._id, representativeId: trip.activeRepresentativeId,
      }).sort({ recordedAt: -1 }).session(session);

      const primarySilent = !lastPrimaryPing || new Date(lastPrimaryPing.recordedAt) <= cutoff;
      if (!primarySilent) {
        throw stateConflictError('Primary representative has sent GPS pings within the last 5 minutes');
      }

      const result = await Trip.findOneAndUpdate(
        {
          _id: trip._id,
          tripStatus: 'in_progress',
          activeRepresentativeId: trip.activeRepresentativeId,
        },
        { $set: { activeRepresentativeId: viceRepId } },
        { new: true, session }
      );
      if (!result) throw stateConflictError('Active representative has already changed');

      updatedTrip = result;
      await TripEvent.create([{
        tripId: trip._id, eventType: 'handover_accepted', actorId: viceRepId,
        details: { method: 'vice_claim', previousRepresentativeId: trip.activeRepresentativeId },
      }], { session });
    });
    await writeAuditLog({ actorId: viceRepId, action: 'HANDOVER_CLAIMED', resourceType: 'Trip', resourceId: updatedTrip._id, ipAddress: ip, correlationId });
    return { trip: updatedTrip };
  } finally { session.endSession(); }
};

// Admin override: force active representative immediately, with audit
export const overrideRepresentativeHandover = async ({ tripId, adminId, newRepresentativeId, reason, ip, correlationId }) => {
  const session = await mongoose.startSession();
  try {
    let handover;
    await session.withTransaction(async () => {
      const trip = await Trip.findById(tripId).session(session);
      if (!trip) throw notFoundError('Trip');
      if (trip.tripStatus !== 'in_progress') throw stateConflictError('Trip is not in progress');
      const [created] = await RepresentativeHandover.create([{
        tripId, previousRepresentativeId: trip.activeRepresentativeId,
        newRepresentativeId, status: 'overridden',
        adminOverrideBy: adminId, reason: reason || null, respondedAt: new Date(),
      }], { session });
      handover = created;
      await Trip.findByIdAndUpdate(tripId, { activeRepresentativeId: newRepresentativeId }, { session });
      await TripEvent.create([{
        tripId, eventType: 'handover_overridden', actorId: adminId,
        details: { handoverId: handover._id, reason },
      }], { session });
    });
    await writeAuditLog({ actorId: adminId, action: 'HANDOVER_OVERRIDDEN', resourceType: 'RepresentativeHandover', resourceId: handover._id, ipAddress: ip, correlationId });
    return { handover };
  } finally { session.endSession(); }
};
