import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import Trip from '../models/Trip.js';
import ItineraryItem from '../models/ItineraryItem.js';
import PackingItem from '../models/PackingItem.js';
import * as geminiService from '../services/geminiService.js';
import {
  calculateDurationDays,
  calculateActivityDurationMinutes,
} from '../controllers/aiItineraryController.js';

describe('TripTally Gemini AI Itinerary Planner APIs', () => {
  let userCookie = '';
  let userId = '';

  const mockGeneratedItinerary = {
    tripTitle: 'Enchanting Manali & Solang Valley Escape',
    destination: 'Manali, Himachal Pradesh',
    durationDays: 3,
    currency: 'INR',
    travellers: 2,
    budget: {
      total: 30000,
      transport: 8000,
      accommodation: 10000,
      food: 6000,
      activities: 4000,
      miscellaneous: 2000,
    },
    days: [
      {
        day: 1,
        title: 'Arrival & Old Manali Heritage',
        date: '2026-11-10',
        activities: [
          {
            name: 'Check into riverside cottage & unwind',
            description: 'Settle in with hot chai overlooking the Beas river.',
            startTime: '12:00',
            endTime: '13:30',
            location: 'Old Manali',
            category: 'accommodation',
            estimatedCost: 0,
            costType: 'group_total',
            travelNotes: 'Keep jackets handy as temperature drops in evenings.',
          },
          {
            name: 'Hidimba Devi Temple & Cedar Trails',
            description: 'Visit the 16th-century wooden temple surrounded by tall deodar pines.',
            startTime: '15:00',
            endTime: '17:00',
            location: 'Dhungri Forest, Manali',
            category: 'sightseeing',
            estimatedCost: 300,
            costType: 'group_total',
            travelNotes: 'Remove footwear before entering sacred inner sanctum.',
          },
        ],
      },
      {
        day: 2,
        title: 'Solang Valley Adventure & Paragliding',
        date: '2026-11-11',
        activities: [
          {
            name: 'High-Altitude Paragliding at Solang',
            description: 'Tandem paragliding glide over snow-dusted alpine meadows.',
            startTime: '09:30',
            endTime: '12:30',
            location: 'Solang Valley',
            category: 'activity',
            estimatedCost: 3500,
            costType: 'group_total',
            travelNotes: 'Wear snug sports shoes and windproof gloves.',
          },
        ],
      },
      {
        day: 3,
        title: 'Vashisht Hot Springs & Mall Road Treats',
        date: '2026-11-12',
        activities: [
          {
            name: 'Natural Sulphur Bath & Village Walk',
            description: 'Relax in natural hot springs and taste Siddu with ghee.',
            startTime: '10:00',
            endTime: '12:00',
            location: 'Vashisht Village',
            category: 'sightseeing',
            estimatedCost: 200,
            costType: 'group_total',
            travelNotes: 'Separate bathing enclosures for men and women.',
          },
        ],
      },
    ],
    packingChecklist: [
      {
        item: 'Thermal innerwear & woolen socks',
        category: 'clothing',
        essential: true,
      },
      {
        item: 'Sturdy waterproof hiking shoes',
        category: 'essentials',
        essential: true,
      },
      {
        item: 'Government photo IDs (Aadhaar / Passport)',
        category: 'documents',
        essential: true,
      },
    ],
    travelTips: [
      'Carry cash as ATM connectivity at Solang Valley can be unpredictable.',
      'Book Solang paragliding only through licensed HIMTRAVEL instructors.',
    ],
    assumptions: [
      'Prices reflect off-peak shoulder season rates in INR and exclude personal shopping.',
    ],
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally');
    }

    const testUser = {
      name: 'Aarav Planner',
      email: `aarav.ai.${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    const res = await request(app).post('/api/auth/register').send(testUser);
    userCookie = res.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    userId = res.body.user.id;
  });

  afterAll(async () => {
    // Cleanup created test trips
    await Trip.deleteMany({ owner: userId });
  });

  describe('Utility & Calculation Logic', () => {
    it('calculates duration in days correctly', () => {
      expect(calculateDurationDays('2026-11-10', '2026-11-10')).toBe(1);
      expect(calculateDurationDays('2026-11-10', '2026-11-14')).toBe(5);
      expect(calculateDurationDays('2026-12-30', '2027-01-02')).toBe(4);
    });

    it('calculates activity duration in minutes accurately', () => {
      expect(calculateActivityDurationMinutes('09:00', '11:30')).toBe(150);
      expect(calculateActivityDurationMinutes('14:15', '15:45')).toBe(90);
      expect(calculateActivityDurationMinutes('', '')).toBe(90);
    });

    it('generates sequential date list', () => {
      const dates = geminiService.generateDateSequence('2026-11-10', 3);
      expect(dates).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    });
  });

  describe('POST /api/ai/itinerary/generate - Validation & Auth', () => {
    it('denies unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/ai/itinerary/generate').send({
        destination: 'Goa',
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        budget: 35000,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing destination with 400', async () => {
      const res = await request(app)
        .post('/api/ai/itinerary/generate')
        .set('Cookie', userCookie)
        .send({
          destination: '   ',
          startDate: '2026-12-01',
          endDate: '2026-12-05',
          budget: 35000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects reversed dates (endDate before startDate) with 400', async () => {
      const res = await request(app)
        .post('/api/ai/itinerary/generate')
        .set('Cookie', userCookie)
        .send({
          destination: 'Jaipur, Rajasthan',
          startDate: '2026-12-10',
          endDate: '2026-12-05',
          budget: 25000,
          travellers: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/End date must be on or after start date/i);
    });

    it('rejects invalid or non-positive budget with 400', async () => {
      const res = await request(app)
        .post('/api/ai/itinerary/generate')
        .set('Cookie', userCookie)
        .send({
          destination: 'Rishikesh, Uttarakhand',
          startDate: '2026-12-01',
          endDate: '2026-12-03',
          budget: -500,
          travellers: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects trip duration greater than 14 days with clear message', async () => {
      const res = await request(app)
        .post('/api/ai/itinerary/generate')
        .set('Cookie', userCookie)
        .send({
          destination: 'Kerala Grand Circuit',
          startDate: '2026-12-01',
          endDate: '2026-12-25', // 25 days
          budget: 120000,
          travellers: 4,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/supports trips up to 14 days/i);
    });
  });

  describe('POST /api/ai/itinerary/generate - Generation & Mocked AI Handling', () => {
    it('successfully generates structured itinerary with mocked Gemini response', async () => {
      const spy = vi
        .spyOn(geminiService, 'generateItineraryWithGemini')
        .mockResolvedValueOnce(mockGeneratedItinerary);

      const res = await request(app)
        .post('/api/ai/itinerary/generate')
        .set('Cookie', userCookie)
        .send({
          destination: 'Manali, Himachal Pradesh',
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          budget: 30000,
          budgetType: 'group',
          travellers: 2,
          interests: ['adventure', 'nature', 'food'],
          travelStyle: 'balanced',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.itinerary).toBeDefined();
      expect(res.body.itinerary.tripTitle).toBe('Enchanting Manali & Solang Valley Escape');
      expect(res.body.itinerary.currency).toBe('INR');
      expect(res.body.itinerary.days.length).toBe(3);
      expect(res.body.metadata.totalBudgetINR).toBe(30000);
      expect(res.body.metadata.perPersonBudgetINR).toBe(15000);

      spy.mockRestore();
    });

    it('correctly handles per_person budget calculations', async () => {
      const spy = vi
        .spyOn(geminiService, 'generateItineraryWithGemini')
        .mockImplementationOnce(async (params) => ({
          ...mockGeneratedItinerary,
          travellers: params.travellers,
          budget: { ...mockGeneratedItinerary.budget, total: params.totalBudgetINR },
        }));

      const res = await request(app)
        .post('/api/ai/itinerary/generate')
        .set('Cookie', userCookie)
        .send({
          destination: 'Udaipur, Rajasthan',
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          budget: 15000,
          budgetType: 'per_person',
          travellers: 3,
          interests: ['culture', 'history'],
          travelStyle: 'comfort',
        });

      expect(res.status).toBe(200);
      expect(res.body.metadata.totalBudgetINR).toBe(45000);
      expect(res.body.metadata.perPersonBudgetINR).toBe(15000);

      spy.mockRestore();
    });

    it('returns 429 when Gemini API rate limit / quota is exceeded', async () => {
      const quotaErr = new Error('RESOURCE_EXHAUSTED: Quota exceeded');
      quotaErr.status = 429;
      quotaErr.code = 'GEMINI_QUOTA_EXCEEDED';

      const spy = vi
        .spyOn(geminiService, 'generateItineraryWithGemini')
        .mockRejectedValueOnce(quotaErr);

      const res = await request(app)
        .post('/api/ai/itinerary/generate')
        .set('Cookie', userCookie)
        .send({
          destination: 'Manali',
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          budget: 30000,
        });

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/quota or rate limit/i);

      spy.mockRestore();
    });

    it('returns 504 when Gemini AI times out', async () => {
      const timeoutErr = new Error('Gemini generation request timed out');
      timeoutErr.status = 504;
      timeoutErr.code = 'GEMINI_TIMEOUT';

      const spy = vi
        .spyOn(geminiService, 'generateItineraryWithGemini')
        .mockRejectedValueOnce(timeoutErr);

      const res = await request(app)
        .post('/api/ai/itinerary/generate')
        .set('Cookie', userCookie)
        .send({
          destination: 'Manali',
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          budget: 30000,
        });

      expect(res.status).toBe(504);
      expect(res.body.message).toMatch(/timed out/i);

      spy.mockRestore();
    });
  });

  describe('POST /api/ai/itinerary/save - Save to MongoDB Workflow', () => {
    let savedTripId = '';

    it('saves generated plan into Trip, ItineraryItems, and PackingItems', async () => {
      const res = await request(app)
        .post('/api/ai/itinerary/save')
        .set('Cookie', userCookie)
        .send(mockGeneratedItinerary);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.tripId).toBeDefined();
      expect(res.body.trip.title).toBe(mockGeneratedItinerary.tripTitle);
      expect(res.body.trip.currency).toBe('INR');
      expect(res.body.trip.budget).toBe(30000);
      expect(res.body.activitiesCount).toBe(4);
      expect(res.body.packingItemsCount).toBe(3);

      savedTripId = res.body.tripId;

      // Verify Trip in DB
      const tripInDb = await Trip.findById(savedTripId);
      expect(tripInDb).toBeTruthy();
      expect(tripInDb.owner.toString()).toBe(userId);
      expect(tripInDb.members[0].role).toBe('organizer');

      // Verify ItineraryItems in DB
      const itemsInDb = await ItineraryItem.find({ trip: savedTripId }).sort({ date: 1, order: 1 });
      expect(itemsInDb.length).toBe(4);
      expect(itemsInDb[0].title).toBe('Check into riverside cottage & unwind');
      expect(itemsInDb[0].category).toBe('accommodation');
      expect(itemsInDb[0].currency).toBe('INR');

      // Verify PackingItems in DB
      const packingInDb = await PackingItem.find({ trip: savedTripId });
      expect(packingInDb.length).toBe(3);
      expect(packingInDb[0].isPacked).toBe(false);
    });

    it('prevents accidental duplicate trip creation from rapid double-clicks', async () => {
      const res = await request(app)
        .post('/api/ai/itinerary/save')
        .set('Cookie', userCookie)
        .send(mockGeneratedItinerary);

      // Should return 200 with the existing trip instead of inserting duplicate
      expect(res.status).toBe(200);
      expect(res.body.tripId).toBe(savedTripId);
      expect(res.body.message).toMatch(/recently saved/i);
    });

    it('rejects malformed itinerary payload with 400', async () => {
      const res = await request(app)
        .post('/api/ai/itinerary/save')
        .set('Cookie', userCookie)
        .send({
          tripTitle: 'Incomplete Plan',
          // missing destination, days, etc.
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
