import { GoogleGenAI } from '@google/genai';
import * as z from 'zod';

/**
 * Output Validation Schema for Gemini Generated Itinerary
 */
export const activitySchema = z.object({
  name: z.string().min(1, 'Activity name is required'),
  description: z.string().default(''),
  startTime: z.string().default('09:00'),
  endTime: z.string().default('11:00'),
  location: z.string().default(''),
  category: z
    .enum(['sightseeing', 'restaurant', 'accommodation', 'transportation', 'activity'])
    .default('activity'),
  estimatedCost: z.coerce.number().min(0).default(0),
  costType: z.enum(['group_total', 'per_person']).default('group_total'),
  travelNotes: z.string().default(''),
});

export const dayPlanSchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  activities: z.array(activitySchema).min(1, 'Each day must include at least one activity'),
});

export const packingItemSchema = z.object({
  item: z.string().min(1),
  category: z
    .enum(['clothing', 'documents', 'medicines', 'electronics', 'essentials', 'toiletries', 'other'])
    .default('essentials'),
  essential: z.boolean().default(false),
});

export const generatedItinerarySchema = z.object({
  tripTitle: z.string().min(1),
  destination: z.string().min(1),
  durationDays: z.number().int().positive(),
  currency: z.literal('INR').default('INR'),
  travellers: z.number().int().positive(),
  budget: z.object({
    total: z.coerce.number().min(0),
    transport: z.coerce.number().min(0).default(0),
    accommodation: z.coerce.number().min(0).default(0),
    food: z.coerce.number().min(0).default(0),
    activities: z.coerce.number().min(0).default(0),
    miscellaneous: z.coerce.number().min(0).default(0),
  }),
  days: z.array(dayPlanSchema).min(1),
  packingChecklist: z.array(packingItemSchema).default([]),
  travelTips: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
});

/**
 * Client factory for Google GenAI SDK
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    const error = new Error(
      'Gemini API key is not configured. Please set GEMINI_API_KEY in your server environment.'
    );
    error.status = 503;
    error.code = 'GEMINI_KEY_MISSING';
    throw error;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Compute sequence of date strings (YYYY-MM-DD) from startDate for durationDays
 */
export function generateDateSequence(startDateStr, durationDays) {
  const dates = [];
  const start = new Date(startDateStr);
  for (let i = 0; i < durationDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Construct system & context prompt for Gemini
 */
export function buildItineraryPrompt({
  destination,
  startDate,
  endDate,
  durationDays,
  dateList,
  totalBudgetINR,
  budgetType,
  perPersonBudgetINR,
  travellers,
  interests,
  travelStyle,
  startingCity,
  transportPreference,
  accommodationPreference,
  dietaryPreferences,
  accessibilityRequirements,
  specialRequests,
  pace,
}) {
  return `
You are an expert Indian travel planner creating a hyper-realistic, day-by-day travel itinerary for travellers in India.

TRIP DETAILS:
- Destination: ${destination}
- Duration: ${durationDays} Days (${startDate} to ${endDate})
- Schedule Dates: ${dateList.join(', ')}
- Number of Travellers: ${travellers}
- Total Budget: ₹${totalBudgetINR.toLocaleString('en-IN')} INR (${budgetType === 'per_person' ? `Computed from ₹${perPersonBudgetINR.toLocaleString('en-IN')} per person` : 'Group total'})
- Estimated Budget per Traveller: ₹${Math.round(totalBudgetINR / travellers).toLocaleString('en-IN')} INR
- Travel Style: ${travelStyle}
- Pace: ${pace || 'balanced'}
- Interests: ${interests.join(', ')}
${startingCity ? `- Starting City: ${startingCity}` : ''}
${transportPreference ? `- Preferred Transport: ${transportPreference}` : ''}
${accommodationPreference ? `- Accommodation Preference: ${accommodationPreference}` : ''}
${dietaryPreferences ? `- Dietary Preferences: ${dietaryPreferences}` : ''}
${accessibilityRequirements ? `- Accessibility Requirements: ${accessibilityRequirements}` : ''}
${specialRequests ? `- Special Requests: ${specialRequests}` : ''}

CRITICAL RULES & REALISM GUIDELINES:
1. Day Count: You MUST generate exactly ${durationDays} days. Each day's "date" MUST match the corresponding date in: [${dateList.join(', ')}].
2. Geographic Realism: Sequence activities logically in geographical proximity within ${destination} to minimize transit times and avoid zig-zagging.
3. Activity Timings: Sequence start times chronologically (e.g., 09:00 -> 11:30, 12:30 -> 14:00, 15:30 -> 18:00). Never double-book overlapping times.
4. INR Currency: All costs MUST be estimated in Indian Rupees (INR) with realistic figures for the specified travel style (${travelStyle}).
5. Budget Allocation: Provide a realistic category breakdown (transport, accommodation, food, activities, miscellaneous) that sums approximately to the total budget of ₹${totalBudgetINR}.
6. Categories: Each activity must have a category strictly among: "sightseeing", "restaurant", "accommodation", "transportation", "activity".
7. Truthful Caveats: Do NOT claim opening hours, live train schedules, or rates are 100% live-verified. List relevant seasonal assumptions and caveats under "assumptions".
8. Packing Checklist: Suggest 8-15 practical items tailored to the destination climate, season, and planned activities. Categories must be one of: "clothing", "documents", "medicines", "electronics", "essentials", "toiletries", "other".
9. Travel Tips: Provide 4-6 authentic, destination-specific tips (local transport hacks, permits, dress codes, best sunset spots, scam awareness, or culinary specialties).

OUTPUT FORMAT:
You MUST respond with pure JSON adhering strictly to this JSON schema without any markdown backticks or commentary outside the JSON:

{
  "tripTitle": "Concise Inspiring Title",
  "destination": "${destination}",
  "durationDays": ${durationDays},
  "currency": "INR",
  "travellers": ${travellers},
  "budget": {
    "total": ${totalBudgetINR},
    "transport": 0,
    "accommodation": 0,
    "food": 0,
    "activities": 0,
    "miscellaneous": 0
  },
  "days": [
    {
      "day": 1,
      "title": "Theme of Day 1",
      "date": "${dateList[0]}",
      "activities": [
        {
          "name": "Activity Name",
          "description": "Engaging 1-2 sentence description",
          "startTime": "09:30",
          "endTime": "11:30",
          "location": "Specific landmark or area",
          "category": "sightseeing",
          "estimatedCost": 500,
          "costType": "group_total",
          "travelNotes": "Practical tip (e.g. ticket booking tip, footwear recommendation)"
        }
      ]
    }
  ],
  "packingChecklist": [
    {
      "item": "Warm woolen shawl / jacket",
      "category": "clothing",
      "essential": true
    }
  ],
  "travelTips": [
    "Tip 1 for ${destination}"
  ],
  "assumptions": [
    "Budget estimates are indicative seasonal averages in INR and not live vendor quotes."
  ]
}
`.trim();
}

/**
 * Helper to call Gemini models with fallback across active model identifiers
 */
async function callGeminiWithFallback(client, primaryModel, contents, config, timeoutMs = 60000) {
  const modelsToTry = [
    primaryModel,
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          const err = new Error(`Gemini generation request with ${model} timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
          err.status = 504;
          err.code = 'GEMINI_TIMEOUT';
          reject(err);
        }, timeoutMs);
        if (timer.unref) timer.unref();
      });

      const apiCall = client.models.generateContent({
        model,
        contents,
        config,
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      return { response, usedModel: model };
    } catch (err) {
      lastError = err;
      const errMsg = err.message || '';
      const isRetryable =
        errMsg.includes('NOT_FOUND') ||
        errMsg.includes('not found') ||
        errMsg.includes('not supported') ||
        errMsg.includes('no longer available') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        err.status === 503 ||
        err.status === 404;

      if (!isRetryable || model === modelsToTry[modelsToTry.length - 1]) {
        throw err;
      }
      console.warn(`[GeminiService] Model "${model}" failed (${errMsg.slice(0, 100)}). Falling back to next available model...`);
    }
  }

  throw lastError;
}

/**
 * Main function to generate itinerary using official @google/genai SDK
 */
export async function generateItineraryWithGemini(inputParams, timeoutMs = 60000) {
  const client = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  const prompt = buildItineraryPrompt(inputParams);

  try {
    const { response } = await callGeminiWithFallback(
      client,
      modelName,
      prompt,
      {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
      timeoutMs
    );

    const rawText =
      response?.text ||
      response?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
      '';

    if (!rawText || rawText.trim() === '') {
      const err = new Error('Gemini returned an empty response. Please retry.');
      err.status = 502;
      err.code = 'GEMINI_EMPTY_RESPONSE';
      throw err;
    }

    // Strip markdown formatting fences if present
    const cleanJson = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      const err = new Error('Received unparseable JSON from Gemini AI: ' + parseErr.message);
      err.status = 502;
      err.code = 'GEMINI_MALFORMED_JSON';
      err.rawResponse = cleanJson.slice(0, 500);
      throw err;
    }

    // Ensure dates and duration are strictly anchored to the user's dates
    parsed.durationDays = inputParams.durationDays;
    parsed.currency = 'INR';
    parsed.travellers = inputParams.travellers;

    // Fix and align each day's date with the calculated date sequence
    if (Array.isArray(parsed.days)) {
      parsed.days = parsed.days.slice(0, inputParams.durationDays).map((day, idx) => {
        const correctDate = inputParams.dateList[idx] || inputParams.dateList[0];
        return {
          ...day,
          day: idx + 1,
          date: correctDate,
          activities: Array.isArray(day.activities)
            ? day.activities.map((act) => ({
                ...act,
                category: ['sightseeing', 'restaurant', 'accommodation', 'transportation', 'activity'].includes(
                  act.category
                )
                  ? act.category
                  : 'activity',
                estimatedCost: Number(act.estimatedCost) || 0,
                costType: act.costType === 'per_person' ? 'per_person' : 'group_total',
              }))
            : [],
        };
      });
    }

    // Validate using Zod schema
    const validationResult = generatedItinerarySchema.safeParse(parsed);
    if (!validationResult.success) {
      const err = new Error(
        'Generated itinerary failed structure validation: ' +
          validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
      err.status = 422;
      err.code = 'GEMINI_SCHEMA_VALIDATION_FAILED';
      throw err;
    }

    return validationResult.data;
  } catch (error) {
    // If it's already a custom error with status, rethrow
    if (error.status && error.code) {
      throw error;
    }

    // Classify known Gemini / Google API errors
    const errMsg = error.message || '';
    const errStatus = error.status || error.statusCode || 500;

    if (
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('429') ||
      errMsg.toLowerCase().includes('quota') ||
      errMsg.toLowerCase().includes('rate limit')
    ) {
      const err = new Error(
        'Gemini API quota or rate limit reached. Please wait a moment before generating another itinerary, or verify your Google AI Studio plan.'
      );
      err.status = 429;
      err.code = 'GEMINI_QUOTA_EXCEEDED';
      throw err;
    }

    if (
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('API key not valid') ||
      errMsg.includes('UNAUTHENTICATED')
    ) {
      const err = new Error(
        'Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable in Google AI Studio.'
      );
      err.status = 401;
      err.code = 'GEMINI_KEY_INVALID';
      throw err;
    }

    if (
      errMsg.includes('NOT_FOUND') ||
      errMsg.includes('model not found') ||
      errMsg.includes('is not supported') ||
      errMsg.includes('no longer available')
    ) {
      const err = new Error(
        `Gemini model "${modelName}" is unavailable or deprecated. Please configure GEMINI_MODEL in server environment.`
      );
      err.status = 503;
      err.code = 'GEMINI_MODEL_UNAVAILABLE';
      throw err;
    }

    if (
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('high demand')
    ) {
      const err = new Error(
        'Gemini AI is temporarily experiencing high demand from Google. Please try again in a few moments.'
      );
      err.status = 503;
      err.code = 'GEMINI_HIGH_DEMAND';
      throw err;
    }

    const genericErr = new Error(`Gemini AI service error: ${errMsg}`);
    genericErr.status = errStatus >= 400 && errStatus < 600 ? errStatus : 500;
    genericErr.code = 'GEMINI_API_ERROR';
    throw genericErr;
  }
}

/**
 * Regenerate an individual day's activities using Gemini
 */
export async function regenerateDayWithGemini({
  destination,
  dayNumber,
  date,
  travelStyle,
  interests,
  existingDayTitle,
  travellers,
}) {
  const client = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  const prompt = `
You are an expert Indian travel planner regenerating Day ${dayNumber} for a trip to ${destination}.
Date: ${date}
Travellers: ${travellers}
Travel Style: ${travelStyle}
Interests: ${interests.join(', ')}
Previous Day Theme: ${existingDayTitle || 'Exploration'}

Generate a fresh, alternative sequence of 3-4 activities for this day in ${destination}.
Output MUST be pure JSON with NO markdown formatting:
{
  "day": ${dayNumber},
  "title": "Fresh Theme for Day ${dayNumber}",
  "date": "${date}",
  "activities": [
    {
      "name": "Activity Name",
      "description": "Engaging description",
      "startTime": "09:00",
      "endTime": "11:30",
      "location": "Landmark in ${destination}",
      "category": "sightseeing",
      "estimatedCost": 400,
      "costType": "group_total",
      "travelNotes": "Helpful insider tip"
    }
  ]
}
`.trim();

  const { response } = await callGeminiWithFallback(
    client,
    modelName,
    prompt,
    { responseMimeType: 'application/json', temperature: 0.8 },
    45000
  );

  const rawText =
    response?.text ||
    response?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
    '';

  const cleanJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(cleanJson);
  parsed.day = dayNumber;
  parsed.date = date;

  return dayPlanSchema.parse(parsed);
}

export default {
  activitySchema,
  dayPlanSchema,
  packingItemSchema,
  generatedItinerarySchema,
  generateDateSequence,
  buildItineraryPrompt,
  generateItineraryWithGemini,
  regenerateDayWithGemini,
};
