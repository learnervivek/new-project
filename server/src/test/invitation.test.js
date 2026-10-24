import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Invitation from '../models/Invitation.js';

describe('TripTally Collaborative Trip Membership & Invitations APIs', () => {
  let ownerCookie = '';
  let inviteeCookie = '';
  let strangerCookie = '';
  let tripId = '';
  let inviteeUser = null;
  let ownerUser = null;
  let strangerUser = null;
  let inviteToken = '';
  let invitationId = '';

  const ownerData = {
    name: 'Captain Jack',
    email: `jack.invite.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const inviteeData = {
    name: 'Will Turner',
    email: `will.invite.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const strangerData = {
    name: 'Davy Jones',
    email: `davy.invite.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

    // Register 3 users
    const res1 = await request(app).post('/api/auth/register').send(ownerData);
    ownerCookie = res1.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    ownerUser = res1.body.user;

    const res2 = await request(app).post('/api/auth/register').send(inviteeData);
    inviteeCookie = res2.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    inviteeUser = res2.body.user;

    const res3 = await request(app).post('/api/auth/register').send(strangerData);
    strangerCookie = res3.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    strangerUser = res3.body.user;

    // Create a trip for the owner
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Cookie', ownerCookie)
      .send({
        title: 'Tortuga Expedition',
        destination: 'Caribbean Sea',
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        budget: 5000,
        currency: 'USD',
      });

    tripId = tripRes.body.trip._id;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: [ownerData.email, inviteeData.email, strangerData.email] },
    });
    if (tripId) {
      await Trip.findByIdAndDelete(tripId);
      await Invitation.deleteMany({ trip: tripId });
    }
  });

  it('POST /api/trips/:id/invitations - owner successfully invites a member by email', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/invitations`)
      .set('Cookie', ownerCookie)
      .send({
        email: inviteeData.email,
        role: 'editor',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.invitation).toBeDefined();
    expect(res.body.invitation.email).toBe(inviteeData.email.toLowerCase());
    expect(res.body.invitation.role).toBe('editor');
    expect(res.body.devToken).toBeDefined();

    inviteToken = res.body.devToken;
    invitationId = res.body.invitation._id;
  });

  it('POST /api/trips/:id/invitations - prevents duplicate pending invitations', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/invitations`)
      .set('Cookie', ownerCookie)
      .send({
        email: inviteeData.email,
        role: 'editor',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/pending invitation has already been sent/i);
  });

  it('POST /api/trips/:id/invitations - non-member cannot invite companions (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/invitations`)
      .set('Cookie', strangerCookie)
      .send({
        email: 'somebody.else@example.com',
        role: 'editor',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/invitations/me - invited user sees pending invitation', async () => {
    const res = await request(app)
      .get('/api/invitations/me')
      .set('Cookie', inviteeCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const found = res.body.invitations.find((inv) => inv._id === invitationId);
    expect(found).toBeDefined();
    expect(found.trip.title).toBe('Tortuga Expedition');
  });

  it('GET /api/invitations/token/:token - verify invitation token details', async () => {
    const res = await request(app).get(`/api/invitations/token/${inviteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.invitation.trip.title).toBe('Tortuga Expedition');
  });

  it('POST /api/invitations/token/:token/accept - accepts invitation and adds member to trip', async () => {
    const res = await request(app)
      .post(`/api/invitations/token/${inviteToken}/accept`)
      .set('Cookie', inviteeCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/joined/i);

    // Verify member is now in trip
    const tripCheck = await Trip.findById(tripId);
    const memberFound = tripCheck.members.some(
      (m) => m.user.toString() === inviteeUser.id && m.status === 'accepted'
    );
    expect(memberFound).toBe(true);
  });

  it('POST /api/invitations/token/:token/accept - prevents token reuse', async () => {
    const res = await request(app)
      .post(`/api/invitations/token/${inviteToken}/accept`)
      .set('Cookie', strangerCookie);

    // Since already accepted, it should be rejected
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already been accepted/i);
  });

  it('POST /api/invitations/token/:token/accept - rejects expired invitations (410 Gone)', async () => {
    // Create an expired invitation directly
    const { token, tokenHash } = Invitation.generateInvitationToken();
    await Invitation.create({
      trip: tripId,
      email: strangerData.email,
      inviter: ownerUser.id,
      role: 'viewer',
      tokenHash,
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000 * 60 * 60), // Expired 1 hour ago
    });

    const res = await request(app)
      .post(`/api/invitations/token/${token}/accept`)
      .set('Cookie', strangerCookie);

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('PATCH /api/trips/:id/members/:userId/role - owner updates member role', async () => {
    const res = await request(app)
      .patch(`/api/trips/${tripId}/members/${inviteeUser.id}/role`)
      .set('Cookie', ownerCookie)
      .send({ role: 'organizer' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.member.role).toBe('organizer');
  });

  it('DELETE /api/trips/:id/members/:userId - unauthorized user cannot remove member', async () => {
    const res = await request(app)
      .delete(`/api/trips/${tripId}/members/${inviteeUser.id}`)
      .set('Cookie', strangerCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/trips/:id/members/:userId - owner removes member from trip', async () => {
    const res = await request(app)
      .delete(`/api/trips/${tripId}/members/${inviteeUser.id}`)
      .set('Cookie', ownerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/removed/i);

    const tripCheck = await Trip.findById(tripId);
    const stillMember = tripCheck.members.some(
      (m) => m.user.toString() === inviteeUser.id
    );
    expect(stillMember).toBe(false);
  });

  it('DELETE /api/trips/:id/invitations/:invitationId - owner revokes an invitation', async () => {
    // Send a new invitation to stranger
    const invRes = await request(app)
      .post(`/api/trips/${tripId}/invitations`)
      .set('Cookie', ownerCookie)
      .send({
        email: strangerData.email,
        role: 'viewer',
      });

    const tempInvId = invRes.body.invitation._id;

    const revokeRes = await request(app)
      .delete(`/api/trips/${tripId}/invitations/${tempInvId}`)
      .set('Cookie', ownerCookie);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);
    expect(revokeRes.body.invitation.status).toBe('revoked');
  });
});
