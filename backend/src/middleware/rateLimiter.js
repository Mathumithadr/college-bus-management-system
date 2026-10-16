// Rate limiting configurations for auth, GPS telemetry, and general APIs

import rateLimit from 'express-rate-limit';

// Global API rate limiter allowing 300 requests per 15-minute window
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.set('Retry-After', '300');
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retryAfterSeconds: 300,
    });
  },
});

// Authentication rate limiter preventing brute-force login attempts (5 requests per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.set('Retry-After', '300');
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfterSeconds: 300,
    });
  },
});

// High-frequency GPS ping limiter for active representatives (60 pings per minute)
export const gpsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.set('Retry-After', '60');
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'GPS telemetry rate limit exceeded.',
      retryAfterSeconds: 60,
    });
  },
});
