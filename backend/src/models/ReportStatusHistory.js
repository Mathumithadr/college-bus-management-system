import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    oldStatus: { type: String },
    newStatus: { type: String, required: true },
    note: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ reportId: 1, changedAt: 1 });

export default mongoose.model('ReportStatusHistory', schema);