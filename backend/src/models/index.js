const User = require('./User.js');
const Bus = require('./Bus.js');
const Route = require('./Route.js');
const StudentBusAssignment = require('./StudentBusAssignment.js');
const RepresentativeAssignment = require('./RepresentativeAssignment.js');
const Trip = require('./Trip.js');
const BusLocationUpdate = require('./BusLocationUpdate.js');
const RepresentativeHandover = require('./RepresentativeHandover.js');
const TripUpdate = require('./TripUpdate.js');
const TripEvent = require('./TripEvent.js');
const AttendanceRequest = require('./AttendanceRequest.js');
const Report = require('./Report.js');
const ReportStatusHistory = require('./ReportStatusHistory.js');
const Announcement = require('./Announcement.js');
const AuditLog = require('./AuditLog.js');
const IdempotencyRecord = require('./IdempotencyRecord.js');
const TokenRevocation = require('./TokenRevocation.js');

module.exports = {
  User,
  Bus,
  Route,
  StudentBusAssignment,
  RepresentativeAssignment,
  Trip,
  BusLocationUpdate,
  RepresentativeHandover,
  TripUpdate,
  TripEvent,
  AttendanceRequest,
  Report,
  ReportStatusHistory,
  Announcement,
  AuditLog,
  IdempotencyRecord,
  TokenRevocation,
};