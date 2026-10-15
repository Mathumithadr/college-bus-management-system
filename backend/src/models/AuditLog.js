const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for system-generated events
    },
    action: {
      type: String,
      required: [true, 'Action name is required'],
      trim: true,
      // Examples: BUS_CREATED, ASSIGNMENT_CHANGED, HANDOVER_OVERRIDDEN,
      //           ATTENDANCE_REQUEST_REVIEWED, REPORT_STATUS_CHANGED
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      trim: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
    },
    failureReason: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    correlationId: {
      type: String,
      default: null, // Shared request ID for tracing across services
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'auditLogs',
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ correlationId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);