// Communication routes: student announcements, general announcements, single fetch, health
import { Router } from 'express';
import { param } from 'express-validator';
import { handleValidation } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import {
  getStudentAnnouncementsController,
  getPublicAnnouncementsController,
  getAnnouncementController,
  healthController,
} from './communication.controller.js';

const router = Router();

// Student-scoped announcement list
router.get('/student/announcements', authenticate, requireRole('student'), getStudentAnnouncementsController);

// General authenticated announcement list (all roles)
router.get('/announcements', authenticate, getPublicAnnouncementsController);

// Audience-checked single announcement
router.get('/announcements/:id', [authenticate, param('id').isMongoId(), handleValidation], getAnnouncementController);

// Flat health check (public)
router.get('/health', healthController);

export default router;
