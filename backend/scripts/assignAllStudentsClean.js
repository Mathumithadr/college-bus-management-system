import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../src/config/database.js';
import User from '../src/models/User.js';
import Bus from '../src/models/Bus.js';
import Route from '../src/models/Route.js';
import Stop from '../src/models/Stop.js';
import StudentBusAssignment from '../src/models/StudentBusAssignment.js';

dotenv.config();

const assignStudents = async () => {
  await connectDB();
  console.log('🚀 Assigning 81 students cleanly...\n');

  const admin = await User.findOne({ role: 'admin' });
  const students = await User.find({ role: 'student' });
  const routes = await Route.find().populate('busId');
  const stops = await Stop.find();

  console.log(`👨‍🎓 Students: ${students.length}`);
  console.log(`🛣️ Routes: ${routes.length}`);
  console.log(`🚏 Stops: ${stops.length}\n`);

  let assignedCount = 0;

  for (const student of students) {
    // Skip if they already have an assignment
    const existing = await StudentBusAssignment.findOne({ studentId: student._id, status: 'active' });
    if (existing) continue;

    // Pick a random route (since we don't have their CSV stop saved on the User model)
    const randomRoute = routes[Math.floor(Math.random() * routes.length)];
    const randomStop = stops[Math.floor(Math.random() * stops.length)];

    await StudentBusAssignment.create({
      studentId: student._id,
      busId: randomRoute.busId._id,
      routeId: randomRoute._id,
      boardingStopId: randomStop._id,
      assignedBy: admin._id,
      status: 'active'
    });
    assignedCount++;
  }

  console.log(`✅ Assigned ${assignedCount} students to buses.`);

  // Verify no duplicates
  const finalCount = await StudentBusAssignment.countDocuments({ status: 'active' });
  console.log(`📊 Total active assignments: ${finalCount}`);
  process.exit(0);
};

assignStudents();