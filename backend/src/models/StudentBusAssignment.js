const mongoose = require('mongoose');

const studentBusAssignmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus is required'],
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route is required'],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigning admin is required'],
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'studentBusAssignments',
  }
);

// One student can have exactly ONE active assignment at any time
studentBusAssignmentSchema.index(
  { studentId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
studentBusAssignmentSchema.index({ busId: 1, status: 1 });
studentBusAssignmentSchema.index({ routeId: 1, status: 1 });

module.exports = mongoose.model('StudentBusAssignment', studentBusAssignmentSchema);