import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Expense from '../models/Expense.js';
import ItineraryItem from '../models/ItineraryItem.js';

describe('TripTally Budget Analytics & Aggregations API', () => {
  let ownerCookie = '';
  let memberCookie = '';
  let viewerCookie = '';
  let nonMemberCookie = '';

  let ownerId = '';
  let memberId = '';
  let viewerId = '';
  let tripId = '';

  const ownerUser = {
    name: 'Marie Curie',
    email: `curie.analytics.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const memberUser = {
    name: 'Pierre Curie',
    email: `pierre.analytics.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const viewerUser = {
    name: 'Henri Becquerel',
    email: `henri.analytics.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const nonMemberUser = {
    name: 'Ernest Rutherford',
    email: `ernest.analytics.${Date.now()}@example.com`,
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

    // Create a trip with budget = $2000
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Cookie', ownerCookie)
      .send({
        title: 'Riviera Analytics Expedition',
        destination: 'Nice, France',
        startDate: '2026-08-01',
        endDate: '2026-08-07',
        currency: 'EUR',
        budget: 2000,
        budgetAlertThreshold: 75,
      });

    tripId = String(tripRes.body.trip._id);

    // Add members: Pierre as editor, Henri as viewer
    await Trip.findByIdAndUpdate(tripId, {
      $push: {
        members: [
          { user: memberId, role: 'editor', status: 'accepted' },
          { user: viewerId, role: 'viewer', status: 'accepted' },
        ],
      },
    });
  });

  afterAll(async () => {
    if (tripId) {
      await ItineraryItem.deleteMany({ trip: tripId });
      await Expense.deleteMany({ trip: tripId });
      await Trip.findByIdAndDelete(tripId);
    }
    await User.deleteMany({
      email: {
        $in: [ownerUser.email, memberUser.email, viewerUser.email, nonMemberUser.email],
      },
    });
  });

  describe('GET /api/trips/:tripId/analytics', () => {
    it('denies access to unauthenticated requests', async () => {
      const res = await request(app).get(`/api/trips/${tripId}/analytics`);
      expect(res.status).toBe(401);
    });

    it('denies access to non-members', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/analytics`)
        .set('Cookie', nonMemberCookie);
      expect(res.status).toBe(403);
    });

    it('returns clean zero/empty state when no expenses or activities exist', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/analytics`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currency).toBe('EUR');
      expect(res.body.kpis.totalBudget).toBe(2000);
      expect(res.body.kpis.totalSpent).toBe(0);
      expect(res.body.kpis.remainingBudget).toBe(2000);
      expect(res.body.kpis.percentageUsed).toBe(0);
      expect(res.body.categorySpending).toEqual([]);
      expect(res.body.dailySpendingTrend).toEqual([]);
      expect(res.body.alertStatus.level).toBe('normal');
      expect(res.body.alertStatus.threshold).toBe(75);
    });

    it('accurately aggregates planned itinerary items and logged expenses', async () => {
      // 1. Create Planned Itinerary Items
      await ItineraryItem.create([
        {
          trip: tripId,
          creator: ownerId,
          title: 'Villa Riviera Stay',
          category: 'accommodation',
          date: new Date('2026-08-01'),
          estimatedCost: 1000,
        },
        {
          trip: tripId,
          creator: ownerId,
          title: 'Seaside Bistro Dinner',
          category: 'restaurant',
          date: new Date('2026-08-02'),
          estimatedCost: 300,
        },
        {
          trip: tripId,
          creator: ownerId,
          title: 'Train to Monaco',
          category: 'transportation',
          date: new Date('2026-08-03'),
          estimatedCost: 150,
        },
      ]);

      // 2. Create Logged Expenses (in minor units: cents)
      // Lodging: €900 (90,000 cents) paid by Marie
      await request(app)
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', ownerCookie)
        .send({
          title: 'Villa Booking Deposit',
          amount: 90000,
          category: 'lodging',
          paidBy: ownerId,
          splitType: 'equal',
          participants: [ownerId, memberId, viewerId],
          date: '2026-08-01',
        });

      // Dining: €200 (20,000 cents) paid by Pierre
      await request(app)
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', memberCookie)
        .send({
          title: 'Welcome Seafood Dinner',
          amount: 20000,
          category: 'dining',
          paidBy: memberId,
          splitType: 'equal',
          participants: [ownerId, memberId, viewerId],
          date: '2026-08-02',
        });

      // Fetch analytics
      const res = await request(app)
        .get(`/api/trips/${tripId}/analytics`)
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Check KPIs: 900 + 200 = €1100 spent out of €2000 (55%)
      expect(res.body.kpis.totalBudget).toBe(2000);
      expect(res.body.kpis.totalSpent).toBe(1100);
      expect(res.body.kpis.remainingBudget).toBe(900);
      expect(res.body.kpis.percentageUsed).toBe(55);
      expect(res.body.kpis.totalPlannedCost).toBe(1450); // 1000 + 300 + 150

      // Check Category Spending Donut Data
      expect(res.body.categorySpending.length).toBe(2);
      const lodging = res.body.categorySpending.find((c) => c.category === 'lodging');
      expect(lodging.totalSpent).toBe(900);
      expect(lodging.percentage).toBeCloseTo(81.8, 1);

      // Check Planned vs Actual comparison groups
      const lodgingComp = res.body.plannedVsActual.find((p) => p.key === 'lodging');
      expect(lodgingComp.planned).toBe(1000);
      expect(lodgingComp.actual).toBe(900);
      expect(lodgingComp.variance).toBe(100);

      const diningComp = res.body.plannedVsActual.find((p) => p.key === 'dining');
      expect(diningComp.planned).toBe(300);
      expect(diningComp.actual).toBe(200);

      // Check Daily Spending Trend
      expect(res.body.dailySpendingTrend.length).toBe(2);
      expect(res.body.dailySpendingTrend[0].date).toBe('2026-08-01');
      expect(res.body.dailySpendingTrend[0].dailySpent).toBe(900);
      expect(res.body.dailySpendingTrend[0].cumulativeSpent).toBe(900);

      expect(res.body.dailySpendingTrend[1].date).toBe('2026-08-02');
      expect(res.body.dailySpendingTrend[1].dailySpent).toBe(200);
      expect(res.body.dailySpendingTrend[1].cumulativeSpent).toBe(1100);

      // Check Member Contributions
      const marieContrib = res.body.memberContributions.find(
        (m) => String(m.userId) === ownerId
      );
      expect(marieContrib.totalPaid).toBe(900);
      expect(marieContrib.percentageContributed).toBeCloseTo(81.8, 1);

      const pierreContrib = res.body.memberContributions.find(
        (m) => String(m.userId) === memberId
      );
      expect(pierreContrib.totalPaid).toBe(200);
      expect(pierreContrib.percentageContributed).toBeCloseTo(18.2, 1);
    });

    it('triggers warning alert status when spending exceeds configurable threshold', async () => {
      // Current spending is €1100 / €2000 = 55%.
      // Set alert threshold to 50%
      await Trip.findByIdAndUpdate(tripId, { budgetAlertThreshold: 50 });

      const res = await request(app)
        .get(`/api/trips/${tripId}/analytics`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(200);
      expect(res.body.alertStatus.level).toBe('warning');
      expect(res.body.alertStatus.isThresholdExceeded).toBe(true);
      expect(res.body.alertStatus.isOverBudget).toBe(false);
    });

    it('triggers danger alert status when spending exceeds total budget', async () => {
      // Add €1000 more expense, taking total to €2100 (exceeding €2000 budget)
      await request(app)
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', ownerCookie)
        .send({
          title: 'Luxury Yacht Charter',
          amount: 100000,
          category: 'activity',
          paidBy: ownerId,
          splitType: 'equal',
          participants: [ownerId, memberId],
          date: '2026-08-04',
        });

      const res = await request(app)
        .get(`/api/trips/${tripId}/analytics`)
        .set('Cookie', viewerCookie); // Viewer can read analytics

      expect(res.status).toBe(200);
      expect(res.body.kpis.totalSpent).toBe(2100);
      expect(res.body.kpis.percentageUsed).toBe(105);
      expect(res.body.alertStatus.level).toBe('danger');
      expect(res.body.alertStatus.isOverBudget).toBe(true);
    });
  });

  describe('PATCH /api/trips/:tripId/budget-alert', () => {
    it('denies threshold update by viewers (read-only)', async () => {
      const res = await request(app)
        .patch(`/api/trips/${tripId}/budget-alert`)
        .set('Cookie', viewerCookie)
        .send({ threshold: 85 });

      expect(res.status).toBe(403);
    });

    it('rejects invalid threshold values (e.g. below 10 or above 200)', async () => {
      const res = await request(app)
        .patch(`/api/trips/${tripId}/budget-alert`)
        .set('Cookie', memberCookie)
        .send({ threshold: 5 });

      expect(res.status).toBe(400);
    });

    it('allows trip editor to update threshold alert percentage', async () => {
      const res = await request(app)
        .patch(`/api/trips/${tripId}/budget-alert`)
        .set('Cookie', memberCookie)
        .send({ threshold: 90 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.budgetAlertThreshold).toBe(90);

      // Verify in DB
      const updated = await Trip.findById(tripId);
      expect(updated.budgetAlertThreshold).toBe(90);
    });
  });
});
