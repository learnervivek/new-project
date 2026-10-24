import { z } from 'zod';
import Trip from '../models/Trip.js';
import PackingItem from '../models/PackingItem.js';
import { logTripActivity } from '../services/activityService.js';

/**
 * Helper to check trip membership and roles.
 */
const verifyTripAccess = async (tripId, userId) => {
  const trip = await Trip.findById(tripId).populate('owner', 'name email avatar');
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

  const role = isOwner ? 'owner' : memberRecord?.role || 'viewer';
  const canEdit = isOwner || role === 'organizer' || role === 'editor';

  return { trip, isOwner, role, canEdit };
};

const categoryLabels = {
  clothing: 'Clothing & Apparel',
  documents: 'Documents & IDs',
  medicines: 'Health & Medicines',
  electronics: 'Electronics & Gadgets',
  essentials: 'Travel Essentials',
  toiletries: 'Toiletries & Personal',
  other: 'General & Miscellaneous',
};

// Validation Schemas
const createPackingItemSchema = z.object({
  title: z.string().trim().min(1, 'Item name is required').max(100, 'Item name cannot exceed 100 characters'),
  category: z.enum(['clothing', 'documents', 'medicines', 'electronics', 'essentials', 'toiletries', 'other']).default('essentials'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  assignedTo: z.string().nullable().optional(),
  notes: z.string().trim().max(250, 'Notes cannot exceed 250 characters').optional().default(''),
});

const updatePackingItemSchema = z.object({
  title: z.string().trim().min(1, 'Item name is required').max(100, 'Item name cannot exceed 100 characters').optional(),
  category: z.enum(['clothing', 'documents', 'medicines', 'electronics', 'essentials', 'toiletries', 'other']).optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').optional(),
  assignedTo: z.string().nullable().optional(),
  notes: z.string().trim().max(250, 'Notes cannot exceed 250 characters').optional(),
});

/**
 * @route   GET /api/trips/:tripId/packing
 * @desc    Get all packing checklist items for a trip with stats and filtering
 * @access  Private (Trip Members)
 */
export const getPackingItems = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { trip, canEdit, isOwner } = await verifyTripAccess(tripId, req.user._id);

    const { category, assignedTo, status, search } = req.query;

    const query = { trip: tripId };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        query.assignedTo = null;
      } else if (assignedTo !== 'all') {
        query.assignedTo = assignedTo;
      }
    }

    if (status) {
      if (status === 'packed') query.isPacked = true;
      if (status === 'unpacked') query.isPacked = false;
    }

    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    // Fetch filtered items
    const items = await PackingItem.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('packedBy', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ isPacked: 1, createdAt: -1 });

    // Compute authoritative overall progress statistics across all trip items
    const allTripItems = await PackingItem.find({ trip: tripId }).select('category isPacked');
    const totalItems = allTripItems.length;
    const packedItems = allTripItems.filter((i) => i.isPacked).length;
    const unpackedItems = totalItems - packedItems;
    const progressPercentage = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

    // Category breakdown stats
    const categoryStats = {};
    const categoriesList = ['clothing', 'documents', 'medicines', 'electronics', 'essentials', 'toiletries', 'other'];
    categoriesList.forEach((cat) => {
      categoryStats[cat] = { total: 0, packed: 0 };
    });

    allTripItems.forEach((i) => {
      const cat = i.category || 'other';
      if (!categoryStats[cat]) categoryStats[cat] = { total: 0, packed: 0 };
      categoryStats[cat].total += 1;
      if (i.isPacked) categoryStats[cat].packed += 1;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalItems,
        packedItems,
        unpackedItems,
        progressPercentage,
        categoryStats,
      },
      items,
      canEdit,
      isOwner,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trips/:tripId/packing
 * @desc    Create a new packing checklist item
 * @access  Private (Trip Owner / Organizer / Editor)
 */
export const createPackingItem = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { canEdit } = await verifyTripAccess(tripId, req.user._id);

    if (!canEdit) {
      const error = new Error('Permission denied: You do not have permission to add packing items');
      error.statusCode = 403;
      throw error;
    }

    const parseResult = createPackingItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = new Error(parseResult.error.errors[0]?.message || 'Invalid packing item data');
      error.statusCode = 400;
      throw error;
    }

    const { title, category, quantity, assignedTo, notes } = parseResult.data;

    const item = await PackingItem.create({
      trip: tripId,
      title,
      category,
      quantity: quantity || 1,
      assignedTo: assignedTo && assignedTo.trim() ? assignedTo : null,
      notes: notes || '',
      createdBy: req.user._id,
    });

    const populated = await PackingItem.findById(item._id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'packing_add',
      entityType: 'packing',
      entityId: item._id,
      summary: `Added "${item.title}" to ${categoryLabels[category] || category}`,
      metadata: {
        title: item.title,
        category: item.category,
        quantity: item.quantity,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Item added to packing list',
      item: populated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/trips/:tripId/packing/:itemId/toggle
 * @desc    Toggle completion (packed/unpacked) status of a checklist item
 * @access  Private (Trip Members)
 */
export const togglePackingItem = async (req, res, next) => {
  try {
    const { tripId, itemId } = req.params;
    await verifyTripAccess(tripId, req.user._id);

    const item = await PackingItem.findOne({ _id: itemId, trip: tripId });
    if (!item) {
      const error = new Error('Packing item not found');
      error.statusCode = 404;
      throw error;
    }

    const nextState = !item.isPacked;
    item.isPacked = nextState;
    item.packedBy = nextState ? req.user._id : null;
    item.packedAt = nextState ? new Date() : null;
    await item.save();

    const populated = await PackingItem.findById(item._id)
      .populate('assignedTo', 'name email avatar')
      .populate('packedBy', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'packing_toggle',
      entityType: 'packing',
      entityId: item._id,
      summary: `${nextState ? 'Packed' : 'Unpacked'} "${item.title}"`,
      metadata: {
        title: item.title,
        isPacked: nextState,
      },
    });

    // Recompute current progress percentage
    const allTripItems = await PackingItem.find({ trip: tripId }).select('isPacked');
    const totalItems = allTripItems.length;
    const packedItems = allTripItems.filter((i) => i.isPacked).length;
    const progressPercentage = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

    return res.status(200).json({
      success: true,
      message: nextState ? `"${item.title}" marked as packed` : `"${item.title}" marked as unpacked`,
      item: populated,
      stats: {
        totalItems,
        packedItems,
        progressPercentage,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/trips/:tripId/packing/:itemId
 * @desc    Update a packing checklist item
 * @access  Private (Trip Owner / Organizer / Editor)
 */
export const updatePackingItem = async (req, res, next) => {
  try {
    const { tripId, itemId } = req.params;
    const { canEdit } = await verifyTripAccess(tripId, req.user._id);

    if (!canEdit) {
      const error = new Error('Permission denied: You do not have permission to edit packing items');
      error.statusCode = 403;
      throw error;
    }

    const item = await PackingItem.findOne({ _id: itemId, trip: tripId });
    if (!item) {
      const error = new Error('Packing item not found');
      error.statusCode = 404;
      throw error;
    }

    const parseResult = updatePackingItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = new Error(parseResult.error.errors[0]?.message || 'Invalid update parameters');
      error.statusCode = 400;
      throw error;
    }

    const data = parseResult.data;
    if (data.title !== undefined) item.title = data.title;
    if (data.category !== undefined) item.category = data.category;
    if (data.quantity !== undefined) item.quantity = data.quantity;
    if (data.assignedTo !== undefined) item.assignedTo = data.assignedTo && data.assignedTo.trim() ? data.assignedTo : null;
    if (data.notes !== undefined) item.notes = data.notes;

    await item.save();

    const populated = await PackingItem.findById(item._id)
      .populate('assignedTo', 'name email avatar')
      .populate('packedBy', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    return res.status(200).json({
      success: true,
      message: 'Packing item updated',
      item: populated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/trips/:tripId/packing/:itemId
 * @desc    Delete a packing checklist item
 * @access  Private (Trip Owner / Organizer / Editor / Creator)
 */
export const deletePackingItem = async (req, res, next) => {
  try {
    const { tripId, itemId } = req.params;
    const { canEdit, isOwner } = await verifyTripAccess(tripId, req.user._id);

    const item = await PackingItem.findOne({ _id: itemId, trip: tripId });
    if (!item) {
      const error = new Error('Packing item not found');
      error.statusCode = 404;
      throw error;
    }

    const isCreator = String(item.createdBy) === String(req.user._id);
    if (!canEdit && !isCreator && !isOwner) {
      const error = new Error('Permission denied: You do not have permission to delete this item');
      error.statusCode = 403;
      throw error;
    }

    const deletedTitle = item.title;
    await PackingItem.findByIdAndDelete(itemId);

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'packing_delete',
      entityType: 'packing',
      entityId: itemId,
      summary: `Removed "${deletedTitle}" from packing checklist`,
      metadata: { title: deletedTitle },
    });

    return res.status(200).json({
      success: true,
      message: `"${deletedTitle}" removed from packing list`,
      deletedItemId: itemId,
    });
  } catch (err) {
    next(err);
  }
};
