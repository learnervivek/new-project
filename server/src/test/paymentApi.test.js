import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Settlement from '../models/Settlement.js';
import PaymentOrder from '../models/PaymentOrder.js';

describe('TripTally Razorpay Online Payments & Settlement APIs', () => {
  let user1Cookie = '';
  let user2Cookie = '';
  let user3Cookie = '';
  let user1Id = '';
  let user2Id = '';
  let user3Id = '';
  let tripId = '';
  let pendingSettlementId = '';
  let createdPaymentOrderId = '';
  let createdRazorpayOrderId = '';

  const user1 = {
    name: 'Ada Lovelace',
    email: `ada.rzp.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const user2 = {
    name: 'Charles Babbage',
    email: `charles.rzp.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const user3 = {
    name: 'Alan Turing',
    email: `alan.rzp.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

    // Set test env secrets
    process.env.RAZORPAY_KEY_ID = 'rzp_test_TripTallyKeyDemo123';
    process.env.RAZORPAY_KEY_SECRET = 'TripTallySecretKeyTest456';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'TripTallyWebhookSecretTest789';

    // Register users
    const res1 = await request(app).post('/api/auth/register').send(user1);
    user1Cookie = res1.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    user1Id = String(res1.body.user.id || res1.body.user._id);

    const res2 = await request(app).post('/api/auth/register').send(user2);
    user2Cookie = res2.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    user2Id = String(res2.body.user.id || res2.body.user._id);

    const res3 = await request(app).post('/api/auth/register').send(user3);
    user3Cookie = res3.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    user3Id = String(res3.body.user.id || res3.body.user._id);

    // Create a trip with user1 as owner and user2 as accepted editor member
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Cookie', user1Cookie)
      .send({
        title: 'Analytical Engine Expedition',
        destination: 'London, UK',
        startDate: '2026-11-01',
        endDate: '2026-11-10',
        currency: 'USD',
        budget: 5000,
      });

    tripId = String(tripRes.body.trip._id);

    // Add user2 as accepted member
    await Trip.findByIdAndUpdate(tripId, {
      $push: {
        members: [{ user: user2Id, role: 'editor', status: 'accepted' }],
      },
    });
  });

  afterAll(async () => {
    if (tripId) {
      await PaymentOrder.deleteMany({ trip: tripId });
      await Settlement.deleteMany({ trip: tripId });
      await Trip.findByIdAndDelete(tripId);
    }
    await User.deleteMany({
      email: { $in: [user1.email, user2.email, user3.email] },
    });
  });

  describe('GET /api/payments/config', () => {
    it('returns Razorpay configuration status and public test keyId', async () => {
      const res = await request(app).get('/api/payments/config');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.enabled).toBe(true);
      expect(res.body.testMode).toBe(true);
      expect(res.body.keyId).toBe('rzp_test_TripTallyKeyDemo123');
      expect(res.body.merchantArrangement).toContain('Merchant Settlement Collection');
    });
  });

  describe('POST /api/trips/:tripId/payments/create-order', () => {
    it('denies order creation to non-members of the trip', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripId}/payments/create-order`)
        .set('Cookie', user3Cookie) // user3 is not in trip
        .send({
          payeeId: user1Id,
          amount: 5000,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('creates a pending settlement and Razorpay order when given payee and amount', async () => {
      // User2 (debtor) creates an order to pay User1 (creditor) $50.00 (5000 cents)
      const res = await request(app)
        .post(`/api/trips/${tripId}/payments/create-order`)
        .set('Cookie', user2Cookie)
        .send({
          payeeId: user1Id,
          amount: 5000,
          notes: 'Reimbursement for train tickets',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.amount).toBe(5000);
      expect(res.body.order.currency).toBe('USD');
      expect(res.body.order.id).toMatch(/^order_/);
      expect(res.body.settlementId).toBeDefined();

      createdRazorpayOrderId = res.body.order.id;
      createdPaymentOrderId = res.body.paymentOrderId;
      pendingSettlementId = res.body.settlementId;

      // Verify settlement in database is in 'pending' status
      const settlement = await Settlement.findById(pendingSettlementId);
      expect(settlement).toBeDefined();
      expect(settlement.status).toBe('pending');
      expect(settlement.paymentMethod).toBe('razorpay');
      expect(String(settlement.payer)).toBe(user2Id);
      expect(String(settlement.payee)).toBe(user1Id);
    });

    it('rejects order creation if payer and payee are the same member', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripId}/payments/create-order`)
        .set('Cookie', user2Cookie)
        .send({
          payeeId: user2Id,
          amount: 2500,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot be the same');
    });

    it('enforces that only the designated debtor/payer can initiate payment for an existing settlement', async () => {
      // User1 tries to pay User2's debt
      const res = await request(app)
        .post(`/api/trips/${tripId}/payments/create-order`)
        .set('Cookie', user1Cookie)
        .send({
          settlementId: pendingSettlementId,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the designated debtor/payer can initiate online payment');
    });
  });

  describe('POST /api/trips/:tripId/payments/verify', () => {
    it('rejects an invalid cryptographic payment signature', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripId}/payments/verify`)
        .set('Cookie', user2Cookie)
        .send({
          orderId: createdRazorpayOrderId,
          paymentId: 'pay_test_bogus_123',
          signature: 'invalid_forged_signature_hex_value',
          paymentOrderId: createdPaymentOrderId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid payment signature');

      // Order should be marked failed
      const order = await PaymentOrder.findById(createdPaymentOrderId);
      expect(order.status).toBe('failed');
      expect(order.failureReason).toContain('signature verification failed');
    });

    it('verifies a valid cryptographic signature, marks payment paid, and completes settlement', async () => {
      const paymentId = `pay_test_${Date.now()}`;
      const payload = `${createdRazorpayOrderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest('hex');

      const res = await request(app)
        .post(`/api/trips/${tripId}/payments/verify`)
        .set('Cookie', user2Cookie)
        .send({
          orderId: createdRazorpayOrderId,
          paymentId,
          signature: validSignature,
          paymentOrderId: createdPaymentOrderId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.paymentOrder.status).toBe('paid');
      expect(res.body.paymentOrder.razorpayPaymentId).toBe(paymentId);
      expect(res.body.settlement.status).toBe('completed');

      // Verify in database
      const order = await PaymentOrder.findById(createdPaymentOrderId);
      expect(order.status).toBe('paid');
      expect(order.paidAt).toBeDefined();

      const settlement = await Settlement.findById(pendingSettlementId);
      expect(settlement.status).toBe('completed');
    });

    it('handles duplicate verification idempotently without re-processing', async () => {
      const paymentId = `pay_test_${Date.now()}`;
      const payload = `${createdRazorpayOrderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest('hex');

      const res = await request(app)
        .post(`/api/trips/${tripId}/payments/verify`)
        .set('Cookie', user2Cookie)
        .send({
          orderId: createdRazorpayOrderId,
          paymentId,
          signature: validSignature,
          paymentOrderId: createdPaymentOrderId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('already been verified');
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('rejects webhook requests without signature or with invalid signature', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ event: 'payment.captured' });

      expect(res.status).toBe(400);

      const fakeRes = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', 'invalid_signature')
        .send({ event: 'payment.captured' });

      expect(fakeRes.status).toBe(400);
      expect(fakeRes.body.message).toContain('Invalid webhook signature');
    });

    it('processes verified payment.captured webhook event idempotently', async () => {
      // Create a second pending settlement and order to test webhook
      const newSettlement = await Settlement.create({
        trip: tripId,
        payer: user2Id,
        payee: user1Id,
        amount: 3000,
        currency: 'USD',
        paymentMethod: 'razorpay',
        status: 'pending',
        recordedBy: user2Id,
      });

      const webhookOrderId = `order_webhook_${Date.now()}`;
      const newOrder = await PaymentOrder.create({
        trip: tripId,
        settlement: newSettlement._id,
        payer: user2Id,
        payee: user1Id,
        amount: 3000,
        currency: 'USD',
        razorpayOrderId: webhookOrderId,
        status: 'created',
      });

      const webhookEventId = `evt_test_${Date.now()}`;
      const webhookPayload = {
        event: 'payment.captured',
        event_id: webhookEventId,
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_success_999',
              order_id: webhookOrderId,
              amount: 3000,
              currency: 'USD',
              status: 'captured',
            },
          },
        },
      };

      const rawString = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawString)
        .digest('hex');

      // First webhook delivery
      const res1 = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawString);

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      // Verify order and settlement marked paid
      const updatedOrder = await PaymentOrder.findById(newOrder._id);
      expect(updatedOrder.status).toBe('paid');
      expect(updatedOrder.razorpayPaymentId).toBe('pay_webhook_success_999');

      const updatedSettlement = await Settlement.findById(newSettlement._id);
      expect(updatedSettlement.status).toBe('completed');

      // Duplicate delivery with same event_id
      const res2 = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawString);

      expect(res2.status).toBe(200);
      expect(res2.body.message).toContain('already processed');
    });

    it('processes verified payment.failed webhook event and marks order failed', async () => {
      const failedOrderId = `order_failed_${Date.now()}`;
      const failedOrder = await PaymentOrder.create({
        trip: tripId,
        settlement: pendingSettlementId,
        payer: user2Id,
        payee: user1Id,
        amount: 2000,
        currency: 'USD',
        razorpayOrderId: failedOrderId,
        status: 'created',
      });

      const webhookPayload = {
        event: 'payment.failed',
        event_id: `evt_fail_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_123',
              order_id: failedOrderId,
              error_description: 'Card declined by issuing bank',
            },
          },
        },
      };

      const rawString = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawString)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawString);

      expect(res.status).toBe(200);

      const dbOrder = await PaymentOrder.findById(failedOrder._id);
      expect(dbOrder.status).toBe('failed');
      expect(dbOrder.failureReason).toContain('Card declined');
    });
  });

  describe('GET /api/trips/:tripId/payments', () => {
    it('retrieves chronological payment order history for the trip', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/payments`)
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.payments)).toBe(true);

      const payment = res.body.payments.find((p) => p.razorpayOrderId === createdRazorpayOrderId);
      expect(payment).toBeDefined();
      expect(payment.status).toBe('paid');
      expect(payment.payer).toBeDefined();
      expect(payment.payee).toBeDefined();
    });

    it('retrieves a single payment order by ID', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/payments/${createdPaymentOrderId}`)
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.payment._id).toBe(createdPaymentOrderId);
      expect(res.body.payment.razorpayOrderId).toBe(createdRazorpayOrderId);
    });
  });
});
