import mongoose from 'mongoose';

const tripActivitySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor reference is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['itinerary', 'expense', 'settlement', 'member', 'packing', 'trip'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    summary: {
      type: String,
      required: [true, 'Activity summary is required'],
      trim: true,
      maxlength: [200, 'Summary cannot exceed 200 characters'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying recent activities of a trip chronologically
tripActivitySchema.index({ trip: 1, createdAt: -1 });

export const TripActivity = mongoose.model('TripActivity', tripActivitySchema);
export default TripActivity;
