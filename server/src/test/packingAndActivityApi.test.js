import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import PackingItem from '../models/PackingItem.js';
import TripActivity from '../models/TripActivity.js';

describe('TripTally Shared Packing Checklist & Activity Feed APIs', () => {
  let ownerCookie = '';
  let memberCookie = '';
  let nonMemberCookie = '';

  let ownerId = '';
  let memberId = '';
  let tripId = '';
  let packingItemId = '';

  const ownerUser = {
    name: 'Ernest Shackleton',
    email: `ernest.pack.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const memberUser = {
    name: 'Frank Wild',
    email: `frank.pack.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const nonMemberUser = {
    name: 'Robert Falcon Scott',
    email: `robert.pack.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

    // Register users
    const res1 = await request(app).post('/api/auth/register').send(ownerUser);
    ownerCookie = res1.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    ownerId = String(res1.body.user.id || res1.body.user._id);

    const res2 = await request(app).post('/api/auth/register').send(memberUser);
    memberCookie = res2.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    memberId = String(res2.body.user.id || res2.body.user._id);

    const res3 = await request(app).post('/api/auth/register').send(nonMemberUser);
    nonMemberCookie = res3.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];

    // Create a trip
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Cookie', ownerCookie)
      .send({
        title: 'Antarctic Endurance Journey',
        destination: 'South Georgia Island',
        startDate: '2026-11-01',
        endDate: '2026-11-20',
        currency: 'USD',
        budget: 15000,
      });

    tripId = String(tripRes.body.trip._id);

    // Add member as editor
    await Trip.findByIdAndUpdate(tripId, {
      $push: {
        members: [{ user: memberId, role: 'editor', status: 'accepted' }],
      },
    });
  });

  afterAll(async () => {
    if (tripId) {
      await PackingItem.deleteMany({ trip: tripId });
      await TripActivity.deleteMany({ trip: tripId });
      await Trip.findByIdAndDelete(tripId);
    }
    await User.deleteMany({
      email: { $in: [ownerUser.email, memberUser.email, nonMemberUser.email] },
    });
  });

  describe('Packing Checklist APIs', () => {
    it('denies access to non-members for packing items', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/packing`)
        .set('Cookie', nonMemberCookie);

      expect(res.status).toBe(403);
    });

    it('returns empty checklist with 0% progress initially', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/packing`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalItems).toBe(0);
      expect(res.body.stats.packedItems).toBe(0);
      expect(res.body.stats.progressPercentage).toBe(0);
      expect(res.body.items).toEqual([]);
    });

    it('creates packing checklist items with categories and member assignments', async () => {
      // 1. Create item assigned to Frank
      const res1 = await request(app)
        .post(`/api/trips/${tripId}/packing`)
        .set('Cookie', ownerCookie)
        .send({
          title: 'Thermal Parka & Gloves',
          category: 'clothing',
          quantity: 2,
          assignedTo: memberId,
          notes: 'Sub-zero rated gear',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.item.title).toBe('Thermal Parka & Gloves');
      expect(res1.body.item.category).toBe('clothing');
      expect(res1.body.item.isPacked).toBe(false);
      expect(String(res1.body.item.assignedTo._id)).toBe(memberId);
      packingItemId = String(res1.body.item._id);

      // 2. Create unassigned document item
      const res2 = await request(app)
        .post(`/api/trips/${tripId}/packing`)
        .set('Cookie', memberCookie)
        .send({
          title: 'Expedition Passport & Permits',
          category: 'documents',
          quantity: 1,
          notes: 'In waterproof pouch',
        });

      expect(res2.status).toBe(201);
      expect(res2.body.item.category).toBe('documents');
    });

    it('toggles packing completion and tracks authoritative progress', async () => {
      // Toggle first item to packed
      const toggleRes = await request(app)
        .patch(`/api/trips/${tripId}/packing/${packingItemId}/toggle`)
        .set('Cookie', memberCookie);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.success).toBe(true);
      expect(toggleRes.body.item.isPacked).toBe(true);
      expect(toggleRes.body.stats.totalItems).toBe(2);
      expect(toggleRes.body.stats.packedItems).toBe(1);
      expect(toggleRes.body.stats.progressPercentage).toBe(50);

      // Verify in list query
      const listRes = await request(app)
        .get(`/api/trips/${tripId}/packing`)
        .set('Cookie', ownerCookie);

      expect(listRes.body.stats.progressPercentage).toBe(50);
      expect(listRes.body.stats.packedItems).toBe(1);
      expect(listRes.body.stats.unpackedItems).toBe(1);
    });

    it('filters packing items by category and status', async () => {
      // Filter by category: clothing
      const catRes = await request(app)
        .get(`/api/trips/${tripId}/packing?category=clothing`)
        .set('Cookie', ownerCookie);

      expect(catRes.status).toBe(200);
      expect(catRes.body.items.length).toBe(1);
      expect(catRes.body.items[0].category).toBe('clothing');

      // Filter by status: unpacked
      const unpackedRes = await request(app)
        .get(`/api/trips/${tripId}/packing?status=unpacked`)
        .set('Cookie', ownerCookie);

      expect(unpackedRes.status).toBe(200);
      expect(unpackedRes.body.items.length).toBe(1);
      expect(unpackedRes.body.items[0].title).toBe('Expedition Passport & Permits');
    });

    it('updates packing item details', async () => {
      const updateRes = await request(app)
        .put(`/api/trips/${tripId}/packing/${packingItemId}`)
        .set('Cookie', ownerCookie)
        .send({
          title: 'Heavy Polar Parka',
          quantity: 3,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.item.title).toBe('Heavy Polar Parka');
      expect(updateRes.body.item.quantity).toBe(3);
    });

    it('deletes packing item and adjusts list count', async () => {
      const delRes = await request(app)
        .delete(`/api/trips/${tripId}/packing/${packingItemId}`)
        .set('Cookie', memberCookie);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const listRes = await request(app)
        .get(`/api/trips/${tripId}/packing`)
        .set('Cookie', ownerCookie);

      expect(listRes.body.stats.totalItems).toBe(1);
    });
  });

  describe('Activity Feed APIs', () => {
    it('denies access to non-members for activity feed', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/activities`)
        .set('Cookie', nonMemberCookie);

      expect(res.status).toBe(403);
    });

    it('returns chronological activity events logged across packing and trip changes', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/activities`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.activities.length).toBeGreaterThan(0);

      // Verify activity format
      const firstActivity = res.body.activities[0];
      expect(firstActivity.actor).toBeDefined();
      expect(firstActivity.actor.name).toBeDefined();
      expect(firstActivity.summary).toBeDefined();
      expect(firstActivity.createdAt).toBeDefined();
      expect(firstActivity.entityType).toBeDefined();

      // Ensure no sensitive fields are leaked in metadata
      res.body.activities.forEach((act) => {
        if (act.metadata) {
          expect(act.metadata.password).toBeUndefined();
          expect(act.metadata.token).toBeUndefined();
          expect(act.metadata.receiptUrl).toBeUndefined();
        }
      });
    });

    it('supports pagination on activity feed', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}/activities?page=1&limit=2`)
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.activities.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });
  });
});
