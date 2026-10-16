// Resource ownership guard middleware to prevent cross-user data tampering

import { forbiddenError, notFoundError } from '../utils/errors.js';

// Verify that the specified document field matches the authenticated user ID or caller is admin
export const requireOwnership = (getModel, ownerField = 'studentId') => async (req, res, next) => {
  try {
    const resourceId = req.params.id || req.params.reportId || req.params.attendanceId;
    if (!resourceId) return next();

    const Model = typeof getModel === 'function' ? getModel() : getModel;
    const document = await Model.findById(resourceId);

    if (!document) {
      return next(notFoundError('Resource'));
    }

    // Admins bypass ownership checks
    if (req.user.role === 'admin') {
      req.resource = document;
      return next();
    }

    const documentOwnerId = document[ownerField]?.toString();
    const currentUserId = req.user._id.toString();

    // Cross-user access returns 404 for privacy protection per architectural specification
    if (documentOwnerId !== currentUserId) {
      return next(notFoundError('Resource'));
    }

    req.resource = document;
    next();
  } catch (err) {
    next(err);
  }
};
