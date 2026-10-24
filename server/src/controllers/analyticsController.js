import mongoose from 'mongoose';
import { z } from 'zod';
import Trip from '../models/Trip.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import ItineraryItem from '../models/ItineraryItem.js';
import { calculateTripBalances } from '../services/expenseCalculationService.js';

/**
 * Helper to verify trip access and resolve role
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
  lodging: 'Lodging & Stays',
  dining: 'Dining & Restaurants',
  transport: 'Transport & Transit',
  activity: 'Activities & Attractions',
  groceries: 'Groceries & Supplies',
  entertainment: 'Nightlife & Entertainment',
  other: 'Other & Miscellaneous',
};

const categoryColors = {
  lodging: '#3B82F6', // Blue
  dining: '#E07A5F', // Terracotta
  transport: '#F59E0B', // Amber
  activity: '#1B4332', // Forest
  groceries: '#10B981', // Emerald
  entertainment: '#8B5CF6', // Purple
  other: '#6B7280', // Charcoal/Gray
};

/**
 * @route   GET /api/trips/:tripId/analytics
 * @desc    Get comprehensive budget analytics, KPI metrics, charts data, and member contributions
 * @access  Private (Trip Members)
 */
export const getTripAnalytics = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { trip, canEdit, isOwner } = await verifyTripAccess(tripId, req.user._id);

    const tripObjId = new mongoose.Types.ObjectId(tripId);

    // 1. Populate all accepted members + owner for authoritative balance calculations
    await trip.populate('members.user', 'name email avatar');
    const membersList = [{ user: trip.owner }];
    trip.members.forEach((m) => {
      if (m.status === 'accepted' && m.user) {
        if (String(m.user._id || m.user) !== String(trip.owner?._id || trip.owner)) {
          membersList.push(m);
        }
      }
    });

    // 2. Fetch all expenses & settlements for authoritative ledger calculations
    const [expenses, settlements] = await Promise.all([
      Expense.find({ trip: tripId })
        .populate('paidBy', 'name email avatar')
        .populate('splits.user', 'name email avatar')
        .sort({ date: -1, createdAt: -1 }),
      Settlement.find({ trip: tripId })
        .populate('payer', 'name email avatar')
        .populate('payee', 'name email avatar')
        .sort({ date: -1 }),
    ]);

    const balances = calculateTripBalances(membersList, expenses, settlements);

    // 3. MongoDB Aggregation: Category-wise spending
    const categorySpendingRaw = await Expense.aggregate([
      { $match: { trip: tripObjId } },
      {
        $project: {
          category: 1,
          signedAmount: {
            $cond: {
              if: { $eq: ['$type', 'refund'] },
              then: { $multiply: ['$amount', -1] },
              else: '$amount',
            },
          },
        },
      },
      {
        $group: {
          _id: '$category',
          totalSpentMinor: { $sum: '$signedAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalSpentMinor: -1 } },
    ]);

    // 4. MongoDB Aggregation: Daily spending trend
    const dailySpendingRaw = await Expense.aggregate([
      { $match: { trip: tripObjId } },
      {
        $project: {
          dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          signedAmount: {
            $cond: {
              if: { $eq: ['$type', 'refund'] },
              then: { $multiply: ['$amount', -1] },
              else: '$amount',
            },
          },
        },
      },
      {
        $group: {
          _id: '$dateStr',
          dailySpentMinor: { $sum: '$signedAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 5. MongoDB Aggregation: Planned spending by category from ItineraryItems
    const plannedItineraryRaw = await ItineraryItem.aggregate([
      { $match: { trip: tripObjId } },
      {
        $group: {
          _id: '$category',
          plannedTotal: { $sum: '$estimatedCost' },
          count: { $sum: 1 },
        },
      },
    ]);

    // 6. Harmonize Planned vs Actual spending
    // Canonical comparison groups: Lodging, Food & Dining, Transit, Activities, Other
    const plannedMap = new Map();
    let totalPlannedCost = 0;
    plannedItineraryRaw.forEach((item) => {
      plannedMap.set(item._id, item.plannedTotal);
      totalPlannedCost += item.plannedTotal;
    });

    const actualMap = new Map();
    categorySpendingRaw.forEach((item) => {
      actualMap.set(item._id, item.totalSpentMinor);
    });

    // Comparison groupings
    const comparisonBuckets = [
      {
        categoryKey: 'lodging',
        name: 'Lodging',
        planned: plannedMap.get('accommodation') || 0,
        actualMinor: actualMap.get('lodging') || 0,
      },
      {
        categoryKey: 'dining',
        name: 'Food & Dining',
        planned: plannedMap.get('restaurant') || 0,
        actualMinor: (actualMap.get('dining') || 0) + (actualMap.get('groceries') || 0),
      },
      {
        categoryKey: 'transit',
        name: 'Transit',
        planned: plannedMap.get('transportation') || 0,
        actualMinor: actualMap.get('transport') || 0,
      },
      {
        categoryKey: 'activities',
        name: 'Activities',
        planned: (plannedMap.get('sightseeing') || 0) + (plannedMap.get('activity') || 0),
        actualMinor: (actualMap.get('activity') || 0) + (actualMap.get('entertainment') || 0),
      },
      {
        categoryKey: 'other',
        name: 'Other',
        planned: 0,
        actualMinor: actualMap.get('other') || 0,
      },
    ];

    const plannedVsActual = comparisonBuckets.map((bucket) => {
      const actual = Math.max(0, bucket.actualMinor) / 100;
      const planned = bucket.planned;
      const variance = planned - actual;
      const percentageUsed = planned > 0 ? Math.round((actual / planned) * 100) : (actual > 0 ? 100 : 0);

      return {
        key: bucket.categoryKey,
        name: bucket.name,
        planned,
        actual,
        plannedMinor: planned * 100,
        actualMinor: bucket.actualMinor,
        variance,
        percentageUsed,
      };
    });

    // 7. Format Daily Spending Trend with Cumulative Totals
    let cumulativeSpentMinor = 0;
    const dailySpendingTrend = dailySpendingRaw.map((day) => {
      cumulativeSpentMinor += day.dailySpentMinor;
      const dailySpent = day.dailySpentMinor / 100;
      const cumulativeSpent = cumulativeSpentMinor / 100;

      return {
        date: day._id,
        dailySpentMinor: day.dailySpentMinor,
        dailySpent,
        cumulativeSpentMinor,
        cumulativeSpent,
        count: day.count,
      };
    });

    // 8. Format Category-wise spending with percentages
    const totalSpentMinor = balances.totalSpent;
    const totalSpentMajor = totalSpentMinor / 100;

    const categorySpending = categorySpendingRaw.map((cat) => {
      const minor = Math.max(0, cat.totalSpentMinor);
      const major = minor / 100;
      const percentage =
        totalSpentMinor > 0 ? Math.round((minor / totalSpentMinor) * 1000) / 10 : 0;

      return {
        category: cat._id,
        label: categoryLabels[cat._id] || cat._id,
        color: categoryColors[cat._id] || '#6B7280',
        totalSpentMinor: minor,
        totalSpent: major,
        count: cat.count,
        percentage,
      };
    });

    // 9. Format Member Contributions Summary
    const memberContributions = (balances.memberLedgers || [])
      .map((m) => {
        const totalPaidMinor = m.totalPaid;
        const totalPaid = totalPaidMinor / 100;
        const totalShareMinor = m.totalShare;
        const totalShare = totalShareMinor / 100;
        const netBalanceMinor = m.netBalance;
        const netBalance = netBalanceMinor / 100;
        const percentageContributed =
          totalSpentMinor > 0
            ? Math.max(0, Math.round((totalPaidMinor / totalSpentMinor) * 1000) / 10)
            : 0;

        return {
          userId: m.user._id,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar,
          totalPaidMinor,
          totalPaid,
          totalShareMinor,
          totalShare,
          netBalanceMinor,
          netBalance,
          percentageContributed,
        };
      })
      .sort((a, b) => b.totalPaidMinor - a.totalPaidMinor);

    // 10. Authoritative KPI Totals & Threshold Alerts
    const totalBudgetMajor = Number(trip.budget) || 0;
    const totalBudgetMinor = totalBudgetMajor * 100;
    const remainingBudgetMinor = Math.max(0, totalBudgetMinor - totalSpentMinor);
    const remainingBudgetMajor = remainingBudgetMinor / 100;
    const overBudgetMinor = Math.max(0, totalSpentMinor - totalBudgetMinor);
    const overBudgetMajor = overBudgetMinor / 100;

    const percentageUsed =
      totalBudgetMajor > 0
        ? Math.round((totalSpentMinor / totalBudgetMinor) * 1000) / 10
        : 0;

    const threshold = trip.budgetAlertThreshold ?? 80;
    const isOverBudget = totalBudgetMajor > 0 && totalSpentMinor > totalBudgetMinor;
    const isThresholdExceeded = totalBudgetMajor > 0 && percentageUsed >= threshold;

    let alertStatus = {
      level: 'normal',
      threshold,
      isThresholdExceeded,
      isOverBudget,
      message: `Spending is within normal parameters (${percentageUsed}% of budget).`,
    };

    if (isOverBudget) {
      alertStatus = {
        level: 'danger',
        threshold,
        isThresholdExceeded: true,
        isOverBudget: true,
        message: `Over budget by ${overBudgetMajor.toLocaleString('en-IN')} ${trip.currency || 'INR'} (${percentageUsed}% used).`,
      };
    } else if (isThresholdExceeded) {
      alertStatus = {
        level: 'warning',
        threshold,
        isThresholdExceeded: true,
        isOverBudget: false,
        message: `Budget warning: ${percentageUsed}% used has reached the ${threshold}% alert threshold.`,
      };
    }

    // 11. Clean expense history with formatted amounts
    const expenseHistory = expenses.map((e) => ({
      _id: e._id,
      title: e.title,
      amount: e.amount,
      amountMajor: e.amount / 100,
      category: e.category,
      categoryLabel: categoryLabels[e.category] || e.category,
      type: e.type,
      date: e.date,
      paidBy: {
        _id: e.paidBy?._id,
        name: e.paidBy?.name || 'Traveler',
        avatar: e.paidBy?.avatar || '',
        email: e.paidBy?.email || '',
      },
      splitType: e.splitType,
      receiptUrl: e.receiptUrl || '',
      notes: e.notes || '',
    }));

    return res.status(200).json({
      success: true,
      currency: trip.currency || 'INR',
      kpis: {
        totalBudget: totalBudgetMajor,
        totalBudgetMinor,
        totalSpent: totalSpentMajor,
        totalSpentMinor,
        remainingBudget: remainingBudgetMajor,
        remainingBudgetMinor,
        overBudget: overBudgetMajor,
        overBudgetMinor,
        percentageUsed,
        totalPlannedCost,
        plannedVariance: totalPlannedCost - totalSpentMajor,
        hasBudget: totalBudgetMajor > 0,
      },
      alertStatus,
      categorySpending,
      plannedVsActual,
      dailySpendingTrend,
      memberContributions,
      expenseHistory,
      canEdit,
      isOwner,
    });
  } catch (err) {
    next(err);
  }
};

const updateBudgetAlertSchema = z.object({
  threshold: z
    .number()
    .min(10, 'Alert threshold must be at least 10%')
    .max(200, 'Alert threshold cannot exceed 200%'),
});

/**
 * @route   PATCH /api/trips/:tripId/budget-alert
 * @desc    Update trip budget alert threshold percentage
 * @access  Private (Trip Owner / Organizer / Editor)
 */
export const updateBudgetAlertThreshold = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { trip, canEdit } = await verifyTripAccess(tripId, req.user._id);

    if (!canEdit) {
      const error = new Error('Permission denied: Only trip editors or owners can update budget alert settings');
      error.statusCode = 403;
      throw error;
    }

    const parseResult = updateBudgetAlertSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = new Error(parseResult.error.errors[0]?.message || 'Invalid threshold percentage');
      error.statusCode = 400;
      throw error;
    }

    const { threshold } = parseResult.data;
    trip.budgetAlertThreshold = threshold;
    await trip.save();

    return res.status(200).json({
      success: true,
      message: `Budget threshold alert updated to ${threshold}%`,
      budgetAlertThreshold: trip.budgetAlertThreshold,
    });
  } catch (err) {
    next(err);
  }
};
