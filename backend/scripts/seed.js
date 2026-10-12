import { connectDB } from '../src/config/database.js';
import mongoose from 'mongoose';
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

    console.log('👤 Creating users...');
    const admin = new User({
      name: 'Admin User',
      email: 'admin@college.edu',
      role: 'admin',
      permissions: ['MANAGE_BUSES', 'MANAGE_ROUTES', 'MANAGE_ASSIGNMENTS'],
    });
    await admin.setPassword('Admin@123');

    const staff = new User({
      name: 'Staff User',
      email: 'staff@college.edu',
      role: 'staff',
    });
    await staff.setPassword('Staff@123');

    const student = new User({
      name: 'John Student',
      email: 'student@college.edu',
      role: 'student',
    });
    await student.setPassword('Student@123');

    const rep = new User({
      name: 'Rep User',
      email: 'rep@college.edu',
      role: 'representative',
      permissions: ['TRIP_UPDATE'],
    });
    await rep.setPassword('Rep@123');

    await Promise.all([admin.save(), staff.save(), student.save(), rep.save()]);

    console.log('🚌 Creating buses...');
    const bus1 = await Bus.create({
      busNumber: 'BUS-001',
      registrationNumber: 'KA01AB1234',
      capacity: 50,
      availabilityStatus: 'available',
    });

    console.log('🛣️  Creating routes...');
    const route1 = await Route.create({
      routeName: 'Route A - City Center',
      routeNumber: 'R-A',
      busId: bus1._id,
      stops: [
        { stopName: 'Main Gate', latitude: 12.9716, longitude: 77.5946, sequence: 1 },
        { stopName: 'City Center', latitude: 12.975, longitude: 77.6, sequence: 2 },
        { stopName: 'Campus', latitude: 12.98, longitude: 77.61, sequence: 3 },
      ],
    });

    console.log('📋 Creating assignments...');
    await StudentBusAssignment.create({
      studentId: student._id,
      busId: bus1._id,
      routeId: route1._id,
      assignedBy: admin._id,
      status: 'active',
    });

    await RepresentativeAssignment.create({
      representativeId: rep._id,
      busId: bus1._id,
      routeId: route1._id,
      assignedBy: admin._id,
      status: 'active',
    });

    console.log('✅ Seed completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Admin:  admin@college.edu / Admin@123');
    console.log('   Staff:  staff@college.edu / Staff@123');
    console.log('   Student: student@college.edu / Student@123');
    console.log('   Rep:    rep@college.edu / Rep@123');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();