import mongoose from 'mongoose';
import crypto from 'crypto';

const tripMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['organizer', 'editor', 'viewer'],
      default: 'editor',
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined'],
      default: 'accepted',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Trip title is required'],
      trim: true,
      maxlength: [100, 'Trip title cannot exceed 100 characters'],
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (val) {
          if (!val || !this.startDate) return true;
          return val >= this.startDate;
        },
        message: 'End date must be on or after start date',
      },
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
      maxlength: [4, 'Currency code cannot exceed 4 characters'],
    },
    budget: {
      type: Number,
      default: 0,
      min: [0, 'Budget must be zero or a positive amount'],
    },
    budgetAlertThreshold: {
      type: Number,
      default: 80,
      min: [10, 'Alert threshold must be at least 10%'],
      max: [200, 'Alert threshold cannot exceed 200%'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [tripMemberSchema],
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(4).toString('hex').toUpperCase(),
    },
    status: {
      type: String,
      enum: ['planning', 'confirmed', 'ongoing', 'completed', 'archived'],
      default: 'planning',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure inviteCode is never empty
tripSchema.pre('save', function (next) {
  if (!this.inviteCode) {
    this.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

export const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
