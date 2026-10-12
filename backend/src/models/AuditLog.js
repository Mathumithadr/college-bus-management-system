import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ createdAt: -1 });
schema.index({ actorId: 1, createdAt: -1 });
schema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
schema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', schema);