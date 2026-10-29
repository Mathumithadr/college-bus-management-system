// Seed script to initialize default Admin, Staff, Student, and Fleet data in MongoDB
import { connectDB } from '../src/config/database.js';
import mongoose from 'mongoose';
import { hashPassword } from '../src/utils/password.js';
import {
  User,
  Bus,
  Route,
  StudentBusAssignment,
  RepresentativeAssignment,
} from '../src/models/index.js';

const seed = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Bus.deleteMany({}),
      Route.deleteMany({}),
      StudentBusAssignment.deleteMany({}),
      RepresentativeAssignment.deleteMany({}),
    ]);

    console.log('👤 Creating users with bcrypt password hashes...');
    const adminPasswordHash = await hashPassword('Admin@123');
    const studentPasswordHash = await hashPassword('Student@123');
    const staffPasswordHash = await hashPassword('Staff@123');

    // 1. Admin Account
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@college.edu',
      passwordHash: adminPasswordHash,
      role: 'admin',
      permissions: ['MANAGE_BUSES', 'MANAGE_ROUTES', 'MANAGE_ASSIGNMENTS'],
      isActive: true,
    });

    // Also create admin@test.com for convenience
    await User.create({
      name: 'Admin Test',
      email: 'admin@test.com',
      passwordHash: await hashPassword('Password123!'),
      role: 'admin',
      isActive: true,
    });

    // 2. Staff / Faculty Account
    const staff = await User.create({
      name: 'Dr. Ramesh Kumar',
      email: 'staff@college.edu',
      passwordHash: staffPasswordHash,
      role: 'staff',
      department: 'Computer Science',
      isActive: true,
    });

    // 3. Regular Student Account
    const student = await User.create({
      name: 'Alex Kumar',
      email: 'student@college.edu',
      passwordHash: studentPasswordHash,
      role: 'student',
      department: 'Computer Science',
      isActive: true,
    });

    // 4. Student Representative (Role is 'student', rep granted via RepresentativeAssignment)
    const repStudent = await User.create({
      name: 'Rohan Sharma',
      email: 'rep@college.edu',
      passwordHash: studentPasswordHash,
      role: 'student',
      department: 'Mechanical',
      phone: '+919876543211',
      isActive: true,
    });

    console.log('🚌 Creating fleet buses...');
    const bus1 = await Bus.create({
      busNumber: 'Bus B-12',
      registrationNumber: 'TN01AB1234',
      capacity: 55,
      availabilityStatus: 'available',
      isActive: true,
    });

    console.log('🛣️ Creating transit routes and stops...');
    const route1 = await Route.create({
      routeName: 'Route 5 - South City',
      routeNumber: 'R05',
      busId: bus1._id,
      isActive: true,
      stops: [
        { stopName: 'Central Gate', sequence: 1, latitude: 13.0827, longitude: 80.2707 },
        { stopName: 'Tech Park Gate', sequence: 2, latitude: 13.0855, longitude: 80.2755 },
        { stopName: 'Campus North', sequence: 3, latitude: 13.0890, longitude: 80.2800 },
      ],
    });

    // Link route to bus cache
    bus1.currentRouteId = route1._id;
    await bus1.save();

    console.log('📋 Assigning students and representatives...');
    await StudentBusAssignment.create({
      studentId: student._id,
      busId: bus1._id,
      routeId: route1._id,
      assignedBy: admin._id,
      status: 'active',
    });

    await RepresentativeAssignment.create({
      representativeId: repStudent._id,
      busId: bus1._id,
      routeId: route1._id,
      roleType: 'primary',
      assignedBy: admin._id,
      status: 'active',
    });

    console.log('\n=========================================');
    console.log('✅ Database seeded successfully!');
    console.log('=========================================');
    console.log('\n🔑 AVAILABLE LOGIN CREDENTIALS:');
    console.log('   👨‍💼 Admin:      admin@college.edu  /  Admin@123');
    console.log('   👨‍💼 Admin (alt):admin@test.com     /  Password123!');
    console.log('   👨‍🎓 Student:    student@college.edu /  Student@123');
    console.log('   🚌 Rep:        rep@college.edu     /  Student@123');
    console.log('   👨‍🏫 Faculty:    staff@college.edu   /  Staff@123');
    console.log('=========================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
