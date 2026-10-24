import Trip from '../models/Trip.js';
import TripActivity from '../models/TripActivity.js';

/**
 * Helper to verify trip membership
 */
const verifyTripAccess = async (tripId, userId) => {
  const trip = await Trip.findById(tripId).select('owner members');
  if (!trip) {
    const error = new Error('Trip not found');
    error.statusCode = 404;
    throw error;
  }

  const userIdStr = String(userId);
  const isOwner = String(trip.owner?._id || trip.owner) === userIdStr;
  const memberRecord = trip.members.find(
    (m) => String(m.user?._id || m.user) === userIdStr && m.status === 'accepted'
  );

  if (!isOwner && !memberRecord) {
    const error = new Error('Access denied: You are not an accepted member of this trip');
    error.statusCode = 403;
    throw error;
  }

  return { trip, isOwner };
};

/**
 * @route   GET /api/trips/:tripId/activities
 * @desc    Get chronological trip activity log with pagination and entity type filtering
 * @access  Private (Trip Members)
 */
export const getTripActivities = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    await verifyTripAccess(tripId, req.user._id);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { trip: tripId };
    if (req.query.type && req.query.type !== 'all') {
      query.entityType = req.query.type;
    }

    const [activities, total] = await Promise.all([
      TripActivity.find(query)
        .populate('actor', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TripActivity.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
};
