const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    dayType: {
      type: String,
      enum: ['WEEKDAY', 'SATURDAY', 'SPECIAL'],
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: 'schedules' }
);

scheduleSchema.index({ date: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
module.exports = mongoose.model('Schedule', scheduleSchema);
