// Tracking module routes: trip lifecycle, GPS ingestion, manual location, stops, handovers

import { Router } from 'express';
import { body, param } from 'express-validator';
import { handleValidation } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { requireActiveRep } from '../../middleware/activeRep.js';
import {
  startTripController,
  endTripController,
  gpsLocationController,
  manualLocationController,
  confirmStopController,
  reportDelayController,
  requestHandoverController,
  respondHandoverController,
} from './tracking.controller.js';

const router = Router();

// All tracking routes require authentication + active student rep
const repMiddleware = [authenticate, requireRole('student'), requireActiveRep];

// POST /api/trips — start a trip
router.post(
  '/',
  [...repMiddleware, handleValidation],
  startTripController
);

// POST /api/trips/:tripId/end — end a trip
router.post(
  '/:tripId/end',
  [...repMiddleware, param('tripId').isMongoId(), handleValidation],
  endTripController
);

// POST /api/location — ingest GPS ping
router.post(
  '/location',
  [
    ...repMiddleware,
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('accuracy').isFloat({ min: 0 }).withMessage('Accuracy must be non-negative'),
    body('recordedAt').isISO8601().withMessage('recordedAt must be ISO 8601 timestamp'),
    handleValidation,
  ],
  gpsLocationController
);

// POST /api/location/manual — submit manual fallback location
router.post(
  '/location/manual',
  [
    ...repMiddleware,
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('recordedAt').isISO8601().withMessage('recordedAt must be ISO 8601 timestamp'),
    handleValidation,
  ],
  manualLocationController
);

// POST /api/trips/:tripId/stops/:stopSequence/confirm — confirm a stop
router.post(
  '/:tripId/stops/:stopSequence/confirm',
  [
    ...repMiddleware,
    param('tripId').isMongoId(),
    param('stopSequence').isInt({ min: 1 }),
    handleValidation,
  ],
  confirmStopController
);

// POST /api/trips/:tripId/delay — report a delay
router.post(
  '/:tripId/delay',
  [
    ...repMiddleware,
    param('tripId').isMongoId(),
    body('updateType').isIn(['delay', 'route_diverted', 'breakdown', 'other']).withMessage('Invalid updateType'),
    body('reason').optional().isString().isLength({ max: 500 }),
    body('details.expectedDelayMinutes').optional().isInt({ min: 0, max: 240 }),
    handleValidation,
  ],
  reportDelayController
);

// POST /api/trips/:tripId/handover — request handover to vice rep
router.post(
  '/:tripId/handover',
  [
    ...repMiddleware,
    param('tripId').isMongoId(),
    body('reason').optional().isString().isLength({ max: 500 }),
    handleValidation,
  ],
  requestHandoverController
);

// PUT /api/trips/:tripId/handover/:handoverId — vice rep responds to handover
router.put(
  '/:tripId/handover/:handoverId',
  [
    authenticate,
    requireRole('student'),
    param('tripId').isMongoId(),
    param('handoverId').isMongoId(),
    body('action').isIn(['accept', 'reject']).withMessage('action must be accept or reject'),
    handleValidation,
  ],
  respondHandoverController
);

export default router;
