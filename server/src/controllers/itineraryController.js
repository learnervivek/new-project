import * as z from 'zod';
import ItineraryItem from '../models/ItineraryItem.js';
import Trip from '../models/Trip.js';
import { getUserRoleOnTrip } from './tripController.js';
import { geocodeLocation } from '../utils/geocodingService.js';
import { logTripActivity } from '../services/activityService.js';
import { notifyTripMembers } from '../services/notificationService.js';

// Schemas
export const itineraryItemSchema = z.object({
  title: z.string().trim().min(2, 'Activity title must be at least 2 characters').max(120, 'Title cannot exceed 120 characters'),
  category: z.enum(['sightseeing', 'restaurant', 'accommodation', 'transportation', 'activity']).default('activity'),
  date: z.string().min(1, 'Activity date is required'),
  startTime: z.string().optional().or(z.literal('')),
  duration: z.coerce.number().min(0, 'Duration must be positive or zero').default(60),
  location: z.string().trim().optional().or(z.literal('')),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional()
    .nullable(),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  estimatedCost: z.coerce.number().min(0, 'Estimated cost cannot be negative').default(0),
});

export const updateItineraryItemSchema = itineraryItemSchema.partial();

export const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
      date: z.string().optional(),
    })
  ).min(1, 'Provide at least one item to reorder'),
});

/**
 * Helper to validate date falls within trip's date range
 */
function isDateWithinTripRange(dateVal, trip) {
  const itemDate = new Date(dateVal);
  if (isNaN(itemDate.getTime())) return { valid: false, message: 'Invalid date provided' };

  // Strip time component for date-only comparison
  const itemYMD = itemDate.toISOString().split('T')[0];

  if (trip.startDate) {
    const startYMD = new Date(trip.startDate).toISOString().split('T')[0];
    if (itemYMD < startYMD) {
      return {
        valid: false,
        message: `Activity date (${itemYMD}) cannot be before the trip's start date (${startYMD})`,
      };
    }
  }

  if (trip.endDate) {
    const endYMD = new Date(trip.endDate).toISOString().split('T')[0];
    if (itemYMD > endYMD) {
      return {
        valid: false,
        message: `Activity date (${itemYMD}) cannot be after the trip's end date (${endYMD})`,
      };
    }
  }

  return { valid: true };
}

/**
 * @route   GET /api/trips/:tripId/itinerary
 * @desc    Get all daily itinerary items for a trip
 * @access  Private (Trip members only)
 */
export async function getItinerary(req, res, next) {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const role = getUserRoleOnTrip(trip, userId);
    if (!role) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this itinerary' });
    }

    const items = await ItineraryItem.find({ trip: tripId })
      .populate('creator', 'name email avatar')
      .sort({ date: 1, order: 1, startTime: 1, createdAt: 1 });

    let totalPlannedCost = 0;
    const byDay = {};

    items.forEach((item) => {
      const cost = item.estimatedCost || 0;
      totalPlannedCost += cost;

      const dateStr = new Date(item.date).toISOString().split('T')[0];
      if (!byDay[dateStr]) {
        byDay[dateStr] = {
          date: dateStr,
          count: 0,
          totalCost: 0,
          items: [],
        };
      }
      byDay[dateStr].items.push(item);
      byDay[dateStr].count += 1;
      byDay[dateStr].totalCost += cost;
    });

    return res.status(200).json({
      success: true,
      count: items.length,
      totalPlannedCost,
      byDay,
      items,
      canEdit: ['owner', 'organizer', 'editor'].includes(role),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/trips/:tripId/itinerary
 * @desc    Add a new activity to the itinerary
 * @access  Private (Owner, Organizer, Editor)
 */
export async function createItineraryItem(req, res, next) {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const role = getUserRoleOnTrip(trip, userId);
    if (!role || !['owner', 'organizer', 'editor'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add activities to this trip',
      });
    }

    const parseResult = itineraryItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Invalid activity parameters',
      });
    }

    const { title, category, date, startTime, duration, location, notes, estimatedCost, coordinates } = parseResult.data;

    // Validate date against trip start and end dates
    const dateCheck = isDateWithinTripRange(date, trip);
    if (!dateCheck.valid) {
      return res.status(400).json({ success: false, message: dateCheck.message });
    }

    // Geocode coordinates if not provided but location is given
    let finalCoords = coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number'
      ? coordinates
      : null;

    if (!finalCoords && location && location.trim()) {
      const geoQuery = location + (trip.destination ? ', ' + trip.destination : '');
      const geo = await geocodeLocation(geoQuery);
      if (geo) {
        finalCoords = { lat: geo.lat, lng: geo.lng };
      }
    }

    // Determine order within the given date
    const parsedDate = new Date(date);
    const existingCount = await ItineraryItem.countDocuments({
      trip: tripId,
      date: {
        $gte: new Date(new Date(parsedDate).setUTCHours(0, 0, 0, 0)),
        $lte: new Date(new Date(parsedDate).setUTCHours(23, 59, 59, 999)),
      },
    });

    const item = await ItineraryItem.create({
      trip: tripId,
      creator: userId,
      title,
      category,
      date: parsedDate,
      startTime: startTime || '',
      duration: duration || 60,
      location: location || '',
      coordinates: finalCoords,
      notes: notes || '',
      estimatedCost: estimatedCost || 0,
      currency: trip.currency || 'INR',
      order: existingCount,
    });

    const populatedItem = await ItineraryItem.findById(item._id).populate('creator', 'name email avatar');

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: userId,
      action: 'itinerary_add',
      entityType: 'itinerary',
      entityId: item._id,
      summary: `Added activity "${item.title}" (${item.category})`,
      metadata: {
        title: item.title,
        category: item.category,
        date: item.date,
        location: item.location,
      },
    });

    // Notify trip members
    await notifyTripMembers({
      tripId,
      senderId: userId,
      type: 'itinerary_update',
      title: 'Itinerary Updated',
      message: `${req.user.name || 'A companion'} added "${item.title}" to the trip schedule.`,
      link: `/trips/${tripId}`,
      metadata: { title: item.title, category: item.category },
    });

    return res.status(201).json({
      success: true,
      message: 'Activity scheduled successfully',
      item: populatedItem,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   PUT /api/trips/:tripId/itinerary/:itemId
 * @desc    Update an existing activity
 * @access  Private (Owner, Organizer, Editor)
 */
export async function updateItineraryItem(req, res, next) {
  try {
    const { tripId, itemId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const role = getUserRoleOnTrip(trip, userId);
    if (!role || !['owner', 'organizer', 'editor'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify activities on this trip',
      });
    }

    const item = await ItineraryItem.findOne({ _id: itemId, trip: tripId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Itinerary item not found' });
    }

    const parseResult = updateItineraryItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Invalid parameters',
      });
    }

    const updates = parseResult.data;

    // Validate new date if provided
    if (updates.date) {
      const dateCheck = isDateWithinTripRange(updates.date, trip);
      if (!dateCheck.valid) {
        return res.status(400).json({ success: false, message: dateCheck.message });
      }
      item.date = new Date(updates.date);
    }

    if (updates.title !== undefined) item.title = updates.title;
    if (updates.category !== undefined) item.category = updates.category;
    if (updates.startTime !== undefined) item.startTime = updates.startTime;
    if (updates.duration !== undefined) item.duration = updates.duration;
    if (updates.notes !== undefined) item.notes = updates.notes;
    if (updates.estimatedCost !== undefined) item.estimatedCost = updates.estimatedCost;

    if (updates.coordinates !== undefined) {
      item.coordinates = updates.coordinates;
    }

    if (updates.location !== undefined) {
      const prevLocation = item.location;
      item.location = updates.location;
      if (updates.coordinates === undefined && updates.location && updates.location !== prevLocation) {
        const geoQuery = updates.location + (trip.destination ? ', ' + trip.destination : '');
        const geo = await geocodeLocation(geoQuery);
        if (geo) {
          item.coordinates = { lat: geo.lat, lng: geo.lng };
        }
      }
    }

    await item.save();

    const populatedItem = await ItineraryItem.findById(item._id).populate('creator', 'name email avatar');

    return res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
      item: populatedItem,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   DELETE /api/trips/:tripId/itinerary/:itemId
 * @desc    Delete an activity from the itinerary
 * @access  Private (Owner, Organizer, Editor)
 */
export async function deleteItineraryItem(req, res, next) {
  try {
    const { tripId, itemId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const role = getUserRoleOnTrip(trip, userId);
    if (!role || !['owner', 'organizer', 'editor'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete activities from this trip',
      });
    }

    const item = await ItineraryItem.findOneAndDelete({ _id: itemId, trip: tripId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Itinerary item not found' });
    }

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: userId,
      action: 'itinerary_delete',
      entityType: 'itinerary',
      entityId: itemId,
      summary: `Removed activity "${item.title}" from itinerary`,
      metadata: {
        title: item.title,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Activity deleted successfully',
      deletedItemId: itemId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   PATCH /api/trips/:tripId/itinerary/reorder
 * @desc    Reorder activities within or between days
 * @access  Private (Owner, Organizer, Editor)
 */
export async function reorderItineraryItems(req, res, next) {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const role = getUserRoleOnTrip(trip, userId);
    if (!role || !['owner', 'organizer', 'editor'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reorder activities on this trip',
      });
    }

    const parseResult = reorderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Invalid reorder data',
      });
    }

    const { items } = parseResult.data;

    // Validate and update each item in batch
    const updatePromises = items.map(async ({ id, order, date }) => {
      const updateData = { order };
      if (date) {
        const dateCheck = isDateWithinTripRange(date, trip);
        if (dateCheck.valid) {
          updateData.date = new Date(date);
        }
      }
      return ItineraryItem.findOneAndUpdate(
        { _id: id, trip: tripId },
        { $set: updateData },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      message: 'Itinerary schedule reordered successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/trips/geocode
 * @desc    Geocode a place query via OpenStreetMap Nominatim
 * @access  Private
 */
export async function geocodeQuery(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query string q is required' });
    }

    const result = await geocodeLocation(q.trim());
    return res.status(200).json({
      success: true,
      result,
    });
  } catch (err) {
    next(err);
  }
}
