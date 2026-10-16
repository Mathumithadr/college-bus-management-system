// Test setup: connect to test DB and seed static fixture IDs before all tests.
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import User from '../../src/models/User.js';
import Bus from '../../src/models/Bus.js';
import Route from '../../src/models/Route.js';
import RepresentativeAssignment from '../../src/models/RepresentativeAssignment.js';
import StudentBusAssignment from '../../src/models/StudentBusAssignment.js';
import { hashPassword } from '../../src/utils/password.js';

// Deterministic fixture IDs so tests can reference them by name.
export const IDS = {
  ADMIN_ID: '65f1a2b3c4d5e6f7a8b9c001',
  STAFF_ID: '65f1a2b3c4d5e6f7a8b9c002',
  PRIMARY_REP_ID: '65f1a2b3c4d5e6f7a8b9c003',
  VICE_REP_ID: '65f1a2b3c4d5e6f7a8b9c004',
  STUDENT_A_ID: '65f1a2b3c4d5e6f7a8b9c005',
  STUDENT_B_ID: '65f1a2b3c4d5e6f7a8b9c006',
  BUS_ID: '65f1a2b3c4d5e6f7a8b9c010',
  ROUTE_ID: '65f1a2b3c4d5e6f7a8b9c020',
};

// Connect to the test database with an explicit selection timeout.
export const connectTestDB = async () => {
  await mongoose.connect(env.MONGO_URI_TEST, {
    serverSelectionTimeoutMS: 20000,
  });
};

// Delete all documents from every collection (does NOT drop the database).
export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

// Cleanly disconnect without dropping the database.
export const disconnectTestDB = async () => {
  await mongoose.disconnect();
};

// Seed the standard test fixtures (users, bus, route, assignments).
export const seedFixtures = async () => {
  const password = await hashPassword('Password123!');

  await User.insertMany([
    { _id: IDS.ADMIN_ID, name: 'Admin User', email: 'admin@test.com', passwordHash: password, role: 'admin', isActive: true },
    { _id: IDS.STAFF_ID, name: 'Staff User', email: 'staff@test.com', passwordHash: password, role: 'staff', isActive: true },
    { _id: IDS.PRIMARY_REP_ID, name: 'Primary Rep', email: 'primaryrep@test.com', passwordHash: password, role: 'student', isActive: true },
    { _id: IDS.VICE_REP_ID, name: 'Vice Rep', email: 'vicerep@test.com', passwordHash: password, role: 'student', isActive: true },
    { _id: IDS.STUDENT_A_ID, name: 'Student A', email: 'studenta@test.com', passwordHash: password, role: 'student', isActive: true },
    { _id: IDS.STUDENT_B_ID, name: 'Student B', email: 'studentb@test.com', passwordHash: password, role: 'student', isActive: true },
  ]);

  await Bus.create({
    _id: IDS.BUS_ID,
    busNumber: 'BUS-01',
    registrationNumber: 'TN01AB1234',
    capacity: 40,
    isActive: true,
    currentRouteId: IDS.ROUTE_ID,
  });

  await Route.create({
    _id: IDS.ROUTE_ID,
    routeName: 'Test Route',
    routeNumber: 'R-001',
    busId: IDS.BUS_ID,
    isActive: true,
    stops: [
      { stopName: 'Stop 1', latitude: 13.0000, longitude: 80.0000, sequence: 1 },
      { stopName: 'Stop 2', latitude: 13.0005, longitude: 80.0005, sequence: 2 },
      { stopName: 'Stop 3', latitude: 13.0010, longitude: 80.0010, sequence: 3 },
    ],
  });

  await RepresentativeAssignment.insertMany([
    { representativeId: IDS.PRIMARY_REP_ID, busId: IDS.BUS_ID, routeId: IDS.ROUTE_ID, roleType: 'primary', assignedBy: IDS.ADMIN_ID, status: 'active' },
    { representativeId: IDS.VICE_REP_ID, busId: IDS.BUS_ID, routeId: IDS.ROUTE_ID, roleType: 'vice', assignedBy: IDS.ADMIN_ID, status: 'active' },
  ]);

  await StudentBusAssignment.create({
    studentId: IDS.STUDENT_A_ID,
    busId: IDS.BUS_ID,
    routeId: IDS.ROUTE_ID,
    assignedBy: IDS.ADMIN_ID,
    status: 'active',
  });
};