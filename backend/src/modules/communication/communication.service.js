// Communication service: audience-filtered announcements + health probe
import mongoose from 'mongoose';
import Announcement from '../../models/Announcement.js';
import StudentBusAssignment from '../../models/StudentBusAssignment.js';

// Build the audience filter for a specific student using their current assignment
const buildStudentFilter = async (studentId) => {
  const assignment = await StudentBusAssignment.findOne({ studentId, status: 'active' });
  const or = [{ targetType: 'general' }];
  if (assignment) {
    or.push({ targetType: 'bus', targetId: assignment.busId });
    if (assignment.routeId) or.push({ targetType: 'route', targetId: assignment.routeId });
  }
  return { isPublished: true, $or: or };
};

// List announcements scoped to a specific student's assignment
export const listStudentAnnouncements = async (studentId, { skip, limit }) => {
  const filter = await buildStudentFilter(studentId);
  const [announcements, total] = await Promise.all([
    Announcement.find(filter).populate('createdBy', 'name role').sort({ publishedAt: -1 }).skip(skip).limit(limit),
    Announcement.countDocuments(filter),
  ]);
  return { announcements, total };
};

// List all published announcements (admin/authenticated general view)
export const listPublishedAnnouncements = async ({ skip, limit }) => {
  const filter = { isPublished: true };
  const [announcements, total] = await Promise.all([
    Announcement.find(filter).populate('createdBy', 'name role').sort({ publishedAt: -1 }).skip(skip).limit(limit),
    Announcement.countDocuments(filter),
  ]);
  return { announcements, total };
};

// Fetch a single announcement, enforcing audience rules for students
export const getAnnouncementById = async (id, user) => {
  const announcement = await Announcement.findById(id).populate('createdBy', 'name role');
  if (!announcement) return null;
  if (!announcement.isPublished) return null;

  if (user.role === 'admin' || user.role === 'staff') return announcement;

  const filter = await buildStudentFilter(user._id);
  const visible = await Announcement.exists({ _id: id, ...filter });
  return visible ? announcement : null;
};

// Report DB health for the health endpoint
export const checkDatabaseHealth = () => {
  const state = mongoose.connection.readyState;
  const connected = state === 1;
  return {
    statusCode: connected ? 200 : 503,
    body: {
      status: connected ? 'ok' : 'degraded',
      db: connected ? 'connected' : 'disconnected',
      serverTime: new Date().toISOString(),
    },
  };
};
