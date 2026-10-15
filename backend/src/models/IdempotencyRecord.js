import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    clientIdentifier: { type: String, trim: true },
    operationType: { type: String, required: true, trim: true },
    idempotencyKey: { type: String, required: true, trim: true },
    requestHash: { type: String, required: true },
    status: { type: String, enum: ['processing', 'completed'], default: 'processing' },
    responseStatus: { type: Number },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

schema.index(
  { idempotencyKey: 1, operationType: 1 },
  { unique: true, name: 'unique_idempotency_key' }
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('IdempotencyRecord', schema);