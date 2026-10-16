// Role-based access control middleware — restrict endpoints to specific roles

import { forbiddenError } from '../utils/errors.js';

/**
 * Middleware factory: allow only users whose role is in the allowedRoles array.
 */
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(forbiddenError('Not authenticated'));
  if (!allowedRoles.includes(req.user.role)) {
    return next(forbiddenError(`Access denied. Required role(s): ${allowedRoles.join(', ')}`));
  }
  next();
};

// Convenience exports for common role combinations
export const adminOnly = requireRole('admin');
export const staffOrAdmin = requireRole('staff', 'admin');
export const studentOnly = requireRole('student');
export const anyRole = requireRole('student', 'staff', 'admin');
