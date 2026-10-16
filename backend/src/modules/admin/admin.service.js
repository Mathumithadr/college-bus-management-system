// Admin service: fleet management, routes, assignments, grievance resolution, and audit trail

import Bus from '../../models/Bus.js';
import Route from '../../models/Route.js';
import User from '../../models/User.js';
import StudentBusAssignment from '../../models/StudentBusAssignment.js';
import RepresentativeAssignment from '../../models/RepresentativeAssignment.js';
import Report from '../../models/Report.js';
import ReportStatusHistory from '../../models/ReportStatusHistory.js';
import AuditLog from '../../models/AuditLog.js';
import Announcement from '../../models/Announcement.js';
import { hashPassword } from '../../utils/password.js';
import { writeAuditLog } from '../../middleware/audit.js';
import { REPORT_TRANSITIONS } from '../../config/constants.js';
import {
  duplicateRequestError,
  notFoundError,
  stateConflictError,
  validationError,
} from '../../utils/errors.js';

export const createBus = async ({ busNumber, registrationNumber, capacity, availabilityStatus, adminId, ip, correlationId }) => {
  const existing = await Bus.findOne({ $or: [{ busNumber }, { registrationNumber }] });
  if (existing) throw duplicateRequestError('A bus with this bus number or registration number already exists');
  const bus = await Bus.create({ busNumber, registrationNumber, capacity, availabilityStatus: availabilityStatus || 'available' });
  await writeAuditLog({ actorId: adminId, action: 'BUS_CREATED', resourceType: 'Bus', resourceId: bus._id, details: { busNumber, registrationNumber }, ipAddress: ip, correlationId });
  return { bus };
};

export const listAllBuses = async ({ skip, limit }) => {
  const [buses, total] = await Promise.all([
    Bus.find().populate('currentRouteId').sort({ busNumber: 1 }).skip(skip).limit(limit),
    Bus.countDocuments(),
  ]);
  return { buses, total };
};

export const getBusById = async (busId) => {
  const bus = await Bus.findById(busId).populate('currentRouteId');
  if (!bus) throw notFoundError('Bus');
  return { bus };
};

export const updateBus = async (busId, updateData, { adminId, ip, correlationId }) => {
  const bus = await Bus.findByIdAndUpdate(busId, updateData, { new: true, runValidators: true });
  if (!bus) throw notFoundError('Bus');

  // Cascade routeId change to all active StudentBusAssignment records for this bus
  if (updateData.currentRouteId) {
    await StudentBusAssignment.updateMany(
      { busId: bus._id, status: 'active' },
      { $set: { routeId: updateData.currentRouteId } }
    );
  }

  await writeAuditLog({ actorId: adminId, action: 'BUS_UPDATED', resourceType: 'Bus', resourceId: bus._id, details: updateData, ipAddress: ip, correlationId });
  return { bus };
};

export const deleteBus = async (busId, { adminId, ip, correlationId }) => {
  const bus = await Bus.findByIdAndDelete(busId);
  if (!bus) throw notFoundError('Bus');
  await writeAuditLog({ actorId: adminId, action: 'BUS_DELETED', resourceType: 'Bus', resourceId: bus._id, details: { busNumber: bus.busNumber }, ipAddress: ip, correlationId });
  return { success: true };
};

export const createRoute = async ({ routeName, routeNumber, busId, stops, adminId, ip, correlationId }) => {
  const existing = await Route.findOne({ routeNumber });
  if (existing) throw duplicateRequestError('A route with this route number already exists');
  const route = await Route.create({ routeName, routeNumber, busId, stops: stops || [] });
  await Bus.findByIdAndUpdate(busId, { currentRouteId: route._id });
  await writeAuditLog({ actorId: adminId, action: 'ROUTE_CREATED', resourceType: 'Route', resourceId: route._id, details: { routeName, routeNumber, busId }, ipAddress: ip, correlationId });
  return { route };
};

export const listAllRoutes = async () => {
  const routes = await Route.find().populate('busId', 'busNumber registrationNumber');
  return { routes };
};

export const getRouteById = async (routeId) => {
  const route = await Route.findById(routeId).populate('busId', 'busNumber registrationNumber');
  if (!route) throw notFoundError('Route');
  return { route };
};

export const updateRoute = async (routeId, updateData, { adminId, ip, correlationId }) => {
  const route = await Route.findByIdAndUpdate(routeId, updateData, { new: true, runValidators: true });
  if (!route) throw notFoundError('Route');
  await writeAuditLog({ actorId: adminId, action: 'ROUTE_UPDATED', resourceType: 'Route', resourceId: route._id, details: updateData, ipAddress: ip, correlationId });
  return { route };
};

export const deleteRoute = async (routeId, { adminId, ip, correlationId }) => {
  const route = await Route.findByIdAndDelete(routeId);
  if (!route) throw notFoundError('Route');
  await Bus.findOneAndUpdate({ currentRouteId: routeId }, { currentRouteId: null });
  await writeAuditLog({ actorId: adminId, action: 'ROUTE_DELETED', resourceType: 'Route', resourceId: route._id, details: { routeNumber: route.routeNumber }, ipAddress: ip, correlationId });
  return { success: true };
};

export const createUser = async ({ name, email, password, role, permissions, department, phone, adminId, ip, correlationId }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw duplicateRequestError('A user with this email address already exists');
  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role, permissions: permissions || [], department: department || null, phone: phone || null });
  await writeAuditLog({ actorId: adminId, action: 'USER_CREATED', resourceType: 'User', resourceId: user._id, details: { email: user.email, role: user.role }, ipAddress: ip, correlationId });
  const userObj = user.toObject();
  delete userObj.passwordHash;
  return { user: userObj };
};

export const listAllUsers = async ({ role, skip, limit }) => {
  const filter = {};
  if (role) filter.role = role;
  const [users, total] = await Promise.all([
    User.find(filter).select('-passwordHash').sort({ name: 1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { users, total };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) throw notFoundError('User');
  return { user };
};

export const updateUser = async (userId, updateFields, { adminId, ip, correlationId }) => {
  const { password, ...rest } = updateFields;
  if (password) rest.passwordHash = await hashPassword(password);
  const user = await User.findByIdAndUpdate(userId, rest, { new: true, runValidators: true });
  if (!user) throw notFoundError('User');
  await writeAuditLog({ actorId: adminId, action: 'USER_UPDATED', resourceType: 'User', resourceId: user._id, ipAddress: ip, correlationId });
  return { user };
};

export const assignStudentToBus = async ({ studentId, busId, routeId, adminId, ip, correlationId }) => {
  await StudentBusAssignment.findOneAndUpdate(
    { studentId, status: 'active' },
    { status: 'inactive' }
  );

  let assignedRouteId = routeId;
  if (!assignedRouteId) {
    const bus = await Bus.findById(busId);
    assignedRouteId = bus?.currentRouteId;
  }

  const assignment = await StudentBusAssignment.create({
    studentId,
    busId,
    routeId: assignedRouteId,
    assignedBy: adminId,
  });

  await writeAuditLog({
    actorId: adminId,
    action: 'STUDENT_ASSIGNED',
    resourceType: 'StudentBusAssignment',
    resourceId: assignment._id,
    ipAddress: ip,
    correlationId,
  });

  return { assignment };
};

export const assignRepresentativeToBus = async ({ representativeId, busId, routeId, roleType, adminId, ip, correlationId }) => {
  const oppositeRole = roleType === 'primary' ? 'vice' : 'primary';
  const conflict = await RepresentativeAssignment.findOne({
    busId, representativeId, roleType: oppositeRole, status: 'active',
  });
  if (conflict) {
    throw stateConflictError('User is already the ' + oppositeRole + ' representative for this bus');
  }

  await RepresentativeAssignment.findOneAndUpdate(
    { busId, roleType, status: 'active' },
    { status: 'inactive' }
  );

  const assignment = await RepresentativeAssignment.create({
    representativeId, busId, routeId, roleType, assignedBy: adminId,
  });

  await writeAuditLog({
    actorId: adminId, action: 'REPRESENTATIVE_ASSIGNED',
    resourceType: 'RepresentativeAssignment', resourceId: assignment._id, ipAddress: ip, correlationId,
  });
  return { assignment };
};

export const listBusAssignments = async (type = 'students') => {
  if (type === 'representatives') {
    const assignments = await RepresentativeAssignment.find({ status: 'active' })
      .populate('representativeId', 'name email phone')
      .populate('busId', 'busNumber registrationNumber')
      .populate('routeId', 'routeName routeNumber');
    return { assignments };
  }

  const assignments = await StudentBusAssignment.find({ status: 'active' })
    .populate('studentId', 'name email department phone')
    .populate('busId', 'busNumber registrationNumber')
    .populate('routeId', 'routeName routeNumber');
  return { assignments };
};

export const listAllReports = async ({ status, skip, limit }) => {
  const filter = {};
  if (status) filter.status = status;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('studentId', 'name email department')
      .populate('busId', 'busNumber')
      .populate('routeId', 'routeName')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);

  return { reports, total };
};

export const transitionReportStatus = async ({ reportId, adminId, status, note, ip, correlationId }) => {
  const report = await Report.findById(reportId);
  if (!report) throw notFoundError('Report');

  const allowedTransitions = REPORT_TRANSITIONS[report.status] || [];
  if (!allowedTransitions.includes(status)) {
    throw stateConflictError('Cannot transition report status from ' + report.status + ' to ' + status);
  }

  const oldStatus = report.status;
  report.status = status;

  // closedAt is ONLY set on the terminal state 'closed'
  if (status === 'closed') {
    report.closedAt = new Date();
  }
  await report.save();

  await ReportStatusHistory.create({
    reportId: report._id, changedBy: adminId,
    oldStatus, newStatus: status, note: note || null,
  });

  await writeAuditLog({
    actorId: adminId, action: 'REPORT_STATUS_CHANGED',
    resourceType: 'Report', resourceId: report._id,
    details: { oldStatus, newStatus: status }, ipAddress: ip, correlationId,
  });

  return { report };
};

export const listSystemAuditLogs = async ({ action, actorId, skip, limit }) => {
  const filter = {};
  if (action) filter.action = action;
  if (actorId) filter.actorId = actorId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).populate('actorId', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total };
};

export const createAdminAnnouncement = async ({ title, message, targetType, targetId, isPublished, adminId }) => {
  const announcement = await Announcement.create({
    title, message, targetType, targetId: targetId || null,
    isPublished: isPublished ?? false,
    publishedAt: isPublished ? new Date() : null,
    createdBy: adminId,
  });
  return { announcement };
};

export const listAdminAnnouncements = async ({ skip, limit }) => {
  const [announcements, total] = await Promise.all([
    Announcement.find().populate('createdBy', 'name role').sort({ publishedAt: -1 }).skip(skip).limit(limit),
    Announcement.countDocuments(),
  ]);
  return { announcements, total };
};

export const updateAdminAnnouncement = async (announcementId, updateData) => {
  if (updateData.isPublished && !updateData.publishedAt) {
    updateData.publishedAt = new Date();
  }
  updateData.editedAt = new Date();
  const announcement = await Announcement.findByIdAndUpdate(announcementId, updateData, { new: true });
  if (!announcement) throw notFoundError('Announcement');
  return { announcement };
};

export const deleteAdminAnnouncement = async (announcementId) => {
  const announcement = await Announcement.findByIdAndDelete(announcementId);
  if (!announcement) throw notFoundError('Announcement');
  return { success: true };
};

// ---------------------------------------------------------------------------
// Aliases — controller imports these names, service exports the ones above.
// Kept for compatibility so admin.controller.js works without changes.
// ---------------------------------------------------------------------------

export const listBuses = listAllBuses;
export const softDeleteBus = deleteBus;
export const listRoutes = listAllRoutes;
export const softDeleteRoute = deleteRoute;
export const listUsers = listAllUsers;