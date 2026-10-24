import { z } from 'zod';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { runScheduledReminders } from '../services/notificationService.js';

/**
 * @route   GET /api/notifications
 * @desc    Get paginated notifications for the authenticated user with unread count
 * @access  Private
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { recipient: userId };

    if (req.query.isRead !== undefined && req.query.isRead !== '') {
      query.isRead = req.query.isRead === 'true';
    }

    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name email avatar')
        .populate('trip', 'title destination coverImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
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

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ _id: id, recipient: userId });
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/notifications/mark-all-read
 * @desc    Mark all notifications for the authenticated user as read
 * @access  Private
 */
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
      unreadCount: 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({ _id: id, recipient: userId });
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Notification removed',
      deletedId: id,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/notifications/clear-read
 * @desc    Clear all read notifications for user
 * @access  Private
 */
export const clearReadNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({ recipient: userId, isRead: true });

    return res.status(200).json({
      success: true,
      message: 'Read notifications cleared',
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};

const preferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  tripReminders: z.boolean().optional(),
  expenseAlerts: z.boolean().optional(),
  itineraryUpdates: z.boolean().optional(),
});

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get user's notification preferences
 * @access  Private
 */
export const getNotificationPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    const preferences = user?.notificationPreferences || {
      emailNotifications: true,
      tripReminders: true,
      expenseAlerts: true,
      itineraryUpdates: true,
    };

    return res.status(200).json({
      success: true,
      preferences,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/notifications/preferences
 * @desc    Update user's notification preferences
 * @access  Private
 */
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const parseResult = preferencesSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = new Error('Invalid preferences payload');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...parseResult.data,
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      preferences: user.notificationPreferences,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/notifications/run-reminders
 * @desc    Trigger scheduled reminders execution (Upcoming trips and unsettled debt tallies)
 * @access  Private
 */
export const triggerReminders = async (req, res, next) => {
  try {
    const result = await runScheduledReminders();
    return res.status(200).json({
      success: true,
      message: 'Scheduled reminders processed successfully',
      result,
    });
  } catch (err) {
    next(err);
  }
};
