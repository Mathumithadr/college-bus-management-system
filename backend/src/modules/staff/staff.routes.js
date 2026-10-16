// Staff module routes: attendance review

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { handleValidation } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import {
  getAttendanceForReviewController,
  reviewAttendanceController,
} from './staff.controller.js';

const router = Router();
const staffAuth = [authenticate, requireRole('staff', 'admin')];

// GET /api/staff/attendance — list pending attendance requests for this faculty
router.get(
  '/attendance',
  [
    ...staffAuth,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
    handleValidation,
  ],
  getAttendanceForReviewController
);

// PUT /api/staff/attendance/:id/review — approve or reject a request
router.put(
  '/attendance/:id/review',
  [
    ...staffAuth,
    param('id').isMongoId(),
    body('action').isIn(['approve', 'reject']).withMessage('action must be approve or reject'),
    body('remarks').optional().isString().isLength({ max: 1000 }),
    handleValidation,
  ],
  reviewAttendanceController
);

export default router;
