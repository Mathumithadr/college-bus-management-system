const mongoose = require('mongoose');

const attendanceRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'], // Stored as normalized UTC midnight
    },
    classHour: {
      type: Number,
      required: [true, 'Class hour is required'],
      min: [1, 'Class hour must be at least 1'],
      max: [10, 'Class hour cannot exceed 10'],
    },
    course: {
      type: String,
      required: [true, 'Course is required'],
      trim: true,
      maxlength: [200, 'Course name cannot exceed 200 characters'],
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty is required'],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      default: null,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    // Backend-set delay verification — staff cannot manually set these
    delayVerified: {
      type: Boolean,
      default: false,
    },
    delayVerifiedAt: {
      type: Date,
      default: null,
    },
    matchingTripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null, // The confirmed delayed trip that caused this absence
    },
    // Staff review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewRemarks: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review remarks cannot exceed 1000 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'attendanceRequests',
  }
);

// Prevents duplicate request for the same student, same date, same class period
attendanceRequestSchema.index(
  { studentId: 1, date: 1, classHour: 1 },
  { unique: true }
);
attendanceRequestSchema.index({ facultyId: 1, status: 1, date: 1 });
attendanceRequestSchema.index({ studentId: 1, createdAt: -1 });

// Normalize date to UTC midnight so the compound unique index works correctly
// regardless of client timezone offset (e.g., IST +05:30)
attendanceRequestSchema.pre('save', function (next) {
  if (this.isModified('date') && this.date) {
    const d = new Date(this.date);
    this.date = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    );
  }
  next();
});

module.exports = mongoose.model('AttendanceRequest', attendanceRequestSchema);