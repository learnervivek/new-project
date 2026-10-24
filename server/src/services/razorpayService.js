import crypto from 'crypto';
import Razorpay from 'razorpay';

/**
 * Check if Razorpay keys are configured in environment variables
 */
export const isRazorpayConfigured = () => {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
};

/**
 * Get client-safe Razorpay configuration
 */
export const getRazorpayConfig = () => {
  const configured = isRazorpayConfigured();
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const isTestMode = keyId.startsWith('rzp_test_') || process.env.NODE_ENV === 'test' || !keyId.startsWith('rzp_live_');

  return {
    enabled: configured,
    keyId: configured ? keyId : '',
    testMode: isTestMode,
    merchantArrangement: 'TripTally Merchant Settlement Collection (Standard merchant account receives settlement credit)',
    notes: configured
      ? 'Razorpay test mode is active. Online settlements will create verified test orders.'
      : 'Razorpay credentials not configured. Manual settlements are fully supported.',
  };
};

/**
 * Initialize Razorpay SDK client if credentials exist
 */
const getRazorpayClient = () => {
  if (!isRazorpayConfigured()) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * Create a Razorpay Order
 * @param {Object} params
 * @param {number} params.amount - Amount in minor units (e.g. paise / cents)
 * @param {string} params.currency - 3-letter currency code (e.g. INR, USD)
 * @param {string} params.receipt - Internal reference string (max 40 chars)
 * @param {Object} params.notes - Optional key-value notes
 */
export const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay credentials are not configured on this server');
  }

  const razorpay = getRazorpayClient();
  const options = {
    amount: Math.round(amount),
    currency: currency.toUpperCase(),
    receipt: receipt ? String(receipt).slice(0, 40) : `rcpt_${Date.now()}`,
    notes,
  };

  try {
    // If running in test mode or using simulated dev credentials, generate safe test order
    const isMockKey =
      process.env.RAZORPAY_KEY_ID.includes('demo') ||
      process.env.RAZORPAY_KEY_ID.includes('mock') ||
      process.env.NODE_ENV === 'test';

    if (isMockKey) {
      return {
        id: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        status: 'created',
        attempts: 0,
        notes: options.notes,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    // Call live Razorpay API
    return await razorpay.orders.create(options);
  } catch (err) {
    console.error('[RazorpayService] Failed to create order via SDK:', err.message);
    throw new Error(`Failed to create Razorpay order: ${err.message}`);
  }
};

/**
 * Verify Razorpay payment signature
 * signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error('[RazorpayService] Signature verification error:', err.message);
    return false;
  }
};

/**
 * Verify Razorpay Webhook signature
 * signature in 'x-razorpay-signature' header = HMAC-SHA256(rawBody, webhookSecret)
 */
export const verifyWebhookSignature = ({ rawBody, signature }) => {
  if (!rawBody || !signature) {
    return false;
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return false;
  }

  try {
    const rawString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawString)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error('[RazorpayService] Webhook signature verification error:', err.message);
    return false;
  }
};

export default {
  isRazorpayConfigured,
  getRazorpayConfig,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
