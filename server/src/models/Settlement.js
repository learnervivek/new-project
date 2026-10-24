import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer is required'],
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payee is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Settlement amount is required'],
      min: [1, 'Settlement amount must be at least 1 minor unit'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer in minor units (e.g. cents or paise)',
      },
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'venmo', 'paypal', 'bank_transfer', 'razorpay', 'other'],
      default: 'upi',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
      index: true,
    },
    paymentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentOrder',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying settlements by trip
settlementSchema.index({ trip: 1, date: -1 });

export const Settlement = mongoose.model('Settlement', settlementSchema);
export default Settlement;
