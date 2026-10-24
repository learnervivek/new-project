import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import ItineraryItem from '../models/ItineraryItem.js';

describe('TripTally Daily Itinerary Planner APIs', () => {
  let ownerCookie = '';
  let viewerCookie = '';
  let strangerCookie = '';
  let tripId = '';
  let ownerUser = null;
  let viewerUser = null;
  let strangerUser = null;
  let createdItemId = '';

  const ownerData = {
    name: 'Marco Explorer',
    email: `marco.itin.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const viewerData = {
    name: 'Victor Viewer',
    email: `victor.itin.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const strangerData = {
    name: 'Sid Stranger',
    email: `sid.itin.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

    const res1 = await request(app).post('/api/auth/register').send(ownerData);
    ownerCookie = res1.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    ownerUser = res1.body.user;

    const res2 = await request(app).post('/api/auth/register').send(viewerData);
    viewerCookie = res2.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    viewerUser = res2.body.user;

    const res3 = await request(app).post('/api/auth/register').send(strangerData);
    strangerCookie = res3.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    strangerUser = res3.body.user;

    // Create trip: 2026-10-10 to 2026-10-15
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Cookie', ownerCookie)
      .send({
        title: 'Kyoto Cultural Immersion',
        destination: 'Kyoto, Japan',
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        budget: 3500,
        currency: 'JPY',
      });

    tripId = tripRes.body.trip._id;

    // Add viewer as trip member
    await Trip.findByIdAndUpdate(tripId, {
      $push: {
        members: {
          user: viewerUser.id,
          role: 'viewer',
          status: 'accepted',
          joinedAt: new Date(),
        },
      },
    });
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: [ownerData.email, viewerData.email, strangerData.email] },
    });
    if (tripId) {
      await Trip.findByIdAndDelete(tripId);
      await ItineraryItem.deleteMany({ trip: tripId });
    }
  });

  it('POST /api/trips/:tripId/itinerary - successfully schedules an activity within trip dates', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/itinerary`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Fushimi Inari Morning Hike',
        category: 'sightseeing',
        date: '2026-10-11',
        startTime: '08:00',
        duration: 120,
        location: 'Fushimi Ward, Kyoto',
        notes: 'Wear comfortable walking shoes. Red torii gates hike.',
        estimatedCost: 1500,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item).toBeDefined();
    expect(res.body.item.title).toBe('Fushimi Inari Morning Hike');
    expect(res.body.item.category).toBe('sightseeing');
    expect(res.body.item.estimatedCost).toBe(1500);

    createdItemId = res.body.item._id;
  });

  it('POST /api/trips/:tripId/itinerary - rejects activity scheduled before trip start date', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/itinerary`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Early Arrival Tea',
        category: 'restaurant',
        date: '2026-10-05', // Before 2026-10-10
        startTime: '10:00',
        duration: 45,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot be before the trip's start date/i);
  });

  it('POST /api/trips/:tripId/itinerary - rejects activity scheduled after trip end date', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/itinerary`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Late Departure Ramen',
        category: 'restaurant',
        date: '2026-10-20', // After 2026-10-15
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot be after the trip's end date/i);
  });

  it('POST /api/trips/:tripId/itinerary - viewer cannot add activity (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/itinerary`)
      .set('Cookie', viewerCookie)
      .send({
        title: 'Unauthorized Tea Ceremony',
        category: 'activity',
        date: '2026-10-12',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/trips/:tripId/itinerary - non-member stranger receives 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/itinerary`)
      .set('Cookie', strangerCookie)
      .send({
        title: 'Stranger Intrusion',
        category: 'activity',
        date: '2026-10-12',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/trips/:tripId/itinerary - lists scheduled activities with totals and day grouping', async () => {
    // Add a second activity on the same day
    await request(app)
      .post(`/api/trips/${tripId}/itinerary`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Nishiki Market Street Food Tour',
        category: 'restaurant',
        date: '2026-10-11',
        startTime: '12:30',
        duration: 90,
        estimatedCost: 3000,
      });

    const res = await request(app)
      .get(`/api/trips/${tripId}/itinerary`)
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.totalPlannedCost).toBe(4500); // 1500 + 3000
    expect(res.body.byDay['2026-10-11']).toBeDefined();
    expect(res.body.byDay['2026-10-11'].count).toBe(2);
    expect(res.body.byDay['2026-10-11'].totalCost).toBe(4500);
  });

  it('PUT /api/trips/:tripId/itinerary/:itemId - updates existing activity details', async () => {
    const res = await request(app)
      .put(`/api/trips/${tripId}/itinerary/${createdItemId}`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Fushimi Inari Sunrise & Bamboo Hike',
        duration: 150,
        estimatedCost: 2000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.title).toBe('Fushimi Inari Sunrise & Bamboo Hike');
    expect(res.body.item.duration).toBe(150);
    expect(res.body.item.estimatedCost).toBe(2000);
  });

  it('PATCH /api/trips/:tripId/itinerary/reorder - reorders daily items', async () => {
    const res = await request(app)
      .patch(`/api/trips/${tripId}/itinerary/reorder`)
      .set('Cookie', ownerCookie)
      .send({
        items: [
          { id: createdItemId, order: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await ItineraryItem.findById(createdItemId);
    expect(check.order).toBe(1);
  });

  it('DELETE /api/trips/:tripId/itinerary/:itemId - deletes activity from itinerary', async () => {
    const res = await request(app)
      .delete(`/api/trips/${tripId}/itinerary/${createdItemId}`)
      .set('Cookie', ownerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await ItineraryItem.findById(createdItemId);
    expect(check).toBeNull();
  });
});
