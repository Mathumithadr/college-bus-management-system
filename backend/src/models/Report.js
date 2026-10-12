import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    storageKey: { type: String, required: true },
    originalFilename: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: [
        'bus_delay',
        'driver_staff_behaviour',
        'bus_condition',
        'route_stop_issue',
        'other',
      ],
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    photoAttachments: [attachmentSchema],
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'more_information_required',
        'resolved',
        'rejected',
        'closed',
      ],
      default: 'submitted',
    },
    adminNote: { type: String, trim: true },
    resolution: { type: String, trim: true },
    parentReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

schema.index({ studentId: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Report', schema);