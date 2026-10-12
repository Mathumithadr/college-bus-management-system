import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    eventType: {
      type: String,
      enum: [
        'trip_started',
        'trip_ended',
        'trip_cancelled',
        'handover_requested',
        'handover_accepted',
        'handover_rejected',
        'handover_overridden',
      ],
      required: true,
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    eventTime: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ tripId: 1, eventTime: 1 });

export default mongoose.model('TripEvent', schema);