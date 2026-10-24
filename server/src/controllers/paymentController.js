import mongoose from 'mongoose';
import { z } from 'zod';
import Trip from '../models/Trip.js';
import Settlement from '../models/Settlement.js';
import PaymentOrder from '../models/PaymentOrder.js';
import razorpayService from '../services/razorpayService.js';
import { logTripActivity } from '../services/activityService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Helper to verify user is an accepted member or owner of the trip
 */
const verifyTripAccess = async (tripId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(tripId)) {
    const error = new Error('Invalid trip ID');
    error.statusCode = 400;
    throw error;
  }

  const trip = await Trip.findById(tripId).populate('owner', 'name email avatar');
  if (!trip) {
    const error = new Error('Trip not found');
    error.statusCode = 404;
    throw error;
  }

  const isOwner = String(trip.owner?._id || trip.owner) === String(userId);
  const memberRecord = trip.members.find(
    (m) => String(m.user?._id || m.user) === String(userId) && m.status === 'accepted'
  );

  if (!isOwner && !memberRecord) {
    const error = new Error('Access denied: You are not an accepted member of this trip');
    error.statusCode = 403;
    throw error;
  }

  const role = isOwner ? 'owner' : memberRecord.role;
  const canEdit = ['owner', 'organizer', 'editor'].includes(role);

  return { trip, role, canEdit, isOwner };
};

/**
 * @route   GET /api/payments/config
 * @desc    Get client-safe Razorpay configuration and availability status
 * @access  Public / Authenticated
 */
export const getPaymentConfig = async (req, res) => {
  const config = razorpayService.getRazorpayConfig();
  res.json({
    success: true,
    ...config,
  });
};

const createOrderSchema = z.object({
  settlementId: z.string().optional(),
  payeeId: z.string().optional(),
  amount: z.number().int().positive().optional(),
  notes: z.string().max(250).optional(),
});

/**
 * @route   POST /api/trips/:tripId/payments/create-order
 * @desc    Create a Razorpay order for a settlement
 * @access  Private (Trip Members)
 */
export const createPaymentOrder = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { trip, canEdit } = await verifyTripAccess(tripId, req.user._id);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Viewers cannot initiate settlement payments',
      });
    }

    if (!razorpayService.isRazorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Razorpay online payments are currently disabled (server credentials unavailable). Please record settlements manually.',
      });
    }

    const validatedData = createOrderSchema.parse(req.body);

    let settlement = null;
    let amount = 0;
    let currency = trip.currency || 'INR';
    let payeeId = null;

    // Case 1: Initiating payment for an existing recorded settlement
    if (validatedData.settlementId) {
      if (!mongoose.Types.ObjectId.isValid(validatedData.settlementId)) {
        return res.status(400).json({ success: false, message: 'Invalid settlement ID' });
      }

      settlement = await Settlement.findOne({
        _id: validatedData.settlementId,
        trip: tripId,
      });

      if (!settlement) {
        return res.status(404).json({ success: false, message: 'Settlement not found' });
      }

      if (settlement.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'This settlement has already been completed and marked as paid',
        });
      }

      // Authorization: Only the designated payer can initiate payment for their debt!
      if (String(settlement.payer) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: Only the designated debtor/payer can initiate online payment for this settlement',
        });
      }

      amount = settlement.amount;
      currency = settlement.currency || currency;
      payeeId = settlement.payee;
    }
    // Case 2: Direct online settlement creation
    else if (validatedData.payeeId && validatedData.amount) {
      payeeId = validatedData.payeeId;
      amount = validatedData.amount;

      if (String(payeeId) === String(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: 'Payer and payee cannot be the same member',
        });
      }

      // Check if payee is a member of the trip
      const isPayeeOwner = String(trip.owner?._id || trip.owner) === String(payeeId);
      const isPayeeMember = trip.members.some(
        (m) => String(m.user?._id || m.user) === String(payeeId) && m.status === 'accepted'
      );

      if (!isPayeeOwner && !isPayeeMember) {
        return res.status(400).json({
          success: false,
          message: 'Payee must be an accepted member of this trip',
        });
      }

      // Create settlement in pending state
      settlement = await Settlement.create({
        trip: tripId,
        payer: req.user._id,
        payee: payeeId,
        amount,
        currency,
        paymentMethod: 'razorpay',
        status: 'pending',
        notes: validatedData.notes || 'Online settlement via Razorpay',
        recordedBy: req.user._id,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either settlementId or (payeeId and amount) is required to create a payment order',
      });
    }

    // Create Razorpay Order via SDK/Service
    const rzpOrder = await razorpayService.createRazorpayOrder({
      amount,
      currency,
      receipt: `set_${settlement._id.toString()}`,
      notes: {
        tripId: tripId.toString(),
        settlementId: settlement._id.toString(),
        payerId: req.user._id.toString(),
        payeeId: payeeId.toString(),
      },
    });

    // Create PaymentOrder record in database
    const paymentOrder = await PaymentOrder.create({
      trip: tripId,
      settlement: settlement._id,
      payer: req.user._id,
      payee: payeeId,
      amount,
      currency,
      razorpayOrderId: rzpOrder.id,
      status: 'created',
      notes: validatedData.notes || settlement.notes || '',
      metadata: {
        receipt: rzpOrder.receipt,
        merchantArrangement: 'TripTally Merchant Settlement Collection',
      },
    });

    // Link paymentOrder to settlement
    settlement.paymentOrder = paymentOrder._id;
    settlement.paymentMethod = 'razorpay';
    await settlement.save();

    res.status(201).json({
      success: true,
      order: {
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID || '',
      },
      paymentOrderId: paymentOrder._id,
      settlementId: settlement._id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(err);
  }
};

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().min(1, 'Signature is required'),
  paymentOrderId: z.string().optional(),
});

/**
 * @route   POST /api/trips/:tripId/payments/verify
 * @desc    Cryptographically verify payment signature and mark settlement paid
 * @access  Private (Trip Members)
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { trip } = await verifyTripAccess(tripId, req.user._id);

    const { orderId, paymentId, signature, paymentOrderId } = verifyPaymentSchema.parse(req.body);

    // Find the payment order
    const query = { trip: tripId, razorpayOrderId: orderId };
    if (paymentOrderId && mongoose.Types.ObjectId.isValid(paymentOrderId)) {
      query._id = paymentOrderId;
    }

    const paymentOrder = await PaymentOrder.findOne(query);
    if (!paymentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Payment order record not found',
      });
    }

    // Idempotent: If already paid, return existing success state
    if (paymentOrder.status === 'paid') {
      const existingSettlement = await Settlement.findById(paymentOrder.settlement)
        .populate('payer', 'name email avatar')
        .populate('payee', 'name email avatar');

      return res.status(200).json({
        success: true,
        message: 'Payment has already been verified and settlement is completed',
        paymentOrder,
        settlement: existingSettlement,
      });
    }

    // Server-side cryptographic signature check
    const isSignatureValid = razorpayService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isSignatureValid) {
      // Mark payment order as failed
      await PaymentOrder.findByIdAndUpdate(paymentOrder._id, {
        status: 'failed',
        failureReason: 'Cryptographic signature verification failed',
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment cannot be verified.',
      });
    }

    // Atomic conditional update on PaymentOrder to prevent duplicate executions
    const updatedOrder = await PaymentOrder.findOneAndUpdate(
      { _id: paymentOrder._id, status: { $ne: 'paid' } },
      {
        $set: {
          status: 'paid',
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          paidAt: new Date(),
          failureReason: null,
        },
      },
      { new: true }
    )
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar');

    // Atomic update on associated Settlement to mark completed
    const updatedSettlement = await Settlement.findOneAndUpdate(
      { _id: paymentOrder.settlement, status: { $ne: 'completed' } },
      {
        $set: {
          status: 'completed',
          paymentMethod: 'razorpay',
          paymentOrder: paymentOrder._id,
        },
      },
      { new: true }
    )
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar');

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'settlement_add',
      entityType: 'settlement',
      entityId: updatedSettlement._id,
      summary: `Verified online payment of ${(updatedOrder.amount / 100).toFixed(2)} ${updatedOrder.currency} via Razorpay from ${updatedOrder.payer?.name || 'Traveler'} to ${updatedOrder.payee?.name || 'Traveler'}`,
      metadata: {
        paymentMethod: 'razorpay',
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        amountMajor: updatedOrder.amount / 100,
        currency: updatedOrder.currency,
        payerName: updatedOrder.payer?.name,
        payeeName: updatedOrder.payee?.name,
      },
    });

    // Notify payee about the verified online payment
    if (updatedOrder.payee?._id && String(updatedOrder.payee._id) !== String(req.user._id)) {
      await createNotification({
        recipientId: updatedOrder.payee._id,
        senderId: req.user._id,
        tripId,
        type: 'settlement_created',
        title: 'Settlement Payment Received (Razorpay)',
        message: `${updatedOrder.payer?.name || 'A companion'} paid ${(updatedOrder.amount / 100).toFixed(2)} ${updatedOrder.currency} to settle balance online via Razorpay.`,
        link: `/trips/${tripId}`,
        metadata: {
          amount: updatedOrder.amount,
          currency: updatedOrder.currency,
          paymentMethod: 'razorpay',
          razorpayPaymentId: paymentId,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully and settlement marked completed',
      paymentOrder: updatedOrder,
      settlement: updatedSettlement,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(err);
  }
};

/**
 * @route   POST /api/payments/webhook
 * @desc    Process verified Razorpay webhook events idempotently
 * @access  Public (Protected by Razorpay cryptographic HMAC signature)
 */
export const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
  }

  // Use raw request body buffer captured in express.json verify hook
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const isValid = razorpayService.verifyWebhookSignature({
    rawBody,
    signature,
  });

  if (!isValid) {
    console.warn('[RazorpayWebhook] Rejected webhook with invalid signature');
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const event = req.body.event;
  const eventId =
    req.body.event_id ||
    req.headers['x-razorpay-event-id'] ||
    `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const payload = req.body.payload || {};

  try {
    // 1. Payment Captured or Order Paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = payload.payment?.entity?.order_id || payload.order?.entity?.id;
      const paymentId = payload.payment?.entity?.id;

      if (orderId) {
        const order = await PaymentOrder.findOne({ razorpayOrderId: orderId });
        if (order) {
          // Idempotency check: has this event already been processed?
          const alreadyProcessed = order.webhookEvents?.some((e) => e.eventId === eventId);
          if (alreadyProcessed) {
            return res.status(200).json({ success: true, message: 'Event already processed' });
          }

          // Atomic conditional update
          await PaymentOrder.findByIdAndUpdate(order._id, {
            $set: {
              status: 'paid',
              razorpayPaymentId: paymentId || order.razorpayPaymentId,
              paidAt: order.paidAt || new Date(),
            },
            $push: {
              webhookEvents: {
                eventId,
                eventType: event,
                receivedAt: new Date(),
                payload,
              },
            },
          });

          // Mark settlement as completed
          await Settlement.findByIdAndUpdate(order.settlement, {
            $set: {
              status: 'completed',
              paymentMethod: 'razorpay',
            },
          });
        }
      }
    }
    // 2. Payment Failed
    else if (event === 'payment.failed') {
      const orderId = payload.payment?.entity?.order_id;
      const failureReason = payload.payment?.entity?.error_description || 'Payment transaction failed';

      if (orderId) {
        const order = await PaymentOrder.findOne({ razorpayOrderId: orderId });
        if (order && order.status !== 'paid') {
          await PaymentOrder.findByIdAndUpdate(order._id, {
            $set: {
              status: 'failed',
              failureReason,
            },
            $push: {
              webhookEvents: {
                eventId,
                eventType: event,
                receivedAt: new Date(),
                payload,
              },
            },
          });

          await Settlement.findByIdAndUpdate(order.settlement, {
            $set: { status: 'failed' },
          });
        }
      }
    }
    // 3. Refund Processed
    else if (event === 'refund.processed' || event === 'payment.refunded') {
      const paymentId = payload.refund?.entity?.payment_id || payload.payment?.entity?.id;

      if (paymentId) {
        const order = await PaymentOrder.findOne({ razorpayPaymentId: paymentId });
        if (order) {
          await PaymentOrder.findByIdAndUpdate(order._id, {
            $set: {
              status: 'refunded',
              refundedAt: new Date(),
            },
            $push: {
              webhookEvents: {
                eventId,
                eventType: event,
                receivedAt: new Date(),
                payload,
              },
            },
          });

          await Settlement.findByIdAndUpdate(order.settlement, {
            $set: { status: 'refunded' },
          });
        }
      }
    }

    res.status(200).json({ success: true, received: true, event });
  } catch (err) {
    console.error('[RazorpayWebhook] Error processing event:', err.message);
    res.status(500).json({ success: false, message: 'Internal error processing webhook' });
  }
};

/**
 * @route   GET /api/trips/:tripId/payments
 * @desc    Get payment history and orders for a trip
 * @access  Private (Trip Members)
 */
export const getTripPaymentHistory = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    await verifyTripAccess(tripId, req.user._id);

    const payments = await PaymentOrder.find({ trip: tripId })
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar')
      .populate('settlement')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trips/:tripId/payments/:paymentOrderId
 * @desc    Get details for a single payment order
 * @access  Private (Trip Members)
 */
export const getPaymentOrderDetails = async (req, res, next) => {
  try {
    const { tripId, paymentOrderId } = req.params;
    await verifyTripAccess(tripId, req.user._id);

    if (!mongoose.Types.ObjectId.isValid(paymentOrderId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment order ID' });
    }

    const payment = await PaymentOrder.findOne({
      _id: paymentOrderId,
      trip: tripId,
    })
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar')
      .populate('settlement');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment order not found' });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getPaymentConfig,
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getTripPaymentHistory,
  getPaymentOrderDetails,
};
