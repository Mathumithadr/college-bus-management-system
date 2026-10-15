const mongoose = require('mongoose');

const busLocationUpdateSchema = new mongoose.Schema(
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
    representativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Representative is required'],
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be >= -90'],
      max: [90, 'Latitude must be <= 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be >= -180'],
      max: [180, 'Longitude must be <= 180'],
    },
    source: {
      type: String,
      enum: ['gps', 'manual'],
      required: true,
      default: 'gps',
    },
    accuracyMeters: {
      type: Number,
      min: 0,
      default: null,
    },
    // Manual stop identification — at least one required when source = 'manual'
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    stopName: {
      type: String,
      trim: true,
      maxlength: [100, 'Stop name cannot exceed 100 characters'],
      default: null,
    },
    recordedAt: {
      type: Date,
      required: [true, 'Recorded timestamp is required'],
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Append-only log: no updatedAt needed
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'busLocationUpdates',
  }
);

// Guard: manual source must have at least stopId or stopName
busLocationUpdateSchema.pre('validate', function (next) {
  if (this.source === 'manual' && !this.stopId && !this.stopName) {
    return next(new Error('Manual location updates require either stopId or stopName'));
  }
  next();
});

busLocationUpdateSchema.index({ tripId: 1, recordedAt: -1 });
busLocationUpdateSchema.index({ busId: 1, receivedAt: -1 });

module.exports = mongoose.model('BusLocationUpdate', busLocationUpdateSchema);