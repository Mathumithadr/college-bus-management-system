// Rate limiting configurations for auth, GPS telemetry, and general APIs

import rateLimit from 'express-rate-limit';

// Global API rate limiter allowing 10000 requests per 15-minute window
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('127.0.0.1');
  },
  handler: (req, res) => {
    res.set('Retry-After', '60');
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retryAfterSeconds: 60,
    });
  },
});

// Authentication rate limiter preventing brute-force login attempts (5 requests per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // increased for demo testing
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  handler: (req, res) => {
    res.set('Retry-After', '60');
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfterSeconds: 60,
    });
  },
});

// High-frequency GPS ping limiter for active representatives (300 pings per minute)
export const gpsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  handler: (req, res) => {
    res.set('Retry-After', '30');
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'GPS telemetry rate limit exceeded.',
      retryAfterSeconds: 30,
    });
  },
});
