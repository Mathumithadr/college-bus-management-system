// Staff controller delegating attendance review requests to staff service

import { sendSuccess, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination } from '../../utils/pagination.js';
import {
  listAttendanceRequestsForReview,
  reviewAttendance,
} from './staff.service.js';

// Retrieve paginated list of attendance requests assigned to faculty member for review
export const getAttendanceForReviewController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status } = req.query;
    const isAdmin = req.user.role === 'admin';

    const { requests, total } = await listAttendanceRequestsForReview({
      facultyId: req.user._id,
      isAdmin,
      status,
      skip,
      limit,
    });

    return sendPaginated(res, requests, buildPagination(page, limit, total));
  } catch (err) {
    next(err);
  }
};

// Process faculty or admin approval or rejection of student attendance request
export const reviewAttendanceController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;
    const isAdmin = req.user.role === 'admin';

    const result = await reviewAttendance({
      requestId: id,
      reviewerId: req.user._id,
      isAdmin,
      action,
      remarks,
      ip: req.ip,
      correlationId: req.correlationId,
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
