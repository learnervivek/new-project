import mongoose from 'mongoose';

const itineraryItemSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
      index: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    category: {
      type: String,
      enum: ['sightseeing', 'restaurant', 'accommodation', 'transportation', 'activity'],
      default: 'activity',
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required for itinerary scheduling'],
      index: true,
    },
    startTime: {
      type: String,
      trim: true,
      default: '', // e.g. "09:30"
    },
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
      default: 60, // in minutes
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
    estimatedCost: {
      type: Number,
      min: [0, 'Estimated cost cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a trip's schedule chronologically
itineraryItemSchema.index({ trip: 1, date: 1, order: 1 });

export const ItineraryItem = mongoose.model('ItineraryItem', itineraryItemSchema);
export default ItineraryItem;
