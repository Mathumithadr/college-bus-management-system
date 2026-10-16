// Student service: bus, location, route progress, attendance, and reports
import Trip from '../../models/Trip.js';
import Route from '../../models/Route.js';
import TripUpdate from '../../models/TripUpdate.js';
import StudentBusAssignment from '../../models/StudentBusAssignment.js';
import AttendanceRequest from '../../models/AttendanceRequest.js';
import Report from '../../models/Report.js';
import ReportStatusHistory from '../../models/ReportStatusHistory.js';
import { generateTicketId } from '../../utils/ticket.js';
import { toUtcMidnight } from '../../utils/date.js';
import { getBusCurrentLocation } from '../tracking/tracking.service.js';
import { REPORT, DELAY } from '../../config/constants.js';
import { notFoundError, duplicateRequestError, stateConflictError } from '../../utils/errors.js';

// Return the student's active bus assignment with populated bus and route
export const getStudentAssignedBus = async (studentId) => {
  const assignment = await StudentBusAssignment
    .findOne({ studentId, status: 'active' })
    .populate('busId routeId');
  if (!assignment) throw notFoundError('Active bus assignment for student');
  return { assignment };
};

// Return the live location of the student's assigned bus
export const getAssignedBusLiveLocation = async (studentId) => {
  const assignment = await StudentBusAssignment.findOne({ studentId, status: 'active' });
  if (!assignment) throw notFoundError('Active bus assignment for student');
  return getBusCurrentLocation(assignment.busId);
};

// Return route progress for the student's bus's current trip
export const getAssignedBusRouteProgress = async (studentId) => {
  const assignment = await StudentBusAssignment.findOne({ studentId, status: 'active' });
  if (!assignment) throw notFoundError('Active bus assignment for student');
  const trip = await Trip.findOne({ busId: assignment.busId, tripStatus: 'in_progress' });
  if (!trip) return { activeTrip: null };
  const route = await Route.findById(trip.routeId);
  return {
    activeTrip: {
      tripId: trip._id,
      currentStopSequence: trip.currentStopSequence,
      lastConfirmedStopName: trip.lastConfirmedStopName,
      nearStopOrder: trip.nearStopOrder,
      gpsQuality: trip.gpsQuality,
      delayStatus: trip.delayStatus,
      stops: route?.stops || [],
    },
  };
};

// Create attendance request with true MongoDB $or dual-path delay verification (Decision 2)
export const createAttendanceRequest = async ({ studentId, date, classHour, course, facultyId, reason, busId, tripId }) => {
  const normalizedDate = toUtcMidnight(date);

  const duplicate = await AttendanceRequest.findOne({
    studentId, date: normalizedDate, classHour: Number(classHour),
  });
  if (duplicate) throw duplicateRequestError();

  const targetTrip = tripId
    ? await Trip.findById(tripId)
    : busId
      ? await Trip.findOne({ busId, tripStatus: { $in: ['in_progress', 'completed'] } }).sort({ startTime: -1 })
      : null;

  let delayVerified = false;
  let matchingTripId = null;
  let matchingTripUpdateId = null;

  // Decision 2: true $or dual-path query supporting top-level and details
  if (targetTrip && targetTrip.delayStatus === 'delayed') {
    const qualifyingUpdate = await TripUpdate.findOne({
      tripId: targetTrip._id,
      updateType: 'delay',
      $or: [
        { expectedDelayMinutes: { $gte: DELAY.THRESHOLD_MINUTES } },
        { 'details.expectedDelayMinutes': { $gte: DELAY.THRESHOLD_MINUTES } },
      ],
    }).sort({ reportedAt: -1 });

    if (qualifyingUpdate) {
      delayVerified = true;
      matchingTripId = targetTrip._id;
      matchingTripUpdateId = qualifyingUpdate._id;
    }
  }

  const attendance = await AttendanceRequest.create({
    studentId,
    date: normalizedDate,
    classHour: Number(classHour),
    course,
    facultyId,
    busId: busId || null,
    tripId: tripId || null,
    reason,
    delayVerified,
    delayVerifiedAt: delayVerified ? new Date() : null,
    matchingTripId,
  });

  return { attendance, delayVerified, matchingTripUpdateId };
};

// List paginated attendance requests for a student
export const listStudentAttendanceRequests = async (studentId, { skip, limit }) => {
  const [requests, total] = await Promise.all([
    AttendanceRequest.find({ studentId })
      .populate('facultyId', 'name department')
      .populate('busId', 'busNumber')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit),
    AttendanceRequest.countDocuments({ studentId }),
  ]);
  return { requests, total };
};

// Cancel a pending attendance request owned by the student
export const cancelStudentAttendanceRequest = async (requestId, studentId) => {
  const request = await AttendanceRequest.findOne({ _id: requestId, studentId });
  if (!request) throw notFoundError('Attendance request');
  if (request.status !== 'pending') throw stateConflictError('Only pending attendance requests can be cancelled');
  request.status = 'cancelled';
  await request.save();
  return { attendance: request };
};

// Create a grievance report and its initial status history entry
export const createStudentReport = async ({ studentId, category, subject, description, busId, routeId, tripId }) => {
  const ticketId = await generateTicketId();
  const report = await Report.create({
    ticketId, studentId, category, subject, description,
    busId: busId || null, routeId: routeId || null, tripId: tripId || null,
  });
  await ReportStatusHistory.create({
    reportId: report._id, changedBy: studentId,
    oldStatus: null, newStatus: 'submitted', note: 'Initial report submission',
  });
  return { report };
};

// List paginated reports for a student
export const listStudentReports = async (studentId, { skip, limit }) => {
  const [reports, total] = await Promise.all([
    Report.find({ studentId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments({ studentId }),
  ]);
  return { reports, total };
};

// Retrieve a single report, lazily auto-closing resolved reports after 7 days
export const getStudentReportDetails = async (reportId, studentId) => {
  const report = await Report.findOne({ _id: reportId, studentId });
  if (!report) throw notFoundError('Report');
  if (report.status === 'resolved' && report.updatedAt) {
    const elapsedDays = (Date.now() - new Date(report.updatedAt).getTime()) / 86_400_000;
    if (elapsedDays >= REPORT.AUTO_CLOSE_DAYS) {
      report.status = 'closed';
      report.closedAt = new Date();
      await report.save();
      await ReportStatusHistory.create({
        reportId: report._id, changedBy: studentId,
        oldStatus: 'resolved', newStatus: 'closed',
        note: 'Auto-closed after 7 days in resolved status',
      });
    }
  }
  return { report };
};

// Close the student's own report when status is submitted or resolved
export const closeStudentReport = async (reportId, studentId) => {
  const report = await Report.findOne({ _id: reportId, studentId });
  if (!report) throw notFoundError('Report');
  if (!['submitted', 'resolved'].includes(report.status)) {
    throw stateConflictError('Reports can only be closed by students when in submitted or resolved status');
  }
  const oldStatus = report.status;
  report.status = 'closed';
  report.closedAt = new Date();
  await report.save();
  await ReportStatusHistory.create({
    reportId: report._id, changedBy: studentId,
    oldStatus, newStatus: 'closed', note: 'Report closed by student',
  });
  return { report };
};
