// Staff service managing faculty attendance review, approval, rejection, and verification inspection

import AttendanceRequest from '../../models/AttendanceRequest.js';
import { writeAuditLog } from '../../middleware/audit.js';
import { notFoundError, stateConflictError } from '../../utils/errors.js';

// Retrieve attendance requests assigned to faculty member (or all requests if administrator)
export const listAttendanceRequestsForReview = async ({ facultyId, isAdmin, status, skip, limit }) => {
  const filter = {};

  // Staff members only see requests where they are the designated faculty
  if (!isAdmin) {
    filter.facultyId = facultyId;
  }

  // Filter by requested status or default to pending requests
  if (status) {
    filter.status = status;
  } else {
    filter.status = 'pending';
  }

  const [requests, total] = await Promise.all([
    AttendanceRequest.find(filter)
      .populate('studentId', 'name email department')
      .populate('busId', 'busNumber registrationNumber')
      .populate('tripId', 'startTime delayStatus currentStopSequence')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    AttendanceRequest.countDocuments(filter),
  ]);

  return { requests, total };
};

// Process faculty or admin approval or rejection of an attendance request with remarks
export const reviewAttendance = async ({ requestId, reviewerId, isAdmin, action, remarks, ip, correlationId }) => {
  const request = await AttendanceRequest.findById(requestId);
  if (!request) {
    throw notFoundError('Attendance request');
  }

  // Faculty can only review requests for their own courses; return 404 for privacy protection
  if (!isAdmin && request.facultyId.toString() !== reviewerId.toString()) {
    throw notFoundError('Attendance request');
  }

  // Only requests currently in pending status may be reviewed
  if (request.status !== 'pending') {
    throw stateConflictError('Only pending attendance requests can be reviewed');
  }

  request.status = action === 'approve' ? 'approved' : 'rejected';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date();
  request.reviewRemarks = remarks || null;
  await request.save();

  // Audit review action
  await writeAuditLog({
    actorId: reviewerId,
    action: `ATTENDANCE_${action.toUpperCase()}ED`,
    resourceType: 'AttendanceRequest',
    resourceId: request._id,
    details: { action, remarks: remarks || null },
    ipAddress: ip,
    correlationId,
  });

  return { attendance: request };
};
