import express from 'express';
import { protect } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import {
  generateAiItinerary,
  regenerateAiItineraryDay,
  saveAiItinerary,
} from '../controllers/aiItineraryController.js';

const router = express.Router();

// Generate day-by-day AI itinerary using Gemini
router.post('/itinerary/generate', protect, aiRateLimiter, generateAiItinerary);

// Regenerate a single day's plan
router.post('/itinerary/regenerate-day', protect, aiRateLimiter, regenerateAiItineraryDay);

// Save generated plan to MongoDB as a real Trip with ItineraryItems & PackingItems
router.post('/itinerary/save', protect, saveAiItinerary);

export default router;
