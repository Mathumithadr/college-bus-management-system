const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: [true, 'Bus number is required'],
      unique: true,
      trim: true,
      maxlength: [20, 'Bus number cannot exceed 20 characters'],
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      maxlength: [30, 'Registration number cannot exceed 30 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [100, 'Capacity cannot exceed 100'],
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'unavailable', 'maintenance'],
      default: 'available',
    },
    currentRouteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
      // BIDIRECTIONAL SYNC NOTE:
      // Source of truth: Route.busId
      // This field is a DENORMALIZED CACHE for fast dashboard queries.
      // The admin controller MUST update both atomically when assigning a route:
      //   1. Set Route.busId = busId
      //   2. Set Bus.currentRouteId = routeId
      // If they ever diverge, Route.busId wins.
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'buses',
  }
);

module.exports = mongoose.model('Bus', busSchema);