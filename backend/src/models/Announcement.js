const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message body is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: ['general', 'route', 'bus'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // Required when targetType is 'route' or 'bus'
      // Must be null when targetType is 'general'
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'announcements',
  }
);

// Conditional validation: targetId must be consistent with targetType
announcementSchema.pre('validate', function (next) {
  if (this.targetType === 'general' && this.targetId) {
    return next(new Error('General announcements must not have a targetId'));
  }
  if (this.targetType !== 'general' && !this.targetId) {
    return next(
      new Error(`Announcements with targetType '${this.targetType}' require a targetId`)
    );
  }
  next();
});

announcementSchema.index({ isPublished: 1, publishedAt: -1 });
announcementSchema.index({ targetType: 1, targetId: 1, publishedAt: -1 });
// For admin dashboard: "show my announcements" filter
announcementSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);