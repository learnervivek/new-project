import crypto from 'crypto';
import * as z from 'zod';
import Trip from '../models/Trip.js';
import Expense from '../models/Expense.js';
import Invitation from '../models/Invitation.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

// Validation Schemas
export const createTripSchema = z.object({
  title: z.string().trim().min(3, 'Trip title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  destination: z.string().trim().min(2, 'Destination is required'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().or(z.literal('')),
  coverImage: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  currency: z.string().default('INR'),
  budget: z.coerce.number().min(0, 'Budget must be zero or a positive amount').default(0),
  budgetAlertThreshold: z.coerce.number().min(10, 'Alert threshold must be at least 10%').max(200, 'Alert threshold cannot exceed 200%').default(80),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const updateTripSchema = z.object({
  title: z.string().trim().min(3, 'Trip title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters').optional(),
  destination: z.string().trim().min(2, 'Destination is required').optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().or(z.literal('')),
  coverImage: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  currency: z.string().optional(),
  budget: z.coerce.number().min(0, 'Budget must be zero or a positive amount').optional(),
  budgetAlertThreshold: z.coerce.number().min(10, 'Alert threshold must be at least 10%').max(200, 'Alert threshold cannot exceed 200%').optional(),
  status: z.enum(['planning', 'confirmed', 'ongoing', 'completed', 'archived']).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

/**
 * Helper to check user's role on a trip
 */
export function getUserRoleOnTrip(trip, userId) {
  if (trip.owner.equals(userId) || (trip.owner._id && trip.owner._id.equals(userId))) {
    return 'owner';
  }
  const member = trip.members.find(
    (m) => m.user && (m.user.equals(userId) || (m.user._id && m.user._id.equals(userId)))
  );
  return member ? member.role : null;
}

/**
 * @route   GET /api/trips
 * @desc    Get authorized trips with pagination and filtering
 * @access  Private
 */
export async function getTrips(req, res, next) {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 9));
    const skip = (page - 1) * limit;

    const { search, status, sort } = req.query;

    // Scoped strictly to trips where user is owner or member
    const query = {
      $or: [{ owner: userId }, { 'members.user': userId }],
    };

    const now = new Date();

    if (status && status !== 'all') {
      if (status === 'upcoming') {
        query.$and = query.$and || [];
        query.$and.push({
          status: { $in: ['planning', 'confirmed'] },
          $or: [{ startDate: { $exists: false } }, { startDate: { $gt: now } }],
        });
      } else if (status === 'ongoing') {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { status: 'ongoing' },
            { startDate: { $lte: now }, endDate: { $gte: now } },
          ],
        });
      } else {
        query.status = status;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { destination: searchRegex },
          { description: searchRegex },
        ],
      });
    }

    // Determine sort
    let sortQuery = { createdAt: -1 };
    if (sort === 'oldest') sortQuery = { createdAt: 1 };
    if (sort === 'budget-high') sortQuery = { budget: -1 };
    if (sort === 'budget-low') sortQuery = { budget: 1 };
    if (sort === 'date') sortQuery = { startDate: 1 };

    const total = await Trip.countDocuments(query);
    const trips = await Trip.find(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: trips.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      trips,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/trips/dashboard
 * @desc    Fetch aggregated dashboard metrics and authorized trips for current user
 * @access  Private
 */
export async function getDashboardData(req, res, next) {
  try {
    const userId = req.user._id;

    // Find all trips where current user is owner OR an accepted member
    const userTrips = await Trip.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });

    const now = new Date();

    let upcomingCount = 0;
    let ongoingCount = 0;
    let totalBudget = 0;

    userTrips.forEach((trip) => {
      totalBudget += trip.budget || 0;

      const startDate = trip.startDate ? new Date(trip.startDate) : null;
      const endDate = trip.endDate ? new Date(trip.endDate) : null;

      if (trip.status === 'ongoing' || (startDate && endDate && startDate <= now && endDate >= now)) {
        ongoingCount++;
      } else if (trip.status === 'planning' || trip.status === 'confirmed' || (startDate && startDate > now)) {
        upcomingCount++;
      }
    });

    const tripIds = userTrips.map((t) => t._id);

    // Fetch recent expenses across user's trips
    const recentExpenses = await Expense.find({
      trip: { $in: tripIds },
    })
      .populate('paidBy', 'name avatar')
      .populate('trip', 'title destination currency')
      .sort({ createdAt: -1 })
      .limit(6);

    const expensesAggregation = await Expense.aggregate([
      { $match: { trip: { $in: tripIds } } },
      { $group: { _id: null, totalSpent: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const totalSpent = expensesAggregation[0]?.totalSpent || 0;
    const expenseCount = expensesAggregation[0]?.count || 0;

    // Fetch active pending invitations count for current user
    const pendingInvitationsCount = await Invitation.countDocuments({
      email: req.user.email.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: now },
    });

    const upcomingTrips = userTrips
      .filter((t) => t.status !== 'completed' && t.status !== 'archived')
      .slice(0, 6);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTrips: userTrips.length,
          upcomingCount,
          ongoingCount,
          totalBudget,
          totalSpent,
          expenseCount,
          pendingSettlementsCount: Math.max(0, expenseCount > 0 ? Math.ceil(expenseCount / 2) : 0),
          pendingInvitationsCount,
        },
        upcomingTrips,
        recentExpenses,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/trips
 * @desc    Create a new collaborative trip
 * @access  Private
 */
export async function createTrip(req, res, next) {
  try {
    const parseResult = createTripSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid trip parameters';
      return res.status(400).json({ success: false, message: errorMsg, errors: parseResult.error.flatten().fieldErrors });
    }

    const { title, destination, description, coverImage, startDate, endDate, currency, budget, budgetAlertThreshold } = parseResult.data;

    // Generate unique 8-character invite code
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Default travel stock cover if none provided
    const defaultCovers = [
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    ];
    const finalCover = coverImage && coverImage.trim() ? coverImage.trim() : defaultCovers[Math.floor(Math.random() * defaultCovers.length)];

    const trip = await Trip.create({
      title,
      destination,
      description: description || '',
      coverImage: finalCover,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      currency: currency || 'INR',
      budget: budget || 0,
      budgetAlertThreshold: budgetAlertThreshold || 80,
      owner: req.user._id,
      inviteCode,
      status: 'planning',
      members: [
        {
          user: req.user._id,
          role: 'organizer',
          status: 'accepted',
          joinedAt: new Date(),
        },
      ],
    });

    const populatedTrip = await Trip.findById(trip._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    return res.status(201).json({
      success: true,
      message: 'Trip created successfully!',
      trip: populatedTrip,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/trips/:id
 * @desc    Get trip details by ID (authorized members only)
 * @access  Private
 */
export async function getTripById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(id)
      .populate('owner', 'name email avatar bio')
      .populate('members.user', 'name email avatar bio');

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Permission check: strictly owner or member
    const role = getUserRoleOnTrip(trip, userId);
    if (!role) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this private trip.',
      });
    }

    // Ensure inviteCode is generated if missing from legacy records
    if (!trip.inviteCode) {
      trip.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      await trip.save();
    }

    // Fetch expenses for this trip
    const expenses = await Expense.find({ trip: id })
      .populate('paidBy', 'name email avatar')
      .sort({ date: -1, createdAt: -1 });

    // Fetch invitations for this trip
    const invitations = await Invitation.find({ trip: id })
      .populate('inviter', 'name email avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      userRole: role,
      isOwner: role === 'owner',
      canEdit: ['owner', 'organizer', 'editor'].includes(role),
      trip,
      expenses,
      invitations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   PUT /api/trips/:id
 * @desc    Update trip details (owner, organizer, or editor only)
 * @access  Private
 */
export async function updateTrip(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const role = getUserRoleOnTrip(trip, userId);
    if (!role || !['owner', 'organizer', 'editor'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this trip.',
      });
    }

    const parseResult = updateTripSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid update parameters';
      return res.status(400).json({ success: false, message: errorMsg, errors: parseResult.error.flatten().fieldErrors });
    }

    const data = parseResult.data;

    // Validate date sequence against existing dates if only one date is changed
    const targetStartDate = data.startDate !== undefined
      ? (data.startDate ? new Date(data.startDate) : null)
      : trip.startDate;

    const targetEndDate = data.endDate !== undefined
      ? (data.endDate ? new Date(data.endDate) : null)
      : trip.endDate;

    if (targetStartDate && targetEndDate && targetEndDate < targetStartDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be on or after start date',
      });
    }

    if (data.title !== undefined) trip.title = data.title;
    if (data.destination !== undefined) trip.destination = data.destination;
    if (data.description !== undefined) trip.description = data.description;
    if (data.coverImage !== undefined && data.coverImage.trim()) trip.coverImage = data.coverImage.trim();
    if (data.startDate !== undefined) trip.startDate = data.startDate ? new Date(data.startDate) : undefined;
    if (data.endDate !== undefined) trip.endDate = data.endDate ? new Date(data.endDate) : undefined;
    if (data.currency !== undefined) trip.currency = data.currency;
    if (data.budget !== undefined) trip.budget = data.budget;
    if (data.budgetAlertThreshold !== undefined) trip.budgetAlertThreshold = data.budgetAlertThreshold;
    if (data.status !== undefined) trip.status = data.status;

    await trip.save();

    const updatedTrip = await Trip.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    return res.status(200).json({
      success: true,
      message: 'Trip updated successfully!',
      trip: updatedTrip,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   PATCH /api/trips/:id/archive
 * @desc    Toggle or set archived status (owner or organizer only)
 * @access  Private
 */
export async function archiveTrip(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const role = getUserRoleOnTrip(trip, userId);
    if (!role || !['owner', 'organizer'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only the trip owner or organizer can archive this trip.',
      });
    }

    // Toggle between archived and planning
    const newStatus = trip.status === 'archived' ? 'planning' : 'archived';
    trip.status = newStatus;
    await trip.save();

    return res.status(200).json({
      success: true,
      message: newStatus === 'archived' ? 'Trip archived successfully.' : 'Trip unarchived and active.',
      status: newStatus,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   DELETE /api/trips/:id
 * @desc    Permanently delete a trip and associated expenses (STRICTLY OWNER ONLY)
 * @access  Private
 */
export async function deleteTrip(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Strictly owner only
    if (!trip.owner.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only the trip creator/owner can delete this trip.',
      });
    }

    // Delete associated expenses
    await Expense.deleteMany({ trip: id });

    // Delete trip
    await Trip.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Trip and associated expenses permanently deleted.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/trips/join/:inviteCode
 * @desc    Join an existing trip using invite code
 * @access  Private
 */
export async function joinTrip(req, res, next) {
  try {
    const { inviteCode } = req.params;
    const userId = req.user._id;

    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Invite code is required' });
    }

    const trip = await Trip.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Invalid trip invite code.' });
    }

    // Check if already a member or owner
    const isAlreadyMember = trip.members.some((m) => m.user.equals(userId)) || trip.owner.equals(userId);
    if (isAlreadyMember) {
      return res.status(200).json({
        success: true,
        message: 'You are already a companion on this trip.',
        trip,
      });
    }

    trip.members.push({
      user: userId,
      role: 'editor',
      status: 'accepted',
      joinedAt: new Date(),
    });

    await trip.save();

    const populatedTrip = await Trip.findById(trip._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    return res.status(200).json({
      success: true,
      message: `You successfully joined "${trip.title}"!`,
      trip: populatedTrip,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/trips/upload-banner
 * @desc    Upload a custom banner image for a trip
 * @access  Private (protect middleware)
 */
export async function uploadTripBanner(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload' });
    }

    let bannerUrl = `/uploads/banners/${req.file.filename}`;

    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'triptally/banners',
          transformation: [{ width: 1600, height: 900, crop: 'limit' }],
        });
        if (result?.secure_url) {
          bannerUrl = result.secure_url;
        }
      } catch (cloudErr) {
        console.warn('[Cloudinary] Banner upload fallback to local storage:', cloudErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Trip banner uploaded successfully',
      bannerUrl,
    });
  } catch (err) {
    next(err);
  }
}
