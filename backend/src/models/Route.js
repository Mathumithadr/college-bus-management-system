const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
    },
    routeNumber: {
      type: String,
      required: [true, 'Route number is required'],
      unique: true,
      trim: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference is required'],
    },
    // Array of ObjectIds referencing the Stop model
    stops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stop',
        required: true,
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: 'routes' }
);

routeSchema.index({ busId: 1 });
module.exports = mongoose.model('Route', routeSchema);