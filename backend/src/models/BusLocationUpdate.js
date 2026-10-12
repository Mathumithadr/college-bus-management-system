import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    representativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    source: { type: String, enum: ['gps', 'manual'], required: true },
    accuracyMeters: { type: Number, min: 0 },
    recordedAt: { type: Date, required: true, default: Date.now },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

schema.index({ tripId: 1, recordedAt: -1 });
schema.index({ busId: 1, receivedAt: -1 });

export default mongoose.model('BusLocationUpdate', schema);