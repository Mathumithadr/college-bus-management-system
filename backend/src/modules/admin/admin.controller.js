// Admin controller delegating administrative HTTP endpoints to admin, trips, and handover services

import { sendSuccess, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination } from '../../utils/pagination.js';
import {
  createBus,
  listBuses,
  getBusById,
  updateBus,
  softDeleteBus,
  createRoute,
  listRoutes,
  getRouteById,
  updateRoute,
  softDeleteRoute,
  createUser,
  listUsers,
  getUserById,
  updateUser,
  assignStudentToBus,
  assignRepresentativeToBus,
  listBusAssignments,
  listAllReports,
  transitionReportStatus,
  listSystemAuditLogs,
  createAdminAnnouncement,
  listAdminAnnouncements,
  updateAdminAnnouncement,
  deleteAdminAnnouncement,
} from './admin.service.js';
import {
  terminateTripByAdmin,
  cancelTripByAdmin,
} from '../tracking/trips.service.js';
import {
  overrideRepresentativeHandover,
} from '../tracking/handover.service.js';

// ==================== BUSES ====================

// Handle bus registration request
export const createBusController = async (req, res, next) => {
  try {
    const result = await createBus(req.body, { adminId: req.user._id, ip: req.ip, correlationId: req.correlationId });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// Handle paginated bus listing request
export const getBusesController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { buses, total } = await listBuses({ skip, limit });
    return sendPaginated(res, buses, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

// Handle single bus details retrieval
export const getBusController = async (req, res, next) => {
  try {
    const result = await getBusById(req.params.id);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// Handle bus modification with bidirectional sync
export const updateBusController = async (req, res, next) => {
  try {
    const result = await updateBus(req.params.id, req.body, { adminId: req.user._id, ip: req.ip, correlationId: req.correlationId });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// Handle bus soft deletion
export const deleteBusController = async (req, res, next) => {
  try {
    const result = await softDeleteBus(req.params.id, { adminId: req.user._id, ip: req.ip, correlationId: req.correlationId });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// ==================== ROUTES ====================

// Handle route creation request
export const createRouteController = async (req, res, next) => {
  try {
    const result = await createRoute(req.body, { adminId: req.user._id, ip: req.ip, correlationId: req.correlationId });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// Handle paginated route listing request
export const getRoutesController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { routes, total } = await listRoutes({ skip, limit });
    return sendPaginated(res, routes, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

// Handle single route retrieval
export const getRouteController = async (req, res, next) => {
  try {
    const result = await getRouteById(req.params.id);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// Handle route modification
export const updateRouteController = async (req, res, next) => {
  try {
    const result = await updateRoute(req.params.id, req.body, { adminId: req.user._id, ip: req.ip, correlationId: req.correlationId });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// Handle route soft deletion
export const deleteRouteController = async (req, res, next) => {
  try {
    const result = await softDeleteRoute(req.params.id, { adminId: req.user._id, ip: req.ip, correlationId: req.correlationId });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// ==================== USERS ====================

// Handle user account creation
export const createUserController = async (req, res, next) => {
  try {
    const result = await createUser(req.body, { adminId: req.user._id, ip: req.ip, correlationId: req.correlationId });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// Handle paginated user accounts listing
export const getUsersController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { role } = req.query;
    const { users, total } = await listUsers({ role, skip, limit });
    return sendPaginated(res, users, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

// Handle single user account retrieval
export const getUserController = async (req, res, next) => {
  try {
    const result = await getUserById(req.params.id);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// Handle user account updates
export const updateUserController = async (req, res, next) => {
  try {
    const result = await updateUser(req.params.id, req.body, { adminId: req.user._id, ip: req.ip, correlationId: req.correlationId });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// ==================== ASSIGNMENTS ====================

// Handle student bus allocation
export const assignStudentController = async (req, res, next) => {
  try {
    const { studentId, busId, routeId } = req.body;
    const result = await assignStudentToBus({
      studentId,
      busId,
      routeId,
      adminId: req.user._id,
      ip: req.ip,
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// Handle representative assignment
export const assignRepresentativeController = async (req, res, next) => {
  try {
    const { representativeId, busId, routeId, roleType } = req.body;
    const result = await assignRepresentativeToBus({
      representativeId,
      busId,
      routeId,
      roleType,
      adminId: req.user._id,
      ip: req.ip,
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// Handle bus allocations listing
export const getAssignmentsController = async (req, res, next) => {
  try {
    const { type } = req.query;
    const result = await listBusAssignments(type);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// ==================== TRIP ACTIONS ====================

// Handle administrative trip termination
export const terminateTripController = async (req, res, next) => {
  try {
    const result = await terminateTripByAdmin({
      tripId: req.params.tripId,
      adminId: req.user._id,
      reason: req.body.reason,
      ip: req.ip,
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// Handle administrative trip cancellation
export const cancelTripController = async (req, res, next) => {
  try {
    const result = await cancelTripByAdmin({
      tripId: req.params.tripId,
      adminId: req.user._id,
      reason: req.body.reason,
      ip: req.ip,
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// Handle emergency administrative representative handover override
export const overrideHandoverController = async (req, res, next) => {
  try {
    const result = await overrideRepresentativeHandover({
      tripId: req.params.tripId,
      adminId: req.user._id,
      newRepresentativeId: req.body.newRepresentativeId,
      reason: req.body.reason,
      ip: req.ip,
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// ==================== REPORTS ====================

// Handle paginated grievance listing
export const getReportsController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status } = req.query;
    const { reports, total } = await listAllReports({ status, skip, limit });
    return sendPaginated(res, reports, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

// Handle grievance state transition
export const updateReportStatusController = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const result = await transitionReportStatus({
      reportId: req.params.id,
      adminId: req.user._id,
      status,
      note,
      ip: req.ip,
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// ==================== AUDIT LOGS ====================

// Handle audit log inspection
export const getAuditLogsController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { action, actorId } = req.query;
    const { logs, total } = await listSystemAuditLogs({ action, actorId, skip, limit });
    return sendPaginated(res, logs, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

// ==================== ANNOUNCEMENTS ====================

// Handle announcement broadcast creation
export const createAnnouncementController = async (req, res, next) => {
  try {
    const { title, message, targetType, targetId, isPublished } = req.body;
    const result = await createAdminAnnouncement({
      title,
      message,
      targetType,
      targetId,
      isPublished,
      adminId: req.user._id,
    });
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
};

// Handle broadcast announcements listing
export const getAnnouncementsController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { announcements, total } = await listAdminAnnouncements({ skip, limit });
    return sendPaginated(res, announcements, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

// Handle announcement updates
export const updateAnnouncementController = async (req, res, next) => {
  try {
    const result = await updateAdminAnnouncement(req.params.id, req.body);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

// Handle announcement deletion
export const deleteAnnouncementController = async (req, res, next) => {
  try {
    const result = await deleteAdminAnnouncement(req.params.id);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};
