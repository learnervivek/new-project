import * as z from 'zod';
import crypto from 'crypto';
import Trip from '../models/Trip.js';
import ItineraryItem from '../models/ItineraryItem.js';
import PackingItem from '../models/PackingItem.js';
import { geocodeLocation } from '../utils/geocodingService.js';
import { logTripActivity } from '../services/activityService.js';
import {
  generateDateSequence,
  generateItineraryWithGemini,
  regenerateDayWithGemini,
  generatedItinerarySchema,
} from '../services/geminiService.js';

/**
 * Zod schema for generating an AI itinerary
 */
export const generateItineraryInputSchema = z
  .object({
    destination: z
      .string({ required_error: 'Destination is required' })
      .trim()
      .min(2, 'Destination must be at least 2 characters')
      .max(100, 'Destination cannot exceed 100 characters'),
    startDate: z
      .string({ required_error: 'Start date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be formatted as YYYY-MM-DD'),
    endDate: z
      .string({ required_error: 'End date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be formatted as YYYY-MM-DD'),
    budget: z.coerce
      .number({ required_error: 'Budget is required' })
      .positive('Budget must be a positive number')
      .min(1000, 'Budget must be at least ₹1,000')
      .max(100000000, 'Budget cannot exceed ₹10,00,00,000'),
    budgetType: z.enum(['group', 'per_person']).default('group'),
    travellers: z.coerce
      .number()
      .int('Number of travellers must be a whole number')
      .min(1, 'At least 1 traveller is required')
      .max(50, 'Travellers cannot exceed 50')
      .default(1),
    interests: z
      .array(z.string().trim())
      .min(1, 'Please select at least one interest or activity type')
      .default(['sightseeing', 'culture']),
    travelStyle: z
      .enum(['budget', 'budget-friendly', 'balanced', 'comfort', 'luxury'])
      .default('balanced'),
    startingCity: z.string().trim().max(100).optional().or(z.literal('')),
    transportPreference: z.string().trim().max(50).optional().or(z.literal('')),
    accommodationPreference: z.string().trim().max(100).optional().or(z.literal('')),
    dietaryPreferences: z.string().trim().max(100).optional().or(z.literal('')),
    accessibilityRequirements: z.string().trim().max(200).optional().or(z.literal('')),
    specialRequests: z.string().trim().max(300).optional().or(z.literal('')),
    pace: z.enum(['relaxed', 'balanced', 'packed']).default('balanced'),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

/**
 * Helper to calculate duration in days
 */
export function calculateDurationDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Helper to compute duration in minutes from HH:MM string pair
 */
export function calculateActivityDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 90;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 90;
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diff = endMin - startMin;
  return diff > 0 ? diff : 90;
}

/**
 * Controller: POST /api/ai/itinerary/generate
 */
export async function generateAiItinerary(req, res, next) {
  try {
    const parseResult = generateItineraryInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + parseResult.error.errors.map((e) => e.message).join(', '),
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const inputData = parseResult.data;
    const durationDays = calculateDurationDays(inputData.startDate, inputData.endDate);

    if (durationDays < 1) {
      return res.status(400).json({
        success: false,
        message: 'Trip duration must be at least 1 day.',
      });
    }

    if (durationDays > 14) {
      return res.status(400).json({
        success: false,
        message:
          'AI itinerary generation currently supports trips up to 14 days to ensure detailed accuracy. Please select a duration of 14 days or fewer.',
      });
    }

    // Calculate normalized total and per-person budgets in INR
    const totalBudgetINR =
      inputData.budgetType === 'per_person'
        ? inputData.budget * inputData.travellers
        : inputData.budget;
    const perPersonBudgetINR =
      inputData.budgetType === 'per_person'
        ? inputData.budget
        : Math.round(inputData.budget / inputData.travellers);

    const dateList = generateDateSequence(inputData.startDate, durationDays);

    const itinerary = await generateItineraryWithGemini({
      ...inputData,
      durationDays,
      dateList,
      totalBudgetINR,
      perPersonBudgetINR,
    });

    return res.status(200).json({
      success: true,
      message: `Personalized ${durationDays}-day itinerary for ${inputData.destination} generated successfully.`,
      itinerary,
      metadata: {
        durationDays,
        totalBudgetINR,
        perPersonBudgetINR,
        dateList,
        currency: 'INR',
      },
    });
  } catch (error) {
    if (
      error.status === 429 ||
      error.message?.includes('RESOURCE_EXHAUSTED') ||
      error.message?.toLowerCase().includes('quota') ||
      error.message?.toLowerCase().includes('rate limit')
    ) {
      error.status = 429;
      error.message =
        'Gemini API quota or rate limit reached. Please wait a moment before generating another itinerary, or verify your Google AI Studio plan.';
    }
    next(error);
  }
}


/**
 * Controller: POST /api/ai/itinerary/regenerate-day
 */
export async function regenerateAiItineraryDay(req, res, next) {
  try {
    const schema = z.object({
      destination: z.string().min(1),
      dayNumber: z.coerce.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      travelStyle: z.string().default('balanced'),
      interests: z.array(z.string()).default(['sightseeing']),
      existingDayTitle: z.string().optional(),
      travellers: z.coerce.number().default(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid day regeneration request',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const dayPlan = await regenerateDayWithGemini(parsed.data);

    return res.status(200).json({
      success: true,
      dayPlan,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: POST /api/ai/itinerary/save
 * Persists the generated itinerary as a new Trip in MongoDB with ItineraryItems and PackingItems.
 */
export async function saveAiItinerary(req, res, next) {
  try {
    const userId = req.user._id;
    const itinerary = req.body;

    // Validate the incoming itinerary
    const validation = generatedItinerarySchema.safeParse(itinerary);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid itinerary structure: ' + validation.error.errors.map((e) => e.message).join(', '),
      });
    }

    const data = validation.data;

    // Duplicate submission prevention: check if a trip with identical title and owner was created within the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const existingRecentTrip = await Trip.findOne({
      owner: userId,
      title: data.tripTitle,
      createdAt: { $gte: tenSecondsAgo },
    });

    if (existingRecentTrip) {
      return res.status(200).json({
        success: true,
        message: 'Trip was recently saved.',
        trip: existingRecentTrip,
        tripId: existingRecentTrip._id,
      });
    }

    // Geocode destination if possible
    let coordinates = { lat: null, lng: null };
    try {
      const geo = await geocodeLocation(data.destination);
      if (geo && typeof geo.lat === 'number' && typeof geo.lng === 'number') {
        coordinates = { lat: geo.lat, lng: geo.lng };
      }
    } catch {
      // Non-blocking fallback
    }

    const startDate = new Date(data.days[0].date);
    const endDate = new Date(data.days[data.days.length - 1].date);

    const defaultCovers = [
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    ];
    const finalCover = defaultCovers[Math.floor(Math.random() * defaultCovers.length)];
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Create the Trip
    const newTrip = new Trip({
      title: data.tripTitle,
      destination: data.destination,
      description: data.travelTips?.length ? data.travelTips.join(' • ') : `AI-curated itinerary for ${data.destination}`,
      coverImage: finalCover,
      startDate,
      endDate,
      currency: 'INR',
      budget: data.budget?.total || 0,
      coordinates,
      owner: userId,
      inviteCode,
      members: [
        {
          user: userId,
          role: 'organizer',
          status: 'accepted',
          joinedAt: new Date(),
        },
      ],
      status: 'planning',
    });

    const savedTrip = await newTrip.save();

    // Create ItineraryItem records for each scheduled activity
    const itineraryItemsToInsert = [];
    data.days.forEach((dayPlan) => {
      const itemDate = new Date(dayPlan.date);
      (dayPlan.activities || []).forEach((act, actIndex) => {
        const duration = calculateActivityDurationMinutes(act.startTime, act.endTime);
        const notes = [
          act.description || '',
          act.travelNotes ? `Note: ${act.travelNotes}` : '',
          act.costType ? `Cost basis: ${act.costType.replace('_', ' ')}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        itineraryItemsToInsert.push({
          trip: savedTrip._id,
          creator: userId,
          title: act.name,
          category: ['sightseeing', 'restaurant', 'accommodation', 'transportation', 'activity'].includes(
            act.category
          )
            ? act.category
            : 'activity',
          date: itemDate,
          startTime: act.startTime || '09:00',
          duration,
          location: act.location || data.destination,
          notes,
          estimatedCost: Number(act.estimatedCost) || 0,
          currency: 'INR',
          order: actIndex,
        });
      });
    });

    if (itineraryItemsToInsert.length > 0) {
      await ItineraryItem.insertMany(itineraryItemsToInsert);
    }

    // Create PackingItem records if generated
    if (Array.isArray(data.packingChecklist) && data.packingChecklist.length > 0) {
      const packingDocs = data.packingChecklist.map((item) => ({
        trip: savedTrip._id,
        title: item.item,
        category: ['clothing', 'documents', 'medicines', 'electronics', 'essentials', 'toiletries', 'other'].includes(
          item.category
        )
          ? item.category
          : 'essentials',
        quantity: 1,
        isPacked: false,
        createdBy: userId,
      }));

      await PackingItem.insertMany(packingDocs);
    }

    // Log trip activity
    try {
      await logTripActivity({
        tripId: savedTrip._id,
        actorId: userId,
        action: 'trip_create',
        entityType: 'trip',
        entityId: savedTrip._id,
        summary: `Created trip "${savedTrip.title}" using Gemini AI Itinerary Planner with ${itineraryItemsToInsert.length} activities scheduled`,
        metadata: {
          destination: savedTrip.destination,
          durationDays: data.durationDays,
          budgetINR: savedTrip.budget,
        },
      });
    } catch {
      // Non-blocking activity logging
    }

    return res.status(201).json({
      success: true,
      message: 'Itinerary saved to My Trips successfully!',
      tripId: savedTrip._id,
      trip: savedTrip,
      activitiesCount: itineraryItemsToInsert.length,
      packingItemsCount: data.packingChecklist?.length || 0,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  generateItineraryInputSchema,
  calculateDurationDays,
  calculateActivityDurationMinutes,
  generateAiItinerary,
  regenerateAiItineraryDay,
  saveAiItinerary,
};
