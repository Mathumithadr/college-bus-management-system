// Student controller delegating HTTP student endpoints to student service

import { sendSuccess, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination } from '../../utils/pagination.js';
import {
  getStudentAssignedBus,
  getAssignedBusLiveLocation,
  getAssignedBusRouteProgress,
  createAttendanceRequest,
  listStudentAttendanceRequests,
  cancelStudentAttendanceRequest,
  createStudentReport,
  listStudentReports,
  getStudentReportDetails,
  closeStudentReport,
} from './student.service.js';

// Get assigned bus and route details for authenticated student
export const getMyBusController = async (req, res, next) => {
  try {
    const result = await getStudentAssignedBus(req.user._id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// Get live GPS location coordinates and freshness for student's assigned bus
export const getBusLocationController = async (req, res, next) => {
  try {
    const result = await getAssignedBusLiveLocation(req.user._id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// Get scheduled route stop progress for currently active trip
export const getRouteProgressController = async (req, res, next) => {
  try {
    const result = await getAssignedBusRouteProgress(req.user._id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// Submit student attendance request with automated delay verification
export const submitAttendanceController = async (req, res, next) => {
  try {
    const { date, classHour, course, facultyId, reason, busId, tripId } = req.body;
    const result = await createAttendanceRequest({
      studentId: req.user._id,
      date,
      classHour,
      course,
      facultyId,
      reason,
      busId,
      tripId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
};

// Retrieve paginated list of attendance requests submitted by student
export const getMyAttendanceController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { requests, total } = await listStudentAttendanceRequests(req.user._id, { skip, limit });
    return sendPaginated(res, requests, buildPagination(page, limit, total));
  } catch (err) {
    next(err);
  }
};

// Cancel pending attendance request
export const cancelAttendanceController = async (req, res, next) => {
  try {
    const result = await cancelStudentAttendanceRequest(req.params.id, req.user._id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// Submit new student grievance or issue report
export const submitReportController = async (req, res, next) => {
  try {
    const { category, subject, description, busId, routeId, tripId } = req.body;
    const result = await createStudentReport({
      studentId: req.user._id,
      category,
      subject,
      description,
      busId,
      routeId,
      tripId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
};

// Retrieve paginated list of student's own reports
export const getMyReportsController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { reports, total } = await listStudentReports(req.user._id, { skip, limit });
    return sendPaginated(res, reports, buildPagination(page, limit, total));
  } catch (err) {
    next(err);
  }
};

// View specific report with lazy auto-closure check
export const getMyReportController = async (req, res, next) => {
  try {
    const result = await getStudentReportDetails(req.params.id, req.user._id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// Allow student to close own submitted or resolved report
export const closeMyReportController = async (req, res, next) => {
  try {
    const result = await closeStudentReport(req.params.id, req.user._id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
