import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';

describe('TripTally Group Expense Management & Settlement APIs', () => {
  let ownerCookie = '';
  let memberCookie = '';
  let viewerCookie = '';
  let nonMemberCookie = '';

  let ownerId = '';
  let memberId = '';
  let viewerId = '';
  let tripId = '';
  let expenseId = '';
  let settlementId = '';

  const ownerUser = {
    name: 'Ada Lovelace',
    email: `ada.expense.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const memberUser = {
    name: 'Charles Babbage',
    email: `babbage.expense.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const viewerUser = {
    name: 'Grace Hopper',
    email: `grace.expense.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const nonMemberUser = {
    name: 'Alan Turing',
    email: `alan.expense.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

    // Register test users
    const res1 = await request(app).post('/api/auth/register').send(ownerUser);
    ownerCookie = res1.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    ownerId = String(res1.body.user.id || res1.body.user._id);

    const res2 = await request(app).post('/api/auth/register').send(memberUser);
    memberCookie = res2.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    memberId = String(res2.body.user.id || res2.body.user._id);

    const res3 = await request(app).post('/api/auth/register').send(viewerUser);
    viewerCookie = res3.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    viewerId = String(res3.body.user.id || res3.body.user._id);

    const res4 = await request(app).post('/api/auth/register').send(nonMemberUser);
    nonMemberCookie = res4.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];

    // Create a trip with owner, an editor member, and a viewer member
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Cookie', ownerCookie)
      .send({
        title: 'Swiss Alps Expedition',
        destination: 'Zermatt, Switzerland',
        currency: 'USD',
        budget: 5000,
        startDate: '2026-08-01',
        endDate: '2026-08-10',
      });

    tripId = tripRes.body.trip._id;

    // Add member (editor) and viewer directly to trip members array
    await Trip.findByIdAndUpdate(tripId, {
      $push: {
        members: {
          $each: [
            { user: memberId, role: 'editor', status: 'accepted' },
            { user: viewerId, role: 'viewer', status: 'accepted' },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: [ownerUser.email, memberUser.email, viewerUser.email, nonMemberUser.email] },
    });
    if (tripId) {
      await Trip.findByIdAndDelete(tripId);
      await Expense.deleteMany({ trip: tripId });
      await Settlement.deleteMany({ trip: tripId });
    }
  });

  it('POST /api/trips/:id/expenses - successfully records an equal split expense', async () => {
    // Owner pays $120.00 (12000 minor units) for lodging, split among owner and member (6000 each)
    const res = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Mountain Chalet Deposit',
        amount: 12000,
        category: 'lodging',
        paidBy: ownerId,
        splitType: 'equal',
        participants: [ownerId, memberId],
        notes: 'Reservation confirmation #CH-8821',
      });

    if (res.status !== 201) {
      console.log('DEBUG TEST 1 RES:', res.status, res.body);
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.expense.title).toBe('Mountain Chalet Deposit');
    expect(res.body.expense.amount).toBe(12000);
    expect(res.body.expense.splits).toHaveLength(2);
    expect(res.body.expense.splits[0].amount).toBe(6000);
    expect(res.body.expense.splits[1].amount).toBe(6000);

    expenseId = res.body.expense._id;
  });

  it('POST /api/trips/:id/expenses - successfully records a custom split expense', async () => {
    // Member pays $100.00 (10000 minor units) for dinner: Owner $60.00 (6000), Member $40.00 (4000)
    const res = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .set('Cookie', memberCookie)
      .send({
        title: 'Fondue Feast',
        amount: 10000,
        category: 'dining',
        paidBy: memberId,
        splitType: 'custom',
        splits: [
          { user: ownerId, amount: 6000 },
          { user: memberId, amount: 4000 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.expense.splits.find((s) => s.user._id === ownerId).amount).toBe(6000);
    expect(res.body.expense.splits.find((s) => s.user._id === memberId).amount).toBe(4000);
  });

  it('POST /api/trips/:id/expenses - rejects custom split when sum does not equal total amount', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Train Tickets',
        amount: 5000,
        category: 'transport',
        paidBy: ownerId,
        splitType: 'custom',
        splits: [
          { user: ownerId, amount: 2000 },
          { user: memberId, amount: 2000 }, // sum is 4000, but amount is 5000!
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/trips/:id/expenses - forbids viewer role from creating expenses', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .set('Cookie', viewerCookie)
      .send({
        title: 'Unauthorized Coffee',
        amount: 500,
        category: 'dining',
        paidBy: viewerId,
        splitType: 'equal',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/trips/:id/expenses - lists expenses with filtering by category', async () => {
    const res = await request(app)
      .get(`/api/trips/${tripId}/expenses?category=lodging`)
      .set('Cookie', memberCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.expenses.every((e) => e.category === 'lodging')).toBe(true);
  });

  it('GET /api/trips/:id/expenses/balances - calculates authoritative balances and suggested settlements', async () => {
    // Current state:
    // Expense 1: Owner paid 12000. Owner share: 6000, Member share: 6000.
    // Expense 2: Member paid 10000. Owner share: 6000, Member share: 4000.
    //
    // Owner: Paid 12000, Share (6000 + 6000) = 12000 => Net = 0
    // Member: Paid 10000, Share (6000 + 4000) = 10000 => Net = 0
    const res = await request(app)
      .get(`/api/trips/${tripId}/expenses/balances`)
      .set('Cookie', memberCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.balances.totalSpent).toBe(22000); // 12000 + 10000
    expect(res.body.currency).toBe('USD');

    const ownerLedger = res.body.balances.memberLedgers.find((m) => m.user._id === ownerId);
    const memberLedger = res.body.balances.memberLedgers.find((m) => m.user._id === memberId);

    expect(ownerLedger.netBalance).toBe(0);
    expect(memberLedger.netBalance).toBe(0);
  });

  it('POST /api/trips/:id/settlements - records debt settlement between members', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/settlements`)
      .set('Cookie', memberCookie)
      .send({
        payer: memberId,
        payee: ownerId,
        amount: 2500, // $25.00
        paymentMethod: 'cash',
        notes: 'Handed cash at breakfast',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.settlement.amount).toBe(2500);
    expect(res.body.settlement.paymentMethod).toBe('cash');

    settlementId = res.body.settlement._id;

    // Check that balances reflect this settlement:
    // Member paid 2500 => net +2500
    // Owner received 2500 => net -2500
    const balanceRes = await request(app)
      .get(`/api/trips/${tripId}/expenses/balances`)
      .set('Cookie', ownerCookie);

    const memberLedger = balanceRes.body.balances.memberLedgers.find((m) => m.user._id === memberId);
    const ownerLedger = balanceRes.body.balances.memberLedgers.find((m) => m.user._id === ownerId);

    expect(memberLedger.netBalance).toBe(2500);
    expect(ownerLedger.netBalance).toBe(-2500);
  });

  it('DELETE /api/trips/:id/settlements/:settlementId - removes settlement and reverses balances', async () => {
    const res = await request(app)
      .delete(`/api/trips/${tripId}/settlements/${settlementId}`)
      .set('Cookie', memberCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const balanceRes = await request(app)
      .get(`/api/trips/${tripId}/expenses/balances`)
      .set('Cookie', ownerCookie);

    const memberLedger = balanceRes.body.balances.memberLedgers.find((m) => m.user._id === memberId);
    expect(memberLedger.netBalance).toBe(0);
  });

  it('DELETE /api/trips/:id/expenses/:expenseId - deletes an expense', async () => {
    const res = await request(app)
      .delete(`/api/trips/${tripId}/expenses/${expenseId}`)
      .set('Cookie', ownerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app)
      .get(`/api/trips/${tripId}/expenses/${expenseId}`)
      .set('Cookie', ownerCookie);

    expect(getRes.status).toBe(404);
  });

  it('GET /api/trips/:id/expenses - denies access to non-members', async () => {
    const res = await request(app)
      .get(`/api/trips/${tripId}/expenses`)
      .set('Cookie', nonMemberCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
