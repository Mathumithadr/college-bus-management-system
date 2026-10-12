import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    classHour: { type: Number, required: true, min: 1 },
    course: { type: String, required: true, trim: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewRemarks: { type: String, trim: true },
  },
  { timestamps: true }
);

// One request per student, date, class hour
schema.index(
  { studentId: 1, date: 1, classHour: 1 },
  { unique: true, name: 'unique_attendance_request' }
);
schema.index({ facultyId: 1, status: 1, date: 1 });
schema.index({ studentId: 1, createdAt: -1 });

export default mongoose.model('AttendanceRequest', schema);