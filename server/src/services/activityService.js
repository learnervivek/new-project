import TripActivity from '../models/TripActivity.js';

/**
 * Log a non-sensitive trip activity event
 *
 * @param {Object} params
 * @param {string|ObjectId} params.tripId - Target trip ID
 * @param {string|ObjectId} params.actorId - User performing the action
 * @param {string} params.action - Action identifier (e.g. 'expense_add', 'packing_toggle')
 * @param {string} params.entityType - 'itinerary' | 'expense' | 'settlement' | 'member' | 'packing' | 'trip'
 * @param {string|ObjectId} [params.entityId] - ID of modified record
 * @param {string} params.summary - Human-readable action description
 * @param {Object} [params.metadata] - Safe non-sensitive context
 */
export async function logTripActivity({
  tripId,
  actorId,
  action,
  entityType,
  entityId = null,
  summary,
  metadata = {},
}) {
  try {
    // Strip sensitive fields if any were inadvertently passed
    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.token;
    delete safeMetadata.inviteCode;
    delete safeMetadata.receiptUrl;

    const activity = await TripActivity.create({
      trip: tripId,
      actor: actorId,
      action,
      entityType,
      entityId,
      summary,
      metadata: safeMetadata,
    });
    return activity;
  } catch (err) {
    console.error('Failed to log trip activity:', err.message);
    return null;
  }
}

export default logTripActivity;
