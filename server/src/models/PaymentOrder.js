import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const paymentOrderSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
      index: true,
    },
    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settlement',
      required: [true, 'Settlement reference is required'],
      index: true,
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer reference is required'],
      index: true,
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payee reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Amount must be at least 1 minor unit'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer in minor units (e.g. paise or cents)',
      },
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      trim: true,
      default: 'INR',
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay Order ID is required'],
      unique: true,
      sparse: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    webhookEvents: [webhookEventSchema],
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for querying orders by trip and status
paymentOrderSchema.index({ trip: 1, createdAt: -1 });
paymentOrderSchema.index({ settlement: 1, status: 1 });
paymentOrderSchema.index({ payer: 1, status: 1 });

export const PaymentOrder = mongoose.model('PaymentOrder', paymentOrderSchema);
export default PaymentOrder;
