import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    stopName: { type: String, required: true, trim: true },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    sequence: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    routeName: { type: String, required: true, trim: true },
    routeNumber: { type: String, required: true, unique: true, trim: true },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
      index: true,
    },
    stops: {
      type: [stopSchema],
      validate: {
        validator: (stops) => stops.length > 0,
        message: 'A route must have at least one stop',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure unique sequence within a route
routeSchema.pre('validate', function (next) {
  if (this.stops && this.stops.length) {
    const sequences = this.stops.map((s) => s.sequence);
    if (new Set(sequences).size !== sequences.length) {
      return next(new Error('Stop sequences must be unique within a route'));
    }
  }
  next();
});

export default mongoose.model('Route', routeSchema);