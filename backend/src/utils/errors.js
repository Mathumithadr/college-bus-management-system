// Custom AppError class — attach HTTP status and error code to thrown errors

import { ERROR_CODES } from './errorCodes.js';

/**
 * Base application error that carries an HTTP status code and a canonical error code.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true; // Distinguish from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

// Convenience factory functions for common error types

/** 400 Validation failed */
export const validationError = (message, errors = []) =>
  new AppError(message, 400, ERROR_CODES.VALIDATION_FAILED, errors);

/** 400 Location timestamp invalid */
export const locationTimestampError = (message) =>
  new AppError(message, 400, ERROR_CODES.LOCATION_TIMESTAMP_INVALID);

/** 400 Stop order not ahead */
export const stopOrderError = (message) =>
  new AppError(message, 400, ERROR_CODES.STOP_ORDER_NOT_AHEAD);

/** 400 Idempotency key required */
export const idempotencyKeyRequiredError = () =>
  new AppError('Idempotency-Key header is required for this operation', 400, ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED);

/** 401 Token invalid / expired */
export const authError = (message = 'Authentication required') =>
  new AppError(message, 401, ERROR_CODES.TOKEN_INVALID);

/** 403 Role forbidden */
export const forbiddenError = (message = 'Access denied') =>
  new AppError(message, 403, ERROR_CODES.ROLE_FORBIDDEN);

/** 403 Representative not active */
export const repNotActiveError = () =>
  new AppError('You do not have an active representative assignment', 403, ERROR_CODES.REPRESENTATIVE_NOT_ACTIVE);

/** 404 Resource not found */
export const notFoundError = (resource = 'Resource') =>
  new AppError(`${resource} not found`, 404, ERROR_CODES.RESOURCE_NOT_FOUND);

/** 409 Trip already active */
export const tripAlreadyActiveError = () =>
  new AppError('A trip is already in progress for this bus', 409, ERROR_CODES.TRIP_ALREADY_ACTIVE);

/** 409 No active trip */
export const noActiveTripError = () =>
  new AppError('No active trip found for this bus', 409, ERROR_CODES.NO_ACTIVE_TRIP);

/** 409 Duplicate request (attendance) */
export const duplicateRequestError = (message = 'A request already exists for this date and class hour') =>
  new AppError(message, 409, ERROR_CODES.DUPLICATE_REQUEST);

/** 409 Handover pending */
export const handoverPendingError = () =>
  new AppError('A handover request is already pending for this trip', 409, ERROR_CODES.HANDOVER_PENDING);

/** 409 Generic state conflict */
export const stateConflictError = (message) =>
  new AppError(message, 409, ERROR_CODES.STATE_CONFLICT);

/** 422 Idempotency key mismatch */
export const idempotencyMismatchError = () =>
  new AppError('Idempotency key already used with different request body', 422, ERROR_CODES.IDEMPOTENCY_KEY_MISMATCH);

/** 429 Rate limited */
export const rateLimitedError = (retryAfterSeconds = 300) => {
  const err = new AppError('Too many requests. Please try again later.', 429, ERROR_CODES.RATE_LIMITED);
  err.retryAfterSeconds = retryAfterSeconds;
  return err;
};

/** 500 Internal error */
export const internalError = (message = 'An unexpected error occurred') =>
  new AppError(message, 500, ERROR_CODES.INTERNAL_ERROR);
