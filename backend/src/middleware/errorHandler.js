// Global error handler middleware — converts AppError and other errors to canonical envelope

import { env } from '../config/env.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

/**
 * Global Express error handler — maps AppError instances and Mongoose errors to the canonical envelope.
 */
export const errorHandler = (err, req, res, next) => {
  // Default error shape
  let statusCode = err.statusCode || 500;
  let code = err.code || ERROR_CODES.INTERNAL_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let errors = err.errors || [];

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_FAILED;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    code = ERROR_CODES.STATE_CONFLICT;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value for field: ${field}`;
  }

  // Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_FAILED;
    message = `Invalid value for field: ${err.path}`;
  }

  // JWT errors (shouldn't reach here but safety net)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ERROR_CODES.TOKEN_INVALID;
    message = err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
  }

  // Build the response body
  const body = { success: false, code, message };
  if (errors.length > 0) body.errors = errors;
  if (err.retryAfterSeconds) body.retryAfterSeconds = err.retryAfterSeconds;

  // In development include the stack trace; never in production
  if (env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  // Log non-operational errors (programming bugs)
  if (!err.isOperational) {
    console.error('💥 Unhandled error:', err);
  }

  return res.status(statusCode).json(body);
};

/**
 * 404 handler for unmatched routes.
 */
export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    code: ERROR_CODES.RESOURCE_NOT_FOUND,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
