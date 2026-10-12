import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// TTL: remove after token naturally expires
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TokenRevocation', schema);