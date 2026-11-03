// Admin module routes: CRUD for buses, routes, users, assignments, reports, audit logs, trip control

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { handleValidation } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import multer from 'multer';
import {
  createStopController,
  getStopsController,
  activateScheduleController,
  importStudentsController,
  // Buses
  createBusController, getBusesController, getBusController, updateBusController, deleteBusController,
  // Routes
  createRouteController, getRoutesController, getRouteController, updateRouteController, deleteRouteController,
  // Users
  createUserController, getUsersController, getUserController, updateUserController,
  // Assignments
  assignStudentController, assignRepresentativeController, getAssignmentsController,
  // Trips
  terminateTripController, cancelTripController,
  // Handover override
  overrideHandoverController,
  // Reports
  getReportsController, updateReportStatusController,
  // Audit logs
  getAuditLogsController,
  // Announcements
  createAnnouncementController, getAnnouncementsController, updateAnnouncementController, deleteAnnouncementController,
} from './admin.controller.js';

const router = Router();
const adminAuth = [authenticate, requireRole('admin')];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// --- Buses ---
router.post('/buses', [...adminAuth, body('busNumber').notEmpty(), body('registrationNumber').notEmpty(), body('capacity').isInt({ min: 1, max: 100 }), handleValidation], createBusController);
router.get('/buses', [...adminAuth, query('page').optional().isInt({ min: 1 }), handleValidation], getBusesController);
router.get('/buses/:id', [...adminAuth, param('id').isMongoId(), handleValidation], getBusController);
router.put('/buses/:id', [...adminAuth, param('id').isMongoId(), handleValidation], updateBusController);
router.delete('/buses/:id', [...adminAuth, param('id').isMongoId(), handleValidation], deleteBusController);

// --- Routes ---
router.post('/routes', [...adminAuth, body('routeName').notEmpty(), body('routeNumber').notEmpty(), body('busId').isMongoId(), body('stops').isArray({ min: 2 }), body('stops.*').isMongoId(), handleValidation], createRouteController);
router.get('/routes', adminAuth, getRoutesController);
router.get('/routes/:id', [...adminAuth, param('id').isMongoId(), handleValidation], getRouteController);
router.put('/routes/:id', [...adminAuth, param('id').isMongoId(), handleValidation], updateRouteController);
router.delete('/routes/:id', [...adminAuth, param('id').isMongoId(), handleValidation], deleteRouteController);

// --- Users ---
router.post('/users', [...adminAuth, body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 8 }), body('role').isIn(['student', 'staff', 'admin']), handleValidation], createUserController);
router.get('/users', [...adminAuth, query('page').optional().isInt({ min: 1 }), handleValidation], getUsersController);
router.get('/users/:id', [...adminAuth, param('id').isMongoId(), handleValidation], getUserController);
router.put('/users/:id', [...adminAuth, param('id').isMongoId(), handleValidation], updateUserController);

// --- Assignments ---
router.post('/assignments/students', [...adminAuth, body('studentId').isMongoId(), body('busId').isMongoId(), body('routeId').isMongoId(), body('boardingStopId').isMongoId(), body('forceOverbook').optional().isBoolean(), handleValidation], assignStudentController);
router.post('/assignments/representatives', [...adminAuth, body('representativeId').isMongoId(), body('busId').isMongoId(), body('routeId').isMongoId(), body('roleType').isIn(['primary', 'vice']), handleValidation], assignRepresentativeController);
router.get('/assignments', adminAuth, getAssignmentsController);

// --- Trip control ---
router.post('/trips/:tripId/terminate', [...adminAuth, param('tripId').isMongoId(), body('reason').optional().isString(), handleValidation], terminateTripController);
router.post('/trips/:tripId/cancel', [...adminAuth, param('tripId').isMongoId(), body('reason').optional().isString(), handleValidation], cancelTripController);

// --- Handover override ---
router.post('/trips/:tripId/handover/override', [...adminAuth, param('tripId').isMongoId(), body('newRepresentativeId').isMongoId(), body('reason').optional().isString(), handleValidation], overrideHandoverController);

// --- Reports ---
router.get('/reports', [...adminAuth, query('page').optional().isInt({ min: 1 }), query('status').optional(), handleValidation], getReportsController);
router.put('/reports/:id/status', [...adminAuth, param('id').isMongoId(), body('status').isIn(['under_review', 'more_information_required', 'resolved', 'rejected', 'closed']), body('note').optional().isString(), handleValidation], updateReportStatusController);

// --- Audit logs ---
router.get('/audit-logs', [...adminAuth, query('page').optional().isInt({ min: 1 }), handleValidation], getAuditLogsController);

// --- Announcements ---
router.post('/announcements', [...adminAuth, body('title').notEmpty(), body('message').notEmpty(), body('targetType').isIn(['general', 'route', 'bus']), handleValidation], createAnnouncementController);
router.get('/announcements', adminAuth, getAnnouncementsController);
router.put('/announcements/:id', [...adminAuth, param('id').isMongoId(), handleValidation], updateAnnouncementController);
router.delete('/announcements/:id', [...adminAuth, param('id').isMongoId(), handleValidation], deleteAnnouncementController);

// --- Stops ---
router.post('/stops', [...adminAuth, body('name').notEmpty(), body('latitude').isFloat(), body('longitude').isFloat(), handleValidation], createStopController);
router.get('/stops', adminAuth, getStopsController);

// --- Schedules ---
router.post('/schedules/activate', [...adminAuth, body('date').isISO8601(), body('dayType').isIn(['WEEKDAY', 'SATURDAY', 'SPECIAL']), body('routeId').isMongoId(), body('busId').isMongoId(), handleValidation], activateScheduleController);

// --- CSV Import ---
router.post('/students/import', [...adminAuth, upload.single('file')], importStudentsController);

import { 
  createStaffController, 
  getStaffListController, 
  toggleStaffStatusController 
} from './admin.controller.js';

// --- Staff Management ---
router.post('/staff', [
  ...adminAuth,
  body('name').notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  body('department').optional().isString(),
  body('phone').optional().isString(),
  handleValidation
], createStaffController);

router.get('/staff', adminAuth, getStaffListController);

router.put('/staff/:id/toggle', [
  ...adminAuth,
  param('id').isMongoId(),
  handleValidation
], toggleStaffStatusController);

export default router;
