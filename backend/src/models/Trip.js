import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    activeRepresentativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    tripStatus: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
      default: 'not_started',
    },
    delayStatus: {
      type: String,
      enum: ['on_time', 'delayed'],
      default: 'on_time',
    },
  },
  { timestamps: true }
);

schema.index({ busId: 1, tripStatus: 1 });
schema.index({ routeId: 1, startTime: -1 });
schema.index({ activeRepresentativeId: 1, tripStatus: 1 });

// Prevent multiple active trips per bus (application-level enforcement recommended too)
schema.index(
  { busId: 1 },
  {
    unique: true,
    partialFilterExpression: { tripStatus: 'in_progress' },
    name: 'one_active_trip_per_bus',
  }
);

export default mongoose.model('Trip', schema);