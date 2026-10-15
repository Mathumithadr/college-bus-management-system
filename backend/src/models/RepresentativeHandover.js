const mongoose = require('mongoose');

const representativeHandoverSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip is required'],
    },
    previousRepresentativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Previous representative is required'],
    },
    newRepresentativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'New representative is required'],
    },
    status: {
      type: String,
      // pending:    Normal handover requested, awaiting vice rep acceptance
      // accepted:   Vice rep accepted → trip.activeRepresentativeId updated atomically
      // rejected:   Vice rep declined (primary rep retains control)
      // overridden: Admin emergency forced handover (bypasses acceptance flow)
      enum: ['pending', 'accepted', 'rejected', 'overridden'],
      default: 'pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null, // Set when vice rep accepts or rejects
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Set when vice rep responds
    },
    adminOverrideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Set only on admin emergency override
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'representativeHandovers',
  }
);

representativeHandoverSchema.index({ tripId: 1, requestedAt: -1 });
representativeHandoverSchema.index({ newRepresentativeId: 1, status: 1 });

module.exports = mongoose.model('RepresentativeHandover', representativeHandoverSchema);