const mongoose = require('mongoose');

const representativeAssignmentSchema = new mongoose.Schema(
  {
    representativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Representative is required'],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus is required'],
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route is required'],
    },
    roleType: {
      type: String,
      enum: ['primary', 'vice'],
      required: [true, 'Role type (primary or vice) is required'],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigning admin is required'],
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'representativeAssignments',
  }
);

// One active primary AND one active vice rep per bus (each enforced separately)
representativeAssignmentSchema.index(
  { busId: 1, roleType: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
representativeAssignmentSchema.index({ representativeId: 1, status: 1 });
representativeAssignmentSchema.index({ routeId: 1, status: 1 });

// Guard: the same user cannot be BOTH primary and vice on the same bus
// Note: Full enforcement is also in the controller. This hook catches model-level saves.
representativeAssignmentSchema.pre('save', async function (next) {
  if (this.isNew && this.status === 'active') {
    const RepresentativeAssignment = this.constructor;
    const oppositeRole = this.roleType === 'primary' ? 'vice' : 'primary';
    const conflict = await RepresentativeAssignment.findOne({
      busId: this.busId,
      representativeId: this.representativeId,
      roleType: oppositeRole,
      status: 'active',
    });
    if (conflict) {
      return next(
        new Error(
          `User ${this.representativeId} is already the ${oppositeRole} representative for this bus`
        )
      );
    }
  }
  next();
});

module.exports = mongoose.model('RepresentativeAssignment', representativeAssignmentSchema);