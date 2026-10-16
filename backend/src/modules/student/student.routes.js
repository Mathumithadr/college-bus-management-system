// Student module routes: bus info, location, route progress, attendance, reports

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { handleValidation } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import {
  getMyBusController,
  getBusLocationController,
  getRouteProgressController,
  submitAttendanceController,
  getMyAttendanceController,
  cancelAttendanceController,
  submitReportController,
  getMyReportsController,
  getMyReportController,
  closeMyReportController,
} from './student.controller.js';

const router = Router();
const studentAuth = [authenticate, requireRole('student')];

// GET /api/student/bus — get assigned bus info
router.get('/bus', studentAuth, getMyBusController);

// GET /api/student/bus/location — get live location of assigned bus
router.get('/bus/location', studentAuth, getBusLocationController);

// GET /api/student/bus/route-progress — get route progress for active trip
router.get('/bus/route-progress', studentAuth, getRouteProgressController);

// POST /api/student/attendance — submit attendance request
router.post(
  '/attendance',
  [
    ...studentAuth,
    body('date').isISO8601().withMessage('Valid date required'),
    body('classHour').isInt({ min: 1, max: 10 }).withMessage('classHour must be 1-10'),
    body('course').notEmpty().isLength({ max: 200 }).withMessage('course is required (max 200 chars)'),
    body('facultyId').isMongoId().withMessage('Valid facultyId required'),
    body('reason').notEmpty().isLength({ max: 500 }).withMessage('reason is required (max 500 chars)'),
    body('busId').optional().isMongoId(),
    body('tripId').optional().isMongoId(),
    handleValidation,
  ],
  submitAttendanceController
);

// GET /api/student/attendance — list my attendance requests
router.get(
  '/attendance',
  [
    ...studentAuth,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    handleValidation,
  ],
  getMyAttendanceController
);

// PUT /api/student/attendance/:id/cancel — cancel a pending attendance request
router.put(
  '/attendance/:id/cancel',
  [...studentAuth, param('id').isMongoId(), handleValidation],
  cancelAttendanceController
);

// POST /api/student/reports — submit a report
router.post(
  '/reports',
  [
    ...studentAuth,
    body('category').isIn(['bus_delay', 'driver_staff_behaviour', 'bus_condition', 'route_stop_issue', 'other'])
      .withMessage('Invalid category'),
    body('subject').notEmpty().isLength({ max: 200 }).withMessage('subject required (max 200 chars)'),
    body('description').notEmpty().isLength({ max: 2000 }).withMessage('description required (max 2000 chars)'),
    body('busId').optional().isMongoId(),
    body('routeId').optional().isMongoId(),
    body('tripId').optional().isMongoId(),
    handleValidation,
  ],
  submitReportController
);

// GET /api/student/reports — list my reports
router.get(
  '/reports',
  [
    ...studentAuth,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    handleValidation,
  ],
  getMyReportsController
);

// GET /api/student/reports/:id — get a specific report
router.get(
  '/reports/:id',
  [...studentAuth, param('id').isMongoId(), handleValidation],
  getMyReportController
);

// PUT /api/student/reports/:id/close — student closes their own report
router.put(
  '/reports/:id/close',
  [...studentAuth, param('id').isMongoId(), handleValidation],
  closeMyReportController
);

export default router;
