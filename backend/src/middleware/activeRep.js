// Active representative guards for trip-scoped and bus-scoped write operations.

import Trip from '../models/Trip.js';
import RepresentativeAssignment from '../models/RepresentativeAssignment.js';
import { repNotActiveError } from '../utils/errors.js';

// Guard for trip-scoped routes: caller must be the active rep for the trip's bus.
export const requireActiveRep = async (req, res, next) => {
  try {
    // Find any active assignment for the caller; attach to request for downstream use.
    const assignment = await RepresentativeAssignment.findOne({
      representativeId: req.user._id,
      status: 'active',
    });
    if (!assignment) return next(repNotActiveError());
    req.repAssignment = assignment;

    // Only look up the trip if this route actually has a tripId.
    if (req.params.tripId) {
      const trip = await Trip.findById(req.params.tripId);
      if (!trip) {
        return res.status(404).json({
          success: false,
          code: 'RESOURCE_NOT_FOUND',
          message: 'Trip not found',
        });
      }
      if (String(trip.activeRepresentativeId) !== String(req.user._id)) {
        return next(repNotActiveError());
      }
      req.trip = trip;
    }

    next();
  } catch (err) { next(err); }
};

// Guard for bus-scoped routes: caller must have an active assignment for the bus.
export const requireActiveRepOnBus = async (req, res, next) => {
  try {
    const assignment = await RepresentativeAssignment.findOne({
      busId: req.params.busId,
      representativeId: req.user._id,
      status: 'active',
    });
    if (!assignment) return next(repNotActiveError());
    req.repAssignment = assignment;
    next();
  } catch (err) { next(err); }
};