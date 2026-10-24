import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';

describe('TripTally Complete Trip Management & Permissions APIs', () => {
  let user1Cookie = '';
  let user2Cookie = '';
  let tripId = '';

  const user1 = {
    name: 'Marco Polo',
    email: `marco.mgmt.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const user2 = {
    name: 'Ibn Battuta',
    email: `battuta.mgmt.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

    const res1 = await request(app).post('/api/auth/register').send(user1);
    user1Cookie = res1.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];

    const res2 = await request(app).post('/api/auth/register').send(user2);
    user2Cookie = res2.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [user1.email, user2.email] } });
    if (tripId) {
      await Trip.findByIdAndDelete(tripId);
    }
  });

  it('POST /api/trips - rejects trip when end date precedes start date', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Cookie', user1Cookie)
      .send({
        title: 'Time Travel Journey',
        destination: 'Venice, Italy',
        startDate: '2026-10-15',
        endDate: '2026-10-01', // Before start date
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/end date must be on or after start date/i);
  });

  it('POST /api/trips/upload-banner - uploads custom trip banner successfully', async () => {
    const bannerBuffer = Buffer.from('fake-banner-jpg-content');
    const res = await request(app)
      .post('/api/trips/upload-banner')
      .set('Cookie', user1Cookie)
      .attach('banner', bannerBuffer, 'banner.jpg');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bannerUrl).toBeDefined();
    expect(res.body.bannerUrl).toMatch(/^\/uploads\/banners\//);
  });

  it('POST /api/trips - creates trip successfully', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Cookie', user1Cookie)
      .send({
        title: 'Venice Carnival Expedition',
        destination: 'Venice, Italy',
        description: 'Mask festivals and historic gondola routes.',
        budget: 3200,
        currency: 'EUR',
        startDate: '2026-11-01',
        endDate: '2026-11-08',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.trip.title).toBe('Venice Carnival Expedition');
    tripId = res.body.trip._id;
  });

  it('GET /api/trips - supports pagination and search filtering', async () => {
    const res = await request(app)
      .get('/api/trips?search=Venice&page=1&limit=5')
      .set('Cookie', user1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('totalPages');
    expect(res.body.trips.length).toBeGreaterThanOrEqual(1);
  });

  it('PUT /api/trips/:id - allows owner to update trip details', async () => {
    const res = await request(app)
      .put(`/api/trips/${tripId}`)
      .set('Cookie', user1Cookie)
      .send({
        title: 'Venice & Murano Glass Tour',
        budget: 3600,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.trip.title).toBe('Venice & Murano Glass Tour');
    expect(res.body.trip.budget).toBe(3600);
  });

  it('PUT /api/trips/:id - rejects unauthorized non-member from updating trip', async () => {
    const res = await request(app)
      .put(`/api/trips/${tripId}`)
      .set('Cookie', user2Cookie) // user 2 is not a member
      .send({
        title: 'Hijacked Title',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/trips/:id/archive - toggles trip archived status', async () => {
    const res = await request(app)
      .patch(`/api/trips/${tripId}/archive`)
      .set('Cookie', user1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('archived');

    // Unarchive
    const resUnarchive = await request(app)
      .patch(`/api/trips/${tripId}/archive`)
      .set('Cookie', user1Cookie);

    expect(resUnarchive.status).toBe(200);
    expect(resUnarchive.body.status).toBe('planning');
  });

  it('DELETE /api/trips/:id - rejects non-owner with 403 Forbidden', async () => {
    const res = await request(app)
      .delete(`/api/trips/${tripId}`)
      .set('Cookie', user2Cookie); // user 2 is not owner

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only the trip creator\/owner can delete/i);
  });

  it('DELETE /api/trips/:id - permits owner to delete trip and cleans up', async () => {
    const res = await request(app)
      .delete(`/api/trips/${tripId}`)
      .set('Cookie', user1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify trip is deleted
    const checkRes = await request(app).get(`/api/trips/${tripId}`).set('Cookie', user1Cookie);
    expect(checkRes.status).toBe(404);
  });
});
