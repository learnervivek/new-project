import mongoose from 'mongoose';

const packingItemSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [100, 'Item name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      enum: ['clothing', 'documents', 'medicines', 'electronics', 'essentials', 'toiletries', 'other'],
      default: 'essentials',
      index: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isPacked: {
      type: Boolean,
      default: false,
      index: true,
    },
    packedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    packedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [250, 'Notes cannot exceed 250 characters'],
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying items by category and status
packingItemSchema.index({ trip: 1, category: 1, isPacked: 1 });
packingItemSchema.index({ trip: 1, assignedTo: 1 });

export const PackingItem = mongoose.model('PackingItem', packingItemSchema);
export default PackingItem;
