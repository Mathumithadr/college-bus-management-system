// Audit log middleware — write AuditLog documents after mutating operations

import AuditLog from '../models/AuditLog.js';

/**
 * Write an audit log entry asynchronously (fire-and-forget to avoid blocking the response).
 */
export const writeAuditLog = async (params) => {
  try {
    await AuditLog.create({
      actorId: params.actorId || null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
      details: params.details || {},
      status: params.status || 'SUCCESS',
      failureReason: params.failureReason || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      correlationId: params.correlationId || null,
    });
  } catch (err) {
    // Audit log failures must NOT bubble up to the caller — log only
    console.error('⚠️  Audit log write failed:', err.message);
  }
};

/**
 * Middleware factory: automatically log successful mutating requests.
 */
export const auditLog = (action, resourceType) => async (req, res, next) => {
  // Attach audit helper to res.locals for controllers to call after success
  res.locals.audit = (resourceId, details = {}) =>
    writeAuditLog({
      actorId: req.user?._id,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
    });
  next();
};
