const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
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
    activeRepresentativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Active representative is required'],
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trip starter is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    tripStatus: {
      type: String,
      // 'not_started' removed: trips are only created when the rep starts them
      enum: ['in_progress', 'completed', 'cancelled'],
      default: 'in_progress',
    },
    delayStatus: {
      type: String,
      enum: ['on_time', 'delayed'],
      default: 'on_time',
    },
    // Route progress tracking — updated by backend 3-sample accumulator ONLY
    currentStopSequence: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastConfirmedStopName: {
      type: String,
      default: null,
    },
    // GPS quality tracking
    nearStopOrder: {
      type: Number,
      default: null, // Sequence number of stop the bus is currently near
    },
    gpsQuality: {
      type: String,
      enum: ['GOOD', 'POOR', null],
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'trips',
  }
);

tripSchema.index({ busId: 1, tripStatus: 1 });
tripSchema.index({ routeId: 1, startTime: -1 });
tripSchema.index({ activeRepresentativeId: 1, tripStatus: 1 });
// Compound index for delay verification queries by staff
tripSchema.index({ busId: 1, startTime: 1, delayStatus: 1 });

module.exports = mongoose.model('Trip', tripSchema);