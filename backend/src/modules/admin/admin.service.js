// Admin service: fleet management, routes, assignments, grievance resolution, and audit trail

import Stop from '../../models/Stop.js';
import Schedule from '../../models/Schedule.js';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
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
    Bus.find().skip(skip).limit(limit),
    Bus.countDocuments(),
  ]);
  return { buses, total };
};

export const getBusById = async (busId) => {
  const bus = await Bus.findById(busId);
  if (!bus) throw notFoundError('Bus');
  return { bus };
};

export const updateBus = async (busId, updateData, { adminId, ip, correlationId }) => {
  const bus = await Bus.findByIdAndUpdate(busId, updateData, { new: true, runValidators: true });
  if (!bus) throw notFoundError('Bus');
  await writeAuditLog({ actorId: adminId, action: 'BUS_UPDATED', resourceType: 'Bus', resourceId: bus._id, details: updateData, ipAddress: ip, correlationId });
  return { bus };
};

export const deleteBus = async (busId, { adminId, ip, correlationId }) => {
  const bus = await Bus.findById(busId);
  if (!bus) throw notFoundError('Bus');
  bus.availabilityStatus = 'out_of_service';
  await bus.save();
  await writeAuditLog({ actorId: adminId, action: 'BUS_DELETED', resourceType: 'Bus', resourceId: bus._id, details: { busNumber: bus.busNumber }, ipAddress: ip, correlationId });
  return { message: 'Bus marked as out_of_service' };
};

// ==================== UPDATED: ROUTE CREATION ====================
export const createRoute = async ({ routeName, routeNumber, busId, stops, adminId, ip, correlationId }) => {
  const existing = await Route.findOne({ routeNumber });
  if (existing) throw duplicateRequestError('A route with this route number already exists');

  // Validate that all provided stop IDs exist
  const validStops = await Stop.find({ _id: { $in: stops } });
  if (validStops.length !== stops.length) {
    throw validationError('One or more Stop IDs are invalid.');
  }

  const route = await Route.create({ routeName, routeNumber, busId, stops });
  await Bus.findByIdAndUpdate(busId, { currentRouteId: route._id });

  await writeAuditLog({
    actorId: adminId, action: 'ROUTE_CREATED', resourceType: 'Route',
    resourceId: route._id, details: { routeName, routeNumber, busId, stopCount: stops.length },
    ipAddress: ip, correlationId
  });

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
  const route = await Route.findById(routeId);
  if (!route) throw notFoundError('Route');
  route.isActive = false;
  await route.save();
  await writeAuditLog({ actorId: adminId, action: 'ROUTE_DELETED', resourceType: 'Route', resourceId: route._id, details: { routeNumber: route.routeNumber }, ipAddress: ip, correlationId });
  return { message: 'Route deactivated' };
};

export const listAllUsers = async ({ role, skip, limit }) => {
  const filter = {};
  if (role) filter.role = role;
  const [users, total] = await Promise.all([
    User.find(filter).select('-passwordHash').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { users, total };
};

export const updateUserRole = async (userId, newRole, { adminId, ip, correlationId }) => {
  const user = await User.findById(userId);
  if (!user) throw notFoundError('User');
  const oldRole = user.role;
  user.role = newRole;
  await user.save();
  await writeAuditLog({ actorId: adminId, action: 'USER_ROLE_CHANGED', resourceType: 'User', resourceId: user._id, details: { oldRole, newRole }, ipAddress: ip, correlationId });
  return { user: user.toObject() };
};

export const toggleUserStatus = async (userId, { adminId, ip, correlationId }) => {
  const user = await User.findById(userId);
  if (!user) throw notFoundError('User');
  user.isActive = !user.isActive;
  await user.save();
  await writeAuditLog({ actorId: adminId, action: 'USER_STATUS_TOGGLED', resourceType: 'User', resourceId: user._id, details: { isActive: user.isActive }, ipAddress: ip, correlationId });
  return { user: user.toObject() };
};

// ==================== UPDATED: STUDENT ASSIGNMENT (Capacity Check) ====================
export const assignStudentToBus = async ({ studentId, busId, routeId, boardingStopId, forceOverbook = false, adminId, ip, correlationId }) => {
  // 1. Check Bus Capacity
  const bus = await Bus.findById(busId);
  if (!bus) throw notFoundError('Bus');

  const currentAssignments = await StudentBusAssignment.countDocuments({ busId, status: 'active' });

  if (currentAssignments >= bus.capacity && !forceOverbook) {
    throw stateConflictError(`Bus capacity (${bus.capacity}) reached. Provide forceOverbook=true to override.`);
  }

  // 2. Deactivate old assignment
  await StudentBusAssignment.findOneAndUpdate(
    { studentId, status: 'active' },
    { status: 'inactive' }
  );

  // 3. Create new assignment
  const assignment = await StudentBusAssignment.create({
    studentId, busId, routeId, boardingStopId, assignedBy: adminId,
  });

  await writeAuditLog({
    actorId: adminId, action: 'STUDENT_ASSIGNED', resourceType: 'StudentBusAssignment',
    resourceId: assignment._id, details: { studentId, busId, boardingStopId, overbooked: forceOverbook }, ipAddress: ip, correlationId,
  });

  return { assignment };
};

export const assignRepresentative = async ({ studentId, busId, type, adminId, ip, correlationId }) => {
  const student = await User.findById(studentId);
  if (!student) throw notFoundError('Student User');
  if (student.role !== 'student') throw validationError('Only users with role "student" can be assigned as representatives');

  const bus = await Bus.findById(busId);
  if (!bus) throw notFoundError('Bus');

  const existingSameType = await RepresentativeAssignment.findOne({ busId, type, status: 'active' });
  if (existingSameType && existingSameType.studentId.toString() !== studentId.toString()) {
    throw stateConflictError(`Bus already has an active ${type} representative`);
  }

  const existingOtherRole = await RepresentativeAssignment.findOne({
    studentId,
    status: 'active',
    $or: [{ busId: { $ne: busId } }, { type: { $ne: type } }],
  });
  if (existingOtherRole) {
    throw stateConflictError('Student already has an active representative assignment elsewhere');
  }

  const assignment = await RepresentativeAssignment.findOneAndUpdate(
    { studentId, busId, type },
    { status: 'active', assignedBy: adminId, assignedAt: new Date() },
    { upsert: true, new: true, runValidators: true }
  );

  if (!student.permissions.includes('representative')) {
    student.permissions.push('representative');
    await student.save();
  }

  await writeAuditLog({
    actorId: adminId,
    action: 'REPRESENTATIVE_ASSIGNED',
    resourceType: 'RepresentativeAssignment',
    resourceId: assignment._id,
    details: { studentId, busId, type },
    ipAddress: ip,
    correlationId,
  });

  return { assignment };
};

export const updateReportStatusAdmin = async (reportId, { status, adminNotes }, { adminId, ip, correlationId }) => {
  const report = await Report.findById(reportId);
  if (!report) throw notFoundError('Report');

  const allowedTransitions = REPORT_TRANSITIONS[report.status] || [];
  if (!allowedTransitions.includes(status)) {
    throw stateConflictError(`Invalid report status transition from '${report.status}' to '${status}'. Allowed: ${allowedTransitions.join(', ')}`);
  }

  const previousStatus = report.status;
  report.status = status;
  if (adminNotes !== undefined) report.adminNotes = adminNotes;
  if (status === 'resolved' || status === 'closed') report.resolvedAt = new Date();
  await report.save();

  await ReportStatusHistory.create({
    reportId: report._id,
    previousStatus,
    newStatus: status,
    changedBy: adminId,
    reason: adminNotes || 'Admin status update',
  });

  await writeAuditLog({
    actorId: adminId,
    action: 'REPORT_STATUS_UPDATED',
    resourceType: 'Report',
    resourceId: report._id,
    details: { previousStatus, newStatus: status, adminNotes },
    ipAddress: ip,
    correlationId,
  });

  return { report };
};

export const listAllReportsAdmin = async ({ status, category, severity, skip, limit }) => {
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (severity) filter.severity = severity;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('studentId', 'name email department')
      .populate('busId', 'busNumber')
      .populate('routeId', 'routeNumber routeName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments(filter),
  ]);
  return { reports, total };
};

export const getAuditLogs = async ({ actorId, action, startDate, endDate, skip, limit }) => {
  const filter = {};
  if (actorId) filter.actorId = actorId;
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return { logs, total };
};

export const createAdminAnnouncement = async ({ title, message, priority, targetAudience, expiresAt, adminId, ip, correlationId }) => {
  const announcement = await Announcement.create({
    title,
    message,
    priority: priority || 'normal',
    targetAudience: targetAudience || ['all'],
    createdBy: adminId,
    isPublished: true,
    publishedAt: new Date(),
    expiresAt: expiresAt || null,
  });

  await writeAuditLog({
    actorId: adminId,
    action: 'ANNOUNCEMENT_CREATED',
    resourceType: 'Announcement',
    resourceId: announcement._id,
    details: { title, priority, targetAudience },
    ipAddress: ip,
    correlationId,
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
// Aliases
// ---------------------------------------------------------------------------

export const listBuses = listAllBuses;
export const softDeleteBus = deleteBus;
export const listRoutes = listAllRoutes;
export const softDeleteRoute = deleteRoute;
export const listUsers = listAllUsers;
export const assignRepresentativeToBus = assignRepresentative;
export const listAllReports = listAllReportsAdmin;
export const transitionReportStatus = updateReportStatusAdmin;
export const listSystemAuditLogs = getAuditLogs;
export const createUser = async () => {};
export const getUserById = async () => {};
export const updateUser = async () => {};
export const listBusAssignments = async (type = 'students') => {
  if (type === 'students') {
    const assignments = await StudentBusAssignment.find({ status: 'active' })
      .populate('studentId', 'name email')
      .populate('busId', 'busNumber')
      .populate('routeId', 'routeName');
    return { assignments };
  }
  return { assignments: [] };
};

// ==================== STOPS ====================
export const createStop = async ({ name, latitude, longitude, adminId, ip, correlationId }) => {
  const existing = await Stop.findOne({ name });
  if (existing) throw duplicateRequestError('A stop with this name already exists');

  const stop = await Stop.create({ name, latitude, longitude });

  await writeAuditLog({
    actorId: adminId, action: 'STOP_CREATED', resourceType: 'Stop',
    resourceId: stop._id, details: { name, latitude, longitude }, ipAddress: ip, correlationId
  });

  return { stop };
};

export const listAllStops = async () => {
  const stops = await Stop.find({ isActive: true }).sort({ name: 1 });
  return { stops };
};

// ==================== SCHEDULES ====================
export const activateSchedule = async ({ date, dayType, routeId, busId, adminId, ip, correlationId }) => {
  // Deactivate any existing active schedule for this exact date
  await Schedule.updateMany({ date, isActive: true }, { isActive: false });

  const schedule = await Schedule.create({
    date, dayType, routeId, busId, isActive: true
  });

  await writeAuditLog({
    actorId: adminId, action: 'SCHEDULE_ACTIVATED', resourceType: 'Schedule',
    resourceId: schedule._id, details: { date, dayType, routeId, busId }, ipAddress: ip, correlationId
  });

  return { schedule };
};

// ==================== CSV IMPORT (SMART & IDEMPOTENT) ====================
export const importStudentsFromCSV = async (fileBuffer, adminId, ip, correlationId) => {
  const results = [];
  const stream = Readable.from(fileBuffer);
  const warnings = []; // To store capacity alerts

  return new Promise((resolve, reject) => {
    stream
      .pipe(csvParser())
      .on('data', (data) => {
        // Clean the keys (remove BOM, trim spaces, lowercase)
        const cleanRow = {};
        for (const key in data) {
          cleanRow[key.replace(/^\ufeff/, '').trim().toLowerCase()] = data[key]?.trim();
        }
        if (results.length < 1000) {
          results.push(cleanRow);
        }
      })
      .on('end', async () => {
        try {
          console.log(`\n📥 CSV Parsing finished. Found ${results.length} rows.`);

          if (results.length > 0) {
            console.log('🔍 First row keys found:', Object.keys(results[0]));
            console.log('🔍 First row values:', results[0]);
          }

          const processedStudents = [];
          let skipped = 0;

          for (const row of results) {
            // 1. Validate fields
            if (!row.registernumber || !row.name || !row.email || !row.boardingstop) {
              console.log(`❌ Skipping row: Missing fields ->`, row);
              skipped++;
              continue;
            }

            // 2. Check if user exists
            let user = await User.findOne({ email: row.email });
            let isNewUser = false;

            if (!user) {
              // Create user if not exists
              const passwordHash = await hashPassword('Password123!');
              user = await User.create({
                name: row.name,
                email: row.email,
                passwordHash,
                role: 'student',
                department: row.department || 'General',
                phone: row.phonenumber || null
              });
              isNewUser = true;
              console.log(`👤 Created new user: ${user.email}`);
            } else {
              console.log(`👤 User exists: ${user.email}`);
            }

            // 3. Check if they already have an active assignment
            const existingAssignment = await StudentBusAssignment.findOne({
              studentId: user._id,
              status: 'active'
            });

            if (existingAssignment) {
              console.log(`⏭️ Skipping assignment: ${user.email} is already on a bus.`);
              if (isNewUser) processedStudents.push(user.email);
              skipped++;
              continue;
            }

            // 4. Find the stop by name
            const cleanStopName = row.boardingstop.trim();
            const baseStopName = cleanStopName.split('(')[0].trim();
            const stop = await Stop.findOne({ name: { $regex: new RegExp(`^${baseStopName}`, 'i') } });

            if (stop) {
              // 5. Find ALL routes that contain this stop
              const routes = await Route.find({ stops: stop._id }).populate('busId');

              if (routes.length > 0) {
                // Load Balancing Logic
                let bestRoute = null;
                let lowestCount = Infinity;

                for (const route of routes) {
                  const studentCount = await StudentBusAssignment.countDocuments({
                    busId: route.busId._id,
                    status: 'active'
                  });
                  const capacity = route.busId.capacity || 50;

                  // 🚨 CAPACITY CHECK
                  if (studentCount >= capacity) {
                    warnings.push(`Bus ${route.busId.busNumber} is FULL (${studentCount}/${capacity}). Could not assign ${user.email}.`);
                    continue;
                  }

                  if (studentCount < lowestCount) {
                    lowestCount = studentCount;
                    bestRoute = route;
                  }
                }

                if (!bestRoute) {
                  // All routes full
                  warnings.push(`ALL buses full for stop "${stop.name}". Could not assign ${user.email}.`);
                  skipped++;
                  continue;
                }

                // 6. Create the assignment
                await StudentBusAssignment.create({
                  studentId: user._id,
                  busId: bestRoute.busId._id,
                  routeId: bestRoute._id,
                  boardingStopId: stop._id,
                  assignedBy: adminId,
                  status: 'active'
                });

                console.log(`✅ Assigned ${user.email} to Bus ${bestRoute.busId.busNumber}`);
                processedStudents.push(user.email);
              } else {
                console.log(`❌ Skipping row: Stop exists but no route -> ${stop.name}`);
                skipped++;
              }
            } else {
              console.log(`❌ Skipping row: Stop not found in DB -> "${row.boardingstop}"`);
              skipped++;
            }
          }

          console.log(`\n🏁 Import finished. Success: ${processedStudents.length}, Skipped: ${skipped}`);
          if (warnings.length > 0) {
            console.log(`⚠️ Capacity Warnings: ${warnings.length}`);
          }

          resolve({
            message: `Imported and assigned ${processedStudents.length} students successfully.`,
            importedCount: processedStudents.length,
            skippedCount: skipped,
            warnings: warnings // Send capacity alerts to frontend
          });
        } catch (err) {
          console.error('❌ Fatal error during CSV processing:', err);
          reject(err);
        }
      })
      .on('error', (err) => {
        console.error('❌ CSV Parse Error:', err);
        reject(err);
      });
  });
};

// ==================== STAFF MANAGEMENT (Instructor) ====================

export const createStaffUser = async ({ 
  name, email, password, department, phone, adminId, ip, correlationId 
}) => {
  // 1. Normalize email (workflow: "Normalize email")
  const normalizedEmail = email.toLowerCase().trim();

  // 2. Duplicate check (workflow: "Database duplicate check")
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw duplicateRequestError('An account with this email already exists');
  }

  // 3. Hash password (workflow: "Store a secure password hash, never plaintext")
  const passwordHash = await hashPassword(password);

  // 4. Create user (workflow: "Begin transaction → Create Staff account")
  //    Role is forced to 'staff' — the frontend cannot override this.
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'staff',
    department: department || null,
    phone: phone || null,
    isActive: true, // Recommendation: Immediate ACTIVE
  });

  // 5. Audit record (workflow: "Create audit record" — part of atomicity)
  await writeAuditLog({
    actorId: adminId,
    action: 'STAFF_CREATED',
    resourceType: 'User',
    resourceId: user._id,
    details: { email: normalizedEmail, department, createdBy: adminId },
    ipAddress: ip,
    correlationId,
  });

  // 6. Return sanitized user
  const userObj = user.toObject();
  delete userObj.passwordHash;

  return { user: userObj };
};

export const listAllStaff = async ({ skip = 0, limit = 20 } = {}) => {
  const [staff, total] = await Promise.all([
    User.find({ role: 'staff' })
      .select('-passwordHash')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments({ role: 'staff' }),
  ]);
  return { staff, total };
};

export const toggleStaffStatus = async (userId, { adminId, ip, correlationId }) => {
  const user = await User.findById(userId);
  if (!user) throw notFoundError('User');
  if (user.role !== 'staff') {
    throw validationError('Only staff accounts can be toggled');
  }

  user.isActive = !user.isActive;
  await user.save();

  await writeAuditLog({
    actorId: adminId,
    action: user.isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
    resourceType: 'User',
    resourceId: user._id,
    details: { isActive: user.isActive },
    ipAddress: ip,
    correlationId,
  });
  return { user: user.toObject() };
};

// ==================== LATE BUSES ====================
export const listLateBuses = async () => {
  const Trip = (await import('../../models/Trip.js')).default;

  const lateBuses = await Trip.find({
    delayStatus: 'delayed',
    tripStatus: 'in_progress'
  })
    .populate('busId', 'busNumber')
    .populate('routeId', 'routeName routeNumber')
    .populate('activeRepresentativeId', 'name email')
    .sort({ startTime: -1 });

  return { lateBuses };
};