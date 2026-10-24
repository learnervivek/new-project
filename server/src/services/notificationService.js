import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import { calculateTripBalances } from './expenseCalculationService.js';
import emailService from '../utils/emailService.js';
import { getClientUrl } from '../utils/urlHelper.js';

/**
 * Create a single in-app notification with optional email dispatch
 */
export async function createNotification({
  recipientId,
  senderId = null,
  tripId = null,
  type,
  title,
  message,
  link = '',
  metadata = {},
  sendEmailIfAllowed = true,
}) {
  try {
    const recipient = await User.findById(recipientId).select('name email notificationPreferences');
    if (!recipient) return null;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      trip: tripId,
      type,
      title,
      message,
      link,
      metadata,
    });

    // Check notification preferences for optional email delivery
    const prefs = recipient.notificationPreferences || {
      emailNotifications: true,
      tripReminders: true,
      expenseAlerts: true,
      itineraryUpdates: true,
    };

    if (sendEmailIfAllowed && prefs.emailNotifications) {
      const clientUrl = getClientUrl();
      const targetUrl = link ? (link.startsWith('http') ? link : `${clientUrl}${link}`) : clientUrl;

      if (type === 'upcoming_trip_reminder' && prefs.tripReminders) {
        await emailService.sendUpcomingTripReminderEmail({
          to: recipient.email,
          userName: recipient.name,
          tripTitle: metadata.tripTitle || 'Trip',
          destination: metadata.destination || 'Destination',
          startDate: metadata.startDate,
          daysUntil: metadata.daysUntil || 1,
          tripUrl: targetUrl,
        });
      } else if (type === 'unsettled_expense_reminder' && prefs.tripReminders) {
        await emailService.sendUnsettledExpenseReminderEmail({
          to: recipient.email,
          userName: recipient.name,
          tripTitle: metadata.tripTitle || 'Trip',
          destination: metadata.destination || 'Destination',
          amountDue: metadata.amountDue || '0.00',
          currency: metadata.currency || 'INR',
          tripUrl: targetUrl,
        });
      }
    }

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Notify all members of a trip (e.g. for new itinerary items, new expenses, settlements)
 */
export async function notifyTripMembers({
  tripId,
  senderId = null,
  type,
  title,
  message,
  link = '',
  metadata = {},
  excludeSender = true,
}) {
  try {
    const trip = await Trip.findById(tripId).select('title destination owner members');
    if (!trip) return [];

    const recipientIds = new Set();

    // Add owner
    if (trip.owner) {
      recipientIds.add(String(trip.owner._id || trip.owner));
    }

    // Add accepted members
    (trip.members || []).forEach((m) => {
      if (m.status === 'accepted' && m.user) {
        recipientIds.add(String(m.user._id || m.user));
      }
    });

    // Exclude sender
    if (excludeSender && senderId) {
      recipientIds.delete(String(senderId));
    }

    const createdNotifications = [];
    for (const rid of recipientIds) {
      const notif = await createNotification({
        recipientId: rid,
        senderId,
        tripId,
        type,
        title,
        message,
        link: link || `/trips/${tripId}`,
        metadata: {
          ...metadata,
          tripTitle: trip.title,
          destination: trip.destination,
        },
      });
      if (notif) createdNotifications.push(notif);
    }

    return createdNotifications;
  } catch (err) {
    console.error('Failed to notify trip members:', err.message);
    return [];
  }
}

/**
 * Scheduled job to check and send upcoming trip reminders and unsettled debt reminders.
 * Safe to retry, non-blocking, and prevents duplicates within configured windows.
 */
export async function runScheduledReminders() {
  const now = new Date();
  let upcomingTripsReminded = 0;
  let unsettledDebtsReminded = 0;

  try {
    // 1. Upcoming Trip Reminders: Starts between now and next 3 days
    const upcomingWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // within last 24h
    const upcomingWindowEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // next 3 days

    const upcomingTrips = await Trip.find({
      status: { $in: ['confirmed', 'planning', 'ongoing'] },
      startDate: { $gte: upcomingWindowStart, $lte: upcomingWindowEnd },
    }).populate('owner', 'name email notificationPreferences').populate('members.user', 'name email notificationPreferences');

    for (const trip of upcomingTrips) {
      const daysUntil = Math.max(1, Math.ceil((new Date(trip.startDate) - now) / (1000 * 60 * 60 * 24)));
      const membersToRemind = [];

      if (trip.owner) membersToRemind.push(trip.owner);
      (trip.members || []).forEach((m) => {
        if (m.status === 'accepted' && m.user) {
          membersToRemind.push(m.user);
        }
      });

      for (const traveler of membersToRemind) {
        const travelerId = traveler._id;

        // Duplicate check: did we already send an upcoming_trip_reminder for this trip to this user in last 48 hours?
        const recentReminder = await Notification.findOne({
          recipient: travelerId,
          trip: trip._id,
          type: 'upcoming_trip_reminder',
          createdAt: { $gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
        });

        if (!recentReminder) {
          await createNotification({
            recipientId: travelerId,
            tripId: trip._id,
            type: 'upcoming_trip_reminder',
            title: `Trip Reminder: ${trip.title}`,
            message: `Your trip to ${trip.destination} is coming up in ${daysUntil === 1 ? '1 day' : `${daysUntil} days`}! Check your itinerary and packing checklist.`,
            link: `/trips/${trip._id}`,
            metadata: {
              tripTitle: trip.title,
              destination: trip.destination,
              startDate: trip.startDate,
              daysUntil,
            },
          });
          upcomingTripsReminded++;
        }
      }
    }

    // 2. Unsettled Expense Reminders: Completed or ongoing trips with expenses
    const tripsWithExpenses = await Trip.find({
      status: { $in: ['completed', 'ongoing', 'planning'] },
    }).populate('owner', 'name email notificationPreferences').populate('members.user', 'name email notificationPreferences');

    for (const trip of tripsWithExpenses) {
      const [expenses, settlements] = await Promise.all([
        Expense.find({ trip: trip._id }).populate('paidBy', 'name email').populate('splits.user', 'name email'),
        Settlement.find({ trip: trip._id }).populate('payer', 'name email').populate('payee', 'name email'),
      ]);

      if (expenses.length === 0) continue;

      const membersList = [{ user: trip.owner }];
      (trip.members || []).forEach((m) => {
        if (m.status === 'accepted' && m.user) {
          if (String(m.user._id || m.user) !== String(trip.owner?._id || trip.owner)) {
            membersList.push(m);
          }
        }
      });

      const { memberLedgers } = calculateTripBalances(membersList, expenses, settlements);

      // Check for members with outstanding net debt (netBalance < 0)
      for (const ledger of memberLedgers || []) {
        if (ledger.netBalance < 0) {
          const debtorId = ledger.user._id;
          const debtAmount = (Math.abs(ledger.netBalance) / 100).toFixed(2);

          // Duplicate check: avoid spamming reminders more than once every 7 days per trip
          const recentDebtReminder = await Notification.findOne({
            recipient: debtorId,
            trip: trip._id,
            type: 'unsettled_expense_reminder',
            createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          });

          if (!recentDebtReminder) {
            await createNotification({
              recipientId: debtorId,
              tripId: trip._id,
              type: 'unsettled_expense_reminder',
              title: `Pending Settlement for ${trip.title}`,
              message: `You have an unsettled balance of ${debtAmount} ${trip.currency || 'INR'} on "${trip.title}". Review group debts and settle up.`,
              link: `/trips/${trip._id}`,
              metadata: {
                tripTitle: trip.title,
                destination: trip.destination,
                amountDue: debtAmount,
                currency: trip.currency || 'INR',
              },
            });
            unsettledDebtsReminded++;
          }
        }
      }
    }

    return {
      success: true,
      upcomingTripsReminded,
      unsettledDebtsReminded,
      timestamp: now,
    };
  } catch (err) {
    console.error('Error running scheduled reminders:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

export default {
  createNotification,
  notifyTripMembers,
  runScheduledReminders,
};
