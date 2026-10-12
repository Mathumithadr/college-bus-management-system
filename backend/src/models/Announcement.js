import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['general', 'route', 'bus'],
      default: 'general',
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

// General announcements should not have a targetId
schema.pre('validate', function (next) {
  if (this.targetType === 'general' && this.targetId) {
    return next(new Error('General announcements must not contain targetId'));
  }
  if (this.targetType !== 'general' && !this.targetId) {
    return next(new Error('Route/bus announcements require targetId'));
  }
  next();
});

schema.index({ isPublished: 1, publishedAt: -1 });
schema.index({ targetType: 1, targetId: 1, publishedAt: -1 });

export default mongoose.model('Announcement', schema);