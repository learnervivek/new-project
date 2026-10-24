import { z } from 'zod';
import Trip from '../models/Trip.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import {
  calculateEqualSplits,
  validateAndFormatCustomSplits,
  calculateTripBalances,
} from '../services/expenseCalculationService.js';
import { logTripActivity } from '../services/activityService.js';
import { notifyTripMembers, createNotification } from '../services/notificationService.js';

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

// Validation Schemas
const createExpenseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
  amount: z.number().int('Amount must be an integer in minor units (e.g. cents/paise)').positive('Amount must be positive'),
  category: z.enum(['lodging', 'dining', 'transport', 'activity', 'groceries', 'entertainment', 'other']).default('other'),
  type: z.enum(['expense', 'refund']).default('expense'),
  paidBy: z.string().min(1, 'Payer is required'),
  splitType: z.enum(['equal', 'custom']).default('equal'),
  participants: z.array(z.string()).optional(),
  splits: z
    .array(
      z.object({
        user: z.string().min(1, 'Participant is required'),
        amount: z.number().int('Split amount must be an integer').nonnegative('Split amount cannot be negative'),
      })
    )
    .optional(),
  date: z.string().or(z.date()).optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().default(''),
  receiptUrl: z.string().optional().default(''),
});

const updateExpenseSchema = createExpenseSchema.partial();

const createSettlementSchema = z.object({
  payer: z.string().min(1, 'Payer is required'),
  payee: z.string().min(1, 'Payee is required'),
  amount: z.number().int('Settlement amount must be an integer in minor units').positive('Amount must be positive'),
  paymentMethod: z.enum(['cash', 'upi', 'venmo', 'paypal', 'bank_transfer', 'other']).default('cash'),
  date: z.string().or(z.date()).optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().default(''),
});

/**
 * @route   GET /api/trips/:tripId/expenses
 * @desc    Get all expenses for a trip with optional category, member, date, and text filters
 * @access  Private (Trip Members)
 */
export const getTripExpenses = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { category, paidBy, startDate, endDate, search } = req.query;

    await verifyTripAccess(tripId, req.user._id);

    const filter = { trip: tripId };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (paidBy && paidBy !== 'all') {
      filter.paidBy = paidBy;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trips/:tripId/expenses/balances
 * @desc    Get authoritative balance calculations, individual net balances, and suggested settlements
 * @access  Private (Trip Members)
 */
export const getExpenseBalances = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { trip } = await verifyTripAccess(tripId, req.user._id);

    // Populate all members
    await trip.populate('members.user', 'name email avatar');

    // Collect all unique members (owner + accepted members)
    const membersList = [{ user: trip.owner }];
    trip.members.forEach((m) => {
      if (m.status === 'accepted' && m.user) {
        // avoid duplicate if owner is also in members array
        if (String(m.user._id || m.user) !== String(trip.owner?._id || trip.owner)) {
          membersList.push(m);
        }
      }
    });

    const expenses = await Expense.find({ trip: tripId })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    const settlements = await Settlement.find({ trip: tripId })
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar')
      .populate('recordedBy', 'name email')
      .sort({ date: -1 });

    const balances = calculateTripBalances(membersList, expenses, settlements);

    res.json({
      success: true,
      currency: trip.currency || 'INR',
      budget: trip.budget || 0,
      balances,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trips/:tripId/expenses
 * @desc    Create a new expense with equal or custom splits
 * @access  Private (Editors & Organizers)
 */
export const createExpense = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { trip, canEdit } = await verifyTripAccess(tripId, req.user._id);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Viewers cannot record expenses',
      });
    }

    const validatedData = createExpenseSchema.parse(req.body);

    // Duplicate Prevention: Check identical submission within last 3 seconds
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const duplicate = await Expense.findOne({
      trip: tripId,
      title: validatedData.title,
      amount: validatedData.amount,
      paidBy: validatedData.paidBy,
      createdAt: { $gt: threeSecondsAgo },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate expense detected. Please wait before re-submitting.',
      });
    }

    let calculatedSplits = [];

    if (validatedData.splitType === 'equal') {
      let participantIds = validatedData.participants;

      // Default to all trip members if participants not specified
      if (!participantIds || participantIds.length === 0) {
        participantIds = [
          String(trip.owner?._id || trip.owner),
          ...trip.members.filter((m) => m.status === 'accepted').map((m) => String(m.user?._id || m.user)),
        ];
        // Deduplicate
        participantIds = Array.from(new Set(participantIds));
      }

      calculatedSplits = calculateEqualSplits(validatedData.amount, participantIds);
    } else {
      // Custom splits validation
      if (!validatedData.splits || validatedData.splits.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Custom splits must be specified when splitType is "custom"',
        });
      }
      calculatedSplits = validateAndFormatCustomSplits(validatedData.amount, validatedData.splits);
    }

    const expense = await Expense.create({
      trip: tripId,
      title: validatedData.title,
      amount: validatedData.amount,
      currency: trip.currency || 'INR',
      category: validatedData.category,
      type: validatedData.type,
      paidBy: validatedData.paidBy,
      splitType: validatedData.splitType,
      splits: calculatedSplits,
      receiptUrl: validatedData.receiptUrl,
      date: validatedData.date ? new Date(validatedData.date) : new Date(),
      notes: validatedData.notes,
      createdBy: req.user._id,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .populate('createdBy', 'name email');

    // Log non-sensitive trip activity (no payment details/receipts)
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'expense_add',
      entityType: 'expense',
      entityId: expense._id,
      summary: `Logged expense "${populatedExpense.title}" for ${(populatedExpense.amount / 100).toFixed(2)} ${trip.currency || 'INR'}`,
      metadata: {
        title: populatedExpense.title,
        amountMajor: populatedExpense.amount / 100,
        currency: trip.currency || 'INR',
        category: populatedExpense.category,
      },
    });

    // Notify trip members about new expense
    await notifyTripMembers({
      tripId,
      senderId: req.user._id,
      type: 'expense_created',
      title: 'New Expense Logged',
      message: `${req.user.name || 'A traveler'} logged "${populatedExpense.title}" for ${(populatedExpense.amount / 100).toFixed(2)} ${trip.currency || 'INR'}.`,
      link: `/trips/${tripId}`,
      metadata: {
        title: populatedExpense.title,
        amount: populatedExpense.amount,
        currency: trip.currency || 'INR',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense: populatedExpense,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: err.errors[0]?.message || 'Validation error',
        errors: err.errors,
      });
    }
    if (
      err.message?.includes('Custom splits') ||
      err.message?.includes('Total amount') ||
      err.message?.includes('participant')
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

/**
 * @route   GET /api/trips/:tripId/expenses/:expenseId
 * @desc    Get single expense details
 * @access  Private (Trip Members)
 */
export const getExpenseById = async (req, res, next) => {
  try {
    const { tripId, expenseId } = req.params;
    await verifyTripAccess(tripId, req.user._id);

    const expense = await Expense.findOne({ _id: expenseId, trip: tripId })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .populate('createdBy', 'name email');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    res.json({
      success: true,
      expense,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/trips/:tripId/expenses/:expenseId
 * @desc    Update an expense
 * @access  Private (Creator or Organizer/Owner)
 */
export const updateExpense = async (req, res, next) => {
  try {
    const { tripId, expenseId } = req.params;
    const { trip, isOwner, role } = await verifyTripAccess(tripId, req.user._id);

    const expense = await Expense.findOne({ _id: expenseId, trip: tripId });
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Permission check: only creator or organizer/owner can edit
    const isCreator = String(expense.createdBy) === String(req.user._id);
    const isOrganizer = isOwner || role === 'organizer';

    if (!isCreator && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only the expense creator or organizer can modify this expense',
      });
    }

    const validatedData = updateExpenseSchema.parse(req.body);

    const newAmount = validatedData.amount !== undefined ? validatedData.amount : expense.amount;
    const newSplitType = validatedData.splitType || expense.splitType;

    let updatedSplits = expense.splits;

    // Recalculate splits if amount, splitType, participants, or splits changed
    if (
      validatedData.amount !== undefined ||
      validatedData.splitType !== undefined ||
      validatedData.participants !== undefined ||
      validatedData.splits !== undefined
    ) {
      if (newSplitType === 'equal') {
        let participantIds = validatedData.participants;
        if (!participantIds || participantIds.length === 0) {
          // Use previous participants or trip members
          participantIds = expense.splits.map((s) => String(s.user));
          if (participantIds.length === 0) {
            participantIds = [
              String(trip.owner?._id || trip.owner),
              ...trip.members.filter((m) => m.status === 'accepted').map((m) => String(m.user?._id || m.user)),
            ];
          }
        }
        updatedSplits = calculateEqualSplits(newAmount, participantIds);
      } else {
        const rawSplits = validatedData.splits || expense.splits;
        updatedSplits = validateAndFormatCustomSplits(newAmount, rawSplits);
      }
    }

    // Apply updates
    if (validatedData.title !== undefined) expense.title = validatedData.title;
    if (validatedData.amount !== undefined) expense.amount = validatedData.amount;
    if (validatedData.category !== undefined) expense.category = validatedData.category;
    if (validatedData.type !== undefined) expense.type = validatedData.type;
    if (validatedData.paidBy !== undefined) expense.paidBy = validatedData.paidBy;
    if (validatedData.splitType !== undefined) expense.splitType = validatedData.splitType;
    expense.splits = updatedSplits;
    if (validatedData.date !== undefined) expense.date = new Date(validatedData.date);
    if (validatedData.notes !== undefined) expense.notes = validatedData.notes;
    if (validatedData.receiptUrl !== undefined) expense.receiptUrl = validatedData.receiptUrl;

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense: populated,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: err.errors[0]?.message || 'Validation error',
        errors: err.errors,
      });
    }
    if (
      err.message?.includes('Custom splits') ||
      err.message?.includes('Total amount') ||
      err.message?.includes('participant')
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

/**
 * @route   DELETE /api/trips/:tripId/expenses/:expenseId
 * @desc    Delete an expense
 * @access  Private (Creator or Organizer/Owner)
 */
export const deleteExpense = async (req, res, next) => {
  try {
    const { tripId, expenseId } = req.params;
    const { isOwner, role } = await verifyTripAccess(tripId, req.user._id);

    const expense = await Expense.findOne({ _id: expenseId, trip: tripId });
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    const isCreator = String(expense.createdBy) === String(req.user._id);
    const isOrganizer = isOwner || role === 'organizer';

    if (!isCreator && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only the expense creator or organizer can delete this expense',
      });
    }

    const deletedTitle = expense.title;
    await expense.deleteOne();

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'expense_delete',
      entityType: 'expense',
      entityId: expenseId,
      summary: `Deleted expense "${deletedTitle}"`,
      metadata: { title: deletedTitle },
    });

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/trips/:tripId/settlements
 * @desc    Get all settlement history for a trip
 * @access  Private (Trip Members)
 */
export const getTripSettlements = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    await verifyTripAccess(tripId, req.user._id);

    const settlements = await Settlement.find({ trip: tripId })
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar')
      .populate('recordedBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: settlements.length,
      settlements,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trips/:tripId/settlements
 * @desc    Record a new settlement between members
 * @access  Private (Editors & Organizers)
 */
export const createSettlement = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { trip, canEdit } = await verifyTripAccess(tripId, req.user._id);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Viewers cannot record settlements',
      });
    }

    const validatedData = createSettlementSchema.parse(req.body);

    if (validatedData.payer === validatedData.payee) {
      return res.status(400).json({
        success: false,
        message: 'Payer and payee cannot be the same member',
      });
    }

    // Duplicate settlement prevention (same payer, payee, amount in last 3 seconds)
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const duplicate = await Settlement.findOne({
      trip: tripId,
      payer: validatedData.payer,
      payee: validatedData.payee,
      amount: validatedData.amount,
      createdAt: { $gt: threeSecondsAgo },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate settlement detected. Please wait before re-submitting.',
      });
    }

    const settlement = await Settlement.create({
      trip: tripId,
      payer: validatedData.payer,
      payee: validatedData.payee,
      amount: validatedData.amount,
      currency: trip.currency || 'INR',
      paymentMethod: validatedData.paymentMethod,
      date: validatedData.date ? new Date(validatedData.date) : new Date(),
      notes: validatedData.notes,
      recordedBy: req.user._id,
    });

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar')
      .populate('recordedBy', 'name email');

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'settlement_add',
      entityType: 'settlement',
      entityId: settlement._id,
      summary: `Recorded settlement of ${(settlement.amount / 100).toFixed(2)} ${trip.currency || 'INR'} between ${populatedSettlement.payer?.name || 'Traveler'} and ${populatedSettlement.payee?.name || 'Traveler'}`,
      metadata: {
        amountMajor: settlement.amount / 100,
        currency: trip.currency || 'INR',
        payerName: populatedSettlement.payer?.name,
        payeeName: populatedSettlement.payee?.name,
      },
    });

    // Notify payee about settlement
    const payeeId = populatedSettlement.payee?._id || populatedSettlement.payee;
    if (payeeId && String(payeeId) !== String(req.user._id)) {
      await createNotification({
        recipientId: payeeId,
        senderId: req.user._id,
        tripId,
        type: 'settlement_created',
        title: 'Settlement Payment Recorded',
        message: `${populatedSettlement.payer?.name || 'A companion'} recorded a settlement of ${(settlement.amount / 100).toFixed(2)} ${trip.currency || 'INR'} to you.`,
        link: `/trips/${tripId}`,
        metadata: {
          amount: settlement.amount,
          currency: trip.currency || 'INR',
          payerName: populatedSettlement.payer?.name,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      settlement: populatedSettlement,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: err.errors[0]?.message || 'Validation error',
        errors: err.errors,
      });
    }
    next(err);
  }
};

/**
 * @route   DELETE /api/trips/:tripId/settlements/:settlementId
 * @desc    Delete a settlement (reverse settlement)
 * @access  Private (Recorder or Organizer/Owner)
 */
export const deleteSettlement = async (req, res, next) => {
  try {
    const { tripId, settlementId } = req.params;
    const { isOwner, role } = await verifyTripAccess(tripId, req.user._id);

    const settlement = await Settlement.findOne({ _id: settlementId, trip: tripId });
    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found',
      });
    }

    const isRecorder = String(settlement.recordedBy) === String(req.user._id);
    const isOrganizer = isOwner || role === 'organizer';

    if (!isRecorder && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only the settlement recorder or organizer can delete this settlement',
      });
    }

    await settlement.deleteOne();

    // Log trip activity
    await logTripActivity({
      tripId,
      actorId: req.user._id,
      action: 'settlement_delete',
      entityType: 'settlement',
      entityId: settlementId,
      summary: `Settlement record was deleted`,
    });

    res.json({
      success: true,
      message: 'Settlement removed successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/trips/:tripId/expenses/upload-receipt
 * @desc    Upload an expense receipt image or PDF
 * @access  Private (Editors & Organizers)
 */
export const uploadReceipt = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { canEdit } = await verifyTripAccess(tripId, req.user._id);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Viewers cannot upload receipts',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt file provided',
      });
    }

    // Return URL for the stored file
    const receiptUrl = `/uploads/receipts/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Receipt uploaded successfully',
      receiptUrl,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getTripExpenses,
  getExpenseBalances,
  createExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getTripSettlements,
  createSettlement,
  deleteSettlement,
  uploadReceipt,
};
