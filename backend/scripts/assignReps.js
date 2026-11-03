import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../src/config/database.js';
import User from '../src/models/User.js';
import Bus from '../src/models/Bus.js';   // 👈 ADD THIS LINE
import Route from '../src/models/Route.js';
import Stop from '../src/models/Stop.js';
import StudentBusAssignment from '../src/models/StudentBusAssignment.js';
import RepresentativeAssignment from '../src/models/RepresentativeAssignment.js';


dotenv.config();

const assignReps = async () => {
  try {
    await connectDB();
    console.log('🚀 Starting Auto-Rep Assignment...\n');

    // 1. Clear existing reps
    await RepresentativeAssignment.deleteMany({});
    await User.updateMany({ role: 'student' }, { $set: { permissions: [] } });
    console.log('🧹 Wiped old representative assignments.\n');

    // 2. Find the Admin
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ No Admin found. Please run the create-admin script first.');
      process.exit(1);
    }

    // 3. Get all routes
    const routes = await Route.find().populate('busId');

    for (const route of routes) {
      // Inside the for (const route of routes) loop:
      const existingRep = await RepresentativeAssignment.findOne({
        busId: route.busId._id,
        status: 'active'
      });
      if (existingRep) {
        console.log(`⏭️ Bus ${route.busId.busNumber} already has a rep. Skipping.`);
        continue;
      }
      if (!route.stops || route.stops.length === 0) {
        console.log(`⚠️ Route ${route.routeName} has no stops. Skipping.`);
        continue;
      }

      const firstStopId = route.stops[0];
      const firstStop = await Stop.findById(firstStopId);

      if (!firstStop) {
        console.log(`⚠️ First stop of ${route.routeName} not found. Skipping.`);
        continue;
      }

      // Find any student assigned to this route
      const anyStudent = await StudentBusAssignment.findOne({
        routeId: route._id,
        status: 'active'
      }).populate('studentId');

      if (!anyStudent) {
        console.log(`⚠️ No students found on ${route.routeName}. Skipping.`);
        continue;
      }

      const student = anyStudent.studentId;

      // Create the Representative Assignment
      await RepresentativeAssignment.create({
        representativeId: student._id,
        busId: route.busId._id,
        routeId: route._id,
        roleType: 'primary',
        assignedBy: admin._id,
        status: 'active'
      });

      // Grant the 'representative' permission
      if (!student.permissions.includes('representative')) {
        student.permissions.push('representative');
        await student.save();
      }

      console.log(`✅ Assigned Rep: ${student.name} (${student.email})`);
      console.log(`   Bus: ${route.busId.busNumber} | Route: ${route.routeName}`);
      console.log(`   Boarding Stop: ${firstStop.name}\n`);
    }

    console.log('🎉 All Representatives assigned successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to assign reps:', error);
    process.exit(1);
  }
};

assignReps();