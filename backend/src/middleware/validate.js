// Validation middleware — wrap express-validator result check into AppError

import { validationResult } from 'express-validator';
import { validationError } from '../utils/errors.js';

/**
 * Middleware: check express-validator results and throw VALIDATION_FAILED if any errors exist.
 */
export const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => `${e.path || e.param}: ${e.msg}`);
    return next(validationError('Validation failed', errors));
  }
  next();
};
