import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    previousRepresentativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    newRepresentativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'overridden'],
      default: 'pending',
    },
    requestedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
    adminOverrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

schema.index({ tripId: 1, requestedAt: -1 });
schema.index({ newRepresentativeId: 1, status: 1 });

export default mongoose.model('RepresentativeHandover', schema);