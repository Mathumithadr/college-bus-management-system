// Auth module: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me

import { Router } from 'express';
import { body } from 'express-validator';
import { handleValidation } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { loginController, logoutController, meController } from './auth.controller.js';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidation,
  ],
  loginController
);

// POST /api/auth/logout
router.post('/logout', authenticate, logoutController);

// GET /api/auth/me
router.get('/me', authenticate, meController);

export default router;
