import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  triggerReminders,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All notification routes require authentication
router.use(protect);

router.get('/', getNotifications);
router.patch('/mark-all-read', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/clear-read', clearReadNotifications);
router.delete('/:id', deleteNotification);

// Notification Preferences
router.get('/preferences', getNotificationPreferences);
router.patch('/preferences', updateNotificationPreferences);

// Manual trigger for testing/scheduled execution
router.post('/run-reminders', triggerReminders);

export default router;
