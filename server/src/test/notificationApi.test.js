import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Notification from '../models/Notification.js';
import Expense from '../models/Expense.js';

describe('TripTally In-App Notifications & Email Reminders APIs', () => {
  let user1Cookie = '';
  let user2Cookie = '';
  let user3Cookie = '';
  let user1Id = '';
  let user2Id = '';
  let user3Id = '';
  let tripId = '';
  let notificationId = '';

  const user1 = {
    name: 'Edmund Hillary',
    email: `edmund.notif.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const user2 = {
    name: 'Tenzing Norgay',
    email: `tenzing.notif.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const user3 = {
    name: 'Pasang Dawa',
    email: `pasang.notif.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

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

    // Create a trip with user1 as owner and user2 as accepted member starting tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

    const tripRes = await request(app)
      .post('/api/trips')
      .set('Cookie', user1Cookie)
      .send({
        title: 'Everest Base Camp Trek',
        destination: 'Khumbu Valley, Nepal',
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        currency: 'USD',
        budget: 6000,
      });

    tripId = String(tripRes.body.trip._id);

    // Add user2 as member
    await Trip.findByIdAndUpdate(tripId, {
      $push: {
        members: [{ user: user2Id, role: 'editor', status: 'accepted' }],
      },
    });
  });

  afterAll(async () => {
    if (tripId) {
      await Expense.deleteMany({ trip: tripId });
      await Trip.findByIdAndDelete(tripId);
    }
    await Notification.deleteMany({
      recipient: { $in: [user1Id, user2Id, user3Id] },
    });
    await User.deleteMany({
      email: { $in: [user1.email, user2.email, user3.email] },
    });
  });

  describe('In-App Notification Lifecycle', () => {
    it('creates an in-app notification when user1 invites an existing user by email', async () => {
      // Invite user3 (not yet a member)
      const inviteRes = await request(app)
        .post(`/api/trips/${tripId}/invitations`)
        .set('Cookie', user1Cookie)
        .send({
          email: user3.email,
          role: 'editor',
        });

      expect(inviteRes.status).toBe(201);

      // User3 should receive an in-app notification
      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', user3Cookie);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.success).toBe(true);
      expect(notifRes.body.unreadCount).toBeGreaterThanOrEqual(1);

      const inviteNotif = notifRes.body.notifications.find(
        (n) => n.type === 'trip_invitation'
      );
      expect(inviteNotif).toBeDefined();
      expect(inviteNotif.title).toContain('Trip Invitation');
      expect(inviteNotif.isRead).toBe(false);
      notificationId = String(inviteNotif._id);
    });

    it('creates in-app notifications for trip members when an itinerary activity is added', async () => {
      // User1 schedules an activity
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await request(app)
        .post(`/api/trips/${tripId}/itinerary`)
        .set('Cookie', user1Cookie)
        .send({
          title: 'Acclimatization Hike',
          category: 'activity',
          date: tomorrow.toISOString().split('T')[0],
          estimatedCost: 50,
        });

      // User2 should receive an itinerary update notification
      const notifRes = await request(app)
        .get('/api/notifications?type=itinerary_update')
        .set('Cookie', user2Cookie);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifRes.body.notifications[0].title).toBe('Itinerary Updated');
    });

    it('creates in-app notifications for trip members when an expense is logged', async () => {
      // User1 logs an expense
      await request(app)
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', user1Cookie)
        .send({
          title: 'Oxygen Cannister Supplies',
          amount: 20000, // $200.00
          category: 'activity',
          paidBy: user1Id,
          splitType: 'equal',
          participants: [user1Id, user2Id],
        });

      // User2 should receive an expense notification
      const notifRes = await request(app)
        .get('/api/notifications?type=expense_created')
        .set('Cookie', user2Cookie);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifRes.body.notifications[0].title).toBe('New Expense Logged');
    });

    it('marks a single notification as read', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Cookie', user3Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notification.isRead).toBe(true);
      expect(res.body.notification.readAt).toBeDefined();
    });

    it('marks all unread notifications as read in bulk', async () => {
      const res = await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBe(0);

      // Verify list has 0 unread
      const listRes = await request(app)
        .get('/api/notifications?isRead=false')
        .set('Cookie', user2Cookie);

      expect(listRes.body.notifications.length).toBe(0);
    });

    it('deletes a notification and clears read notifications', async () => {
      const delRes = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Cookie', user3Cookie);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const clearRes = await request(app)
        .delete('/api/notifications/clear-read')
        .set('Cookie', user2Cookie);

      expect(clearRes.status).toBe(200);
      expect(clearRes.body.success).toBe(true);
    });
  });

  describe('Notification Preferences & Scheduled Reminders', () => {
    it('retrieves and updates user notification preferences', async () => {
      // Get preferences
      const getRes = await request(app)
        .get('/api/notifications/preferences')
        .set('Cookie', user1Cookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.preferences.emailNotifications).toBe(true);

      // Update preferences (toggle tripReminders to false)
      const patchRes = await request(app)
        .patch('/api/notifications/preferences')
        .set('Cookie', user1Cookie)
        .send({
          tripReminders: false,
          expenseAlerts: true,
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.preferences.tripReminders).toBe(false);
      expect(patchRes.body.preferences.expenseAlerts).toBe(true);
    });

    it('executes scheduled reminders job and avoids duplicate reminders', async () => {
      // Trigger reminders engine
      const runRes = await request(app)
        .post('/api/notifications/run-reminders')
        .set('Cookie', user1Cookie);

      expect(runRes.status).toBe(200);
      expect(runRes.body.success).toBe(true);
      expect(runRes.body.result).toBeDefined();

      // Trip starts tomorrow: upcomingTripsReminded should have fired for eligible users
      expect(runRes.body.result.upcomingTripsReminded).toBeGreaterThanOrEqual(1);

      // Immediate second execution must not duplicate reminders (idempotency check)
      const secondRun = await request(app)
        .post('/api/notifications/run-reminders')
        .set('Cookie', user1Cookie);

      expect(secondRun.body.result.upcomingTripsReminded).toBe(0);
    });
  });
});
