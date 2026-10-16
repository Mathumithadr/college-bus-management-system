// Communication controller: student-scoped announcements + health
import { sendSuccess, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination } from '../../utils/pagination.js';
import {
  listStudentAnnouncements,
  listPublishedAnnouncements,
  getAnnouncementById,
  checkDatabaseHealth,
} from './communication.service.js';

// GET /api/student/announcements — student-scoped list
export const getStudentAnnouncementsController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { announcements, total } = await listStudentAnnouncements(req.user._id, { skip, limit });
    return sendPaginated(res, announcements, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

// GET /api/announcements — general published list (all authenticated roles)
export const getPublicAnnouncementsController = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { announcements, total } = await listPublishedAnnouncements({ skip, limit });
    return sendPaginated(res, announcements, buildPagination(page, limit, total));
  } catch (err) { next(err); }
};

// GET /api/announcements/:id — audience-checked single fetch
export const getAnnouncementController = async (req, res, next) => {
  try {
    const announcement = await getAnnouncementById(req.params.id, req.user);
    if (!announcement) {
      return res.status(404).json({ success: false, code: 'RESOURCE_NOT_FOUND', message: 'Announcement not found' });
    }
    return sendSuccess(res, { announcement });
  } catch (err) { next(err); }
};

// GET /api/health — flat response, never wrapped
export const healthController = (req, res) => {
  const health = checkDatabaseHealth();
  return res.status(health.statusCode).json(health.body);
};
