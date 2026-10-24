import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';

describe('TripTally Backend Authentication & Session APIs', () => {
  const testUser = {
    name: 'Elena Rostova',
    email: `elena.test.${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  let authCookie = '';

  beforeAll(async () => {
    // Ensure DB connection if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }
    // Clean up any test users with this email pattern
    await User.deleteMany({ email: { $regex: /elena\.test\./i } });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /elena\.test\./i } });
  });

  it('POST /api/auth/register - fails when password and confirmation do not match', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Mismatched User',
        email: 'mismatch@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword!',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/passwords do not match/i);
  });

  it('POST /api/auth/register - registers new user with secure HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.name).toBe(testUser.name);
    // Critical: password must NOT be leaked
    expect(res.body.user.password).toBeUndefined();

    // Verify Set-Cookie header contains token and HttpOnly
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toMatch(/HttpOnly/i);

    authCookie = tokenCookie.split(';')[0];
  });

  it('POST /api/auth/register - rejects duplicate email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('POST /api/auth/login - rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('POST /api/auth/login - logs in successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());

    const cookies = res.headers['set-cookie'];
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    authCookie = tokenCookie.split(';')[0];
  });

  it('GET /api/auth/me - returns current user profile when session cookie is provided', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe(testUser.name);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.password).toBeUndefined();
  });

  it('GET /api/auth/me - rejects unauthorized request when no cookie is sent', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/authentication required/i);
  });

  it('PUT /api/auth/profile - updates user name and bio', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', authCookie)
      .send({
        name: 'Elena Rostova-Traveler',
        bio: 'Explorer of European coastlines & mountain peaks',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Elena Rostova-Traveler');
    expect(res.body.user.bio).toBe('Explorer of European coastlines & mountain peaks');
  });

  it('POST /api/auth/profile/avatar - uploads avatar image successfully', async () => {
    const imageBuffer = Buffer.from('fake-image-png-content');
    const res = await request(app)
      .post('/api/auth/profile/avatar')
      .set('Cookie', authCookie)
      .attach('avatar', imageBuffer, 'profile.png');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.avatarUrl).toBeDefined();
    expect(res.body.user.avatar).toBe(res.body.avatarUrl);
  });

  it('POST /api/auth/forgot-password and PUT /api/auth/reset-password - resets password flow', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body).toHaveProperty('devResetToken');

    const resetToken = forgotRes.body.devResetToken;

    // Reset with new password
    const resetRes = await request(app)
      .put(`/api/auth/reset-password/${resetToken}`)
      .send({
        password: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Verify login works with new password
    const loginNewRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'NewPassword456!',
      });

    expect(loginNewRes.status).toBe(200);
    expect(loginNewRes.body.success).toBe(true);
  });

  it('POST /api/auth/logout - clears authentication cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'];
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    // Cookie value is empty or expires in past
    expect(tokenCookie).toMatch(/token=;/);
  });
});
