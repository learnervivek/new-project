import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import { sanitizeLogData } from '../middleware/requestLogger.js';

describe('TripTally Security, Authorization & Edge Cases APIs', () => {
  let ownerCookie = '';
  let viewerCookie = '';
  let outsiderCookie = '';
  let tripId = '';

  const ownerUser = {
    name: 'Security Admin',
    email: `sec.owner.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const viewerUser = {
    name: 'Readonly Viewer',
    email: `sec.viewer.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const outsiderUser = {
    name: 'Complete Outsider',
    email: `sec.outsider.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

    // Register 3 users
    const resOwner = await request(app).post('/api/auth/register').send(ownerUser);
    ownerCookie = resOwner.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    const ownerId = resOwner.body.user.id || resOwner.body.user._id;

    const resViewer = await request(app).post('/api/auth/register').send(viewerUser);
    viewerCookie = resViewer.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    const viewerId = resViewer.body.user.id || resViewer.body.user._id;

    const resOutsider = await request(app).post('/api/auth/register').send(outsiderUser);
    outsiderCookie = resOutsider.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];

    // Create a trip owned by ownerUser with viewerUser as a 'viewer' member
    const trip = await Trip.create({
      title: 'Security Audit Expedition',
      destination: 'Reykjavik, Iceland',
      currency: 'USD',
      budget: 5000,
      owner: ownerId,
      members: [
        {
          user: viewerId,
          role: 'viewer',
          joinedAt: new Date(),
        },
      ],
    });
    tripId = trip._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: [ownerUser.email, viewerUser.email, outsiderUser.email] },
    });
    if (tripId) {
      await Trip.findByIdAndDelete(tripId);
    }
  });

  describe('Authentication & Session Edge Cases', () => {
    it('rejects requests with an expired JWT session token', async () => {
      const secret = process.env.JWT_SECRET || 'supersecret_triptally_dev_key_change_in_production';
      // Create token that expired 1 hour ago
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId(), email: 'expired@example.com' },
        secret,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/session has expired/i);
    });

    it('rejects requests with a forged/tampered JWT signature', async () => {
      const forgedToken = jwt.sign(
        { id: new mongoose.Types.ObjectId(), email: 'hacker@example.com' },
        'completely_wrong_secret_signature',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired or is invalid/i);
    });

    it('rejects requests when the user in the session was deleted from DB', async () => {
      const secret = process.env.JWT_SECRET || 'supersecret_triptally_dev_key_change_in_production';
      const nonExistentId = new mongoose.Types.ObjectId();
      const orphanToken = jwt.sign(
        { id: nonExistentId, email: 'ghost@example.com' },
        secret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${orphanToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no longer exists/i);
    });
  });

  describe('Invalid Inputs & Missing Records Handling', () => {
    it('returns 400 Bad Request for malformed resource IDs', async () => {
      const res = await request(app)
        .get('/api/trips/invalid-malformed-object-id')
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid resource identifier format/i);
    });

    it('returns 404 Not Found for non-existent trip ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/trips/${nonExistentId}`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('rejects invalid trip creation payload with negative budget', async () => {
      const res = await request(app)
        .post('/api/trips')
        .set('Cookie', ownerCookie)
        .send({
          title: 'Negative Budget Tour',
          destination: 'Oslo, Norway',
          budget: -500,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/budget must be zero or a positive amount/i);
    });
  });

  describe('Permissions & Role-Based Access Control (RBAC)', () => {
    it('denies outsider from reading trip details', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Cookie', outsiderCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized|access denied/i);
    });

    it('denies viewer from creating an itinerary activity (read-only)', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripId}/itinerary`)
        .set('Cookie', viewerCookie)
        .send({
          title: 'Unauthorized Whale Watching Tour',
          date: new Date().toISOString(),
          category: 'activity',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/permission|viewers cannot/i);
    });

    it('denies viewer from creating a group expense', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', viewerCookie)
        .send({
          title: 'Unauthorized Dinner Expense',
          amount: 80,
          category: 'food',
          payer: new mongoose.Types.ObjectId(),
          splitType: 'equal',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/permission denied|viewers cannot/i);
    });

    it('denies viewer from deleting the trip (owner-only operation)', async () => {
      const res = await request(app)
        .delete(`/api/trips/${tripId}`)
        .set('Cookie', viewerCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only the trip creator\/owner/i);
    });
  });

  describe('Rate Limiter & Structured Logging Utilities', () => {
    it('enforces rate limits when test flag is explicitly passed', async () => {
      // Send rapid requests with x-test-rate-limit header
      let lastRes;
      for (let i = 0; i < 55; i++) {
        lastRes = await request(app)
          .post('/api/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({
            email: 'rate.limit@example.com',
            password: 'SomePassword123!',
          });
      }

      // Max on authRateLimiter is 50 requests
      expect(lastRes.status).toBe(429);
      expect(lastRes.body.success).toBe(false);
      expect(lastRes.body.message).toMatch(/too many authentication attempts/i);
      expect(lastRes.headers).toHaveProperty('ratelimit-limit');
      expect(lastRes.headers).toHaveProperty('retry-after');
    });

    it('sanitizeLogData correctly redacts passwords, tokens, and sensitive keys', () => {
      const rawPayload = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SuperSecretPassword!',
        confirmPassword: 'SuperSecretPassword!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        nested: {
          secret: 'api_secret_key_123',
          authorization: 'Bearer token999',
          safeField: 'harmless string',
        },
      };

      const sanitized = sanitizeLogData(rawPayload);
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.confirmPassword).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.nested.secret).toBe('[REDACTED]');
      expect(sanitized.nested.authorization).toBe('[REDACTED]');
      expect(sanitized.nested.safeField).toBe('harmless string');
    });
  });
});
