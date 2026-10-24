import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('TripTally Backend API Health', () => {
  it('GET / should return root application metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('TripTally API');
    expect(res.body.status).toBe('online');
  });

  it('GET /api/health should return 200 with operational status and database state', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('TripTally API is operational');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('database');
  });

  it('GET /api/nonexistent should return 404 error response', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
