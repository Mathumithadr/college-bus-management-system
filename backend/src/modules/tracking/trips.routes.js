// Canonical representative routes: /api/rep/buses/:busId/trips/... and /api/rep/trips/:tripId/...

import { Router } from 'express';
import { body, param } from 'express-validator';
import { handleValidation } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { requireActiveRep, requireActiveRepOnBus } from '../../middleware/activeRep.js';
import { idempotencyCheck } from '../../middleware/idempotency.js';
import {
  startTripController,
  endTripController,
  confirmStopController,
  reportDelayController,
  requestHandoverController,
  respondHandoverController,
  claimHandoverController,
} from './tracking.controller.js';

const router = Router();
const repAuth = [authenticate, requireRole('student')];

// GET /api/rep/buses — list buses where caller is primary or vice representative.
router.get('/buses', repAuth, async (req, res, next) => {
  try {
    const RepresentativeAssignment = (await import('../../models/RepresentativeAssignment.js')).default;
    const assignments = await RepresentativeAssignment.find({
      representativeId: req.user._id,
      status: 'active',
    }).populate('busId routeId');
    res.json({ success: true, data: { buses: assignments } });
  } catch (err) { next(err); }
});

// GET /api/rep/buses/:busId/state — current trip + active rep + pending handover.
router.get(
  '/buses/:busId/state',
  [...repAuth, param('busId').isMongoId(), handleValidation],
  async (req, res, next) => {
    try {
      const Trip = (await import('../../models/Trip.js')).default;
      const RepresentativeHandover = (await import('../../models/RepresentativeHandover.js')).default;
      const trip = await Trip.findOne({ busId: req.params.busId, tripStatus: 'in_progress' });
      const pending = trip
        ? await RepresentativeHandover.findOne({ tripId: trip._id, status: 'pending' })
        : null;
      res.json({
        success: true,
        data: {
          busId: req.params.busId,
          currentTripId: trip ? trip._id : null,
          tripStatus: trip ? trip.tripStatus : 'not_started',
          isActiveRepresentative: trip
            ? String(trip.activeRepresentativeId) === String(req.user._id)
            : false,
          pendingHandover: pending,
        },
      });
    } catch (err) { next(err); }
  }
);

// POST /api/rep/buses/:busId/trips/start — active rep starts trip (idempotent).
router.post(
  '/buses/:busId/trips/start',
  [
    ...repAuth,
    param('busId').isMongoId(),
    requireActiveRepOnBus,
    idempotencyCheck('trip-start', { required: true }),
    handleValidation,
  ],
  startTripController
);

// POST /api/rep/trips/:tripId/end — active rep ends trip (idempotent).
router.post(
  '/trips/:tripId/end',
  [
    ...repAuth,
    param('tripId').isMongoId(),
    requireActiveRep,
    idempotencyCheck('trip-end', { required: true }),
    handleValidation,
  ],
  endTripController
);

// POST /api/rep/trips/:tripId/stops/:stopSequence/confirm — manual stop confirmation.
router.post(
  '/trips/:tripId/stops/:stopSequence/confirm',
  [
    ...repAuth,
    param('tripId').isMongoId(),
    param('stopSequence').isInt({ min: 1 }),
    requireActiveRep,
    handleValidation,
  ],
  confirmStopController
);

// POST /api/rep/trips/:tripId/delay — report delay with optional reason and minutes.
router.post(
  '/trips/:tripId/delay',
  [
    ...repAuth,
    param('tripId').isMongoId(),
    requireActiveRep,
    body('updateType').optional().isIn(['delay', 'route_diverted', 'breakdown', 'other']),
    body('reason').optional().isString().isLength({ max: 500 }),
    body('expectedDelayMinutes').optional().isInt({ min: 0, max: 240 }),
    handleValidation,
  ],
  reportDelayController
);

// POST /api/rep/trips/:tripId/handovers — primary initiates handover (idempotent).
router.post(
  '/trips/:tripId/handovers',
  [
    ...repAuth,
    param('tripId').isMongoId(),
    requireActiveRep,
    body('reason').optional().isString().isLength({ max: 500 }),
    idempotencyCheck('handover-init', { required: true }),
    handleValidation,
  ],
  requestHandoverController
);

// PATCH /api/rep/trips/:tripId/handovers/:handoverId/respond — vice accepts/rejects (idempotent).
router.patch(
  '/trips/:tripId/handovers/:handoverId/respond',
  [
    ...repAuth,
    param('tripId').isMongoId(),
    param('handoverId').isMongoId(),
    body('action').isIn(['accept', 'reject']),
    idempotencyCheck('handover-respond', { required: true }),
    handleValidation,
  ],
  respondHandoverController
);

// POST /api/rep/trips/:tripId/handovers/claim — vice claims after 5-min primary silence (idempotent).
router.post(
  '/trips/:tripId/handovers/claim',
  [
    ...repAuth,
    param('tripId').isMongoId(),
    idempotencyCheck('handover-claim', { required: true }),
    handleValidation,
  ],
  claimHandoverController
);

// GET /api/rep/trips/:tripId — current trip state.
router.get(
  '/trips/:tripId',
  [...repAuth, param('tripId').isMongoId(), handleValidation],
  async (req, res, next) => {
    try {
      const Trip = (await import('../../models/Trip.js')).default;
      const trip = await Trip.findById(req.params.tripId);
      if (!trip) {
        return res.status(404).json({ success: false, code: 'RESOURCE_NOT_FOUND', message: 'Trip not found' });
      }
      res.json({ success: true, data: { trip } });
    } catch (err) { next(err); }
  }
);

// GET /api/rep/trips/:tripId/handover-history — chronological handovers.
router.get(
  '/trips/:tripId/handover-history',
  [...repAuth, param('tripId').isMongoId(), handleValidation],
  async (req, res, next) => {
    try {
      const RepresentativeHandover = (await import('../../models/RepresentativeHandover.js')).default;
      const history = await RepresentativeHandover
        .find({ tripId: req.params.tripId })
        .sort({ requestedAt: -1 });
      res.json({ success: true, data: { history } });
    } catch (err) { next(err); }
  }
);

export default router;