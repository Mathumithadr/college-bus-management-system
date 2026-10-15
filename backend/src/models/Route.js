const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    stopName: {
      type: String,
      required: [true, 'Stop name is required'],
      trim: true,
      maxlength: [100, 'Stop name cannot exceed 100 characters'],
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
    sequence: {
      type: Number,
      required: [true, 'Sequence order is required'],
      min: 1,
    },
  },
  { _id: true }
);

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
      maxlength: [100, 'Route name cannot exceed 100 characters'],
    },
    routeNumber: {
      type: String,
      required: [true, 'Route number is required'],
      unique: true,
      trim: true,
      maxlength: [20, 'Route number cannot exceed 20 characters'],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference is required'],
    },
    stops: {
      type: [stopSchema],
      default: [],
      validate: {
        validator: function (stops) {
          // Ensure no duplicate sequence numbers within the same route
          const sequences = stops.map((s) => s.sequence);
          return sequences.length === new Set(sequences).size;
        },
        message: 'Each stop must have a unique sequence number',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'routes',
  }
);

routeSchema.index({ busId: 1 });

module.exports = mongoose.model('Route', routeSchema);