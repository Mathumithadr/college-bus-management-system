import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updateType: {
      type: String,
      enum: ['delay', 'breakdown', 'route_deviation', 'other'],
      required: true,
    },
    reason: { type: String, trim: true },
    reportedAt: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

schema.index({ tripId: 1, reportedAt: -1 });
schema.index({ busId: 1, reportedAt: -1 });

export default mongoose.model('TripUpdate', schema);