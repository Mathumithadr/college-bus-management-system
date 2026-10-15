const mongoose = require('mongoose');

const tripEventSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip is required'],
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: [
        'trip_started',
        'trip_ended',
        'trip_cancelled',
        'handover_requested',
        'handover_accepted',
        'handover_rejected',
        'handover_overridden',
        'delay_reported',
        'stop_confirmed',
      ],
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    eventTime: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Append-only history — no modification timestamp needed
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'tripEvents',
  }
);

tripEventSchema.index({ tripId: 1, eventTime: 1 });
// For filtered history queries: e.g., "all handover events for this trip"
tripEventSchema.index({ tripId: 1, eventType: 1, eventTime: 1 });

module.exports = mongoose.model('TripEvent', tripEventSchema);