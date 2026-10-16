// Master Express app — mounts all module routes

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { correlationMiddleware } from './utils/correlation.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import tripsRoutes from './modules/tracking/trips.routes.js';
import locationRoutes from './modules/tracking/location.routes.js';
import studentRoutes from './modules/student/student.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import communicationRoutes from './modules/communication/communication.routes.js';

const app = express();

// Correlation ID first, so rate-limited requests still carry one
app.use(correlationMiddleware);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Global rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many requests.',
    retryAfterSeconds: 300,
  },
});
app.use('/api', limiter);

// Canonical mounts
app.use('/api/auth', authRoutes);
app.use('/api/rep', tripsRoutes);        // trips + handovers under /api/rep
app.use('/api/rep', locationRoutes);     // GPS + manual under /api/rep
app.use('/api/student', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', communicationRoutes);    // /api/announcements, /api/health

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
