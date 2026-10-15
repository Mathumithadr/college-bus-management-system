const mongoose = require('mongoose');

const reportStatusHistorySchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: [true, 'Report reference is required'],
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor is required'],
    },
    oldStatus: {
      type: String,
      default: null, // null on initial submission snapshot
    },
    newStatus: {
      type: String,
      required: [true, 'New status is required'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    // Append-only status trail — no updatedAt needed
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'reportStatusHistory',
  }
);

reportStatusHistorySchema.index({ reportId: 1, changedAt: 1 });

module.exports = mongoose.model('ReportStatusHistory', reportStatusHistorySchema);