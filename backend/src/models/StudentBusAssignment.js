import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

schema.index({ studentId: 1, status: 1 });
schema.index({ busId: 1, status: 1 });
schema.index({ routeId: 1, status: 1 });

// Enforce one active assignment per student
schema.index(
  { studentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'one_active_assignment_per_student',
  }
);

export default mongoose.model('StudentBusAssignment', schema);