const mongoose = require('mongoose');

const tripUpdateSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip is required'],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus is required'],
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
    },
    updateType: {
      type: String,
      required: [true, 'Update type is required'],
      enum: ['delay', 'route_diverted', 'breakdown', 'other'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'tripUpdates',
  }
);

tripUpdateSchema.index({ tripId: 1, reportedAt: -1 });
tripUpdateSchema.index({ busId: 1, reportedAt: -1 });

module.exports = mongoose.model('TripUpdate', tripUpdateSchema);