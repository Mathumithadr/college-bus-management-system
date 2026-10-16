// Canonical GPS + manual location routes under /api/rep/trips/:tripId/...
import { Router } from 'express';
import { body, param } from 'express-validator';
import { handleValidation } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { requireActiveRep } from '../../middleware/activeRep.js';
import { gpsLimiter } from '../../middleware/rateLimiter.js';
import { gpsLocationController, manualLocationController } from './tracking.controller.js';

const router = Router();
const repAuth = [authenticate, requireRole('student'), requireActiveRep];

// POST /api/rep/trips/:tripId/location — GPS telemetry ping
router.post(
  '/trips/:tripId/location',
  [
    gpsLimiter,
    ...repAuth,
    param('tripId').isMongoId(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('accuracyMeters').optional().isFloat({ min: 0 }),
    body('recordedAt').isISO8601(),
    handleValidation,
  ],
  gpsLocationController
);

// POST /api/rep/trips/:tripId/location/manual — manual fallback location
router.post(
  '/trips/:tripId/location/manual',
  [
    ...repAuth,
    param('tripId').isMongoId(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('stopId').optional().isMongoId(),
    body('stopName').optional().isString().isLength({ max: 100 }),
    body('recordedAt').isISO8601(),
    handleValidation,
  ],
  manualLocationController
);

export default router;
