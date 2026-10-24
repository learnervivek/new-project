import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  IndianRupee,
  Calendar,
  Mail,
  Trash2,
  Check,
  Settings,
  Filter,
  RefreshCw,
  ExternalLink,
  Compass,
  AlertCircle,
  Clock,
  Sparkles,
  X,
  Volume2,
  Sliders,
  Send
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import tripService from '../services/tripService';

// Helper to format friendly relative time
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Map notification type to display metadata
function getNotificationMeta(type) {
  switch (type) {
    case 'trip_invitation':
      return {
        icon: Mail,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        badge: 'Invitation',
        badgeVariant: 'neutral'
      };
    case 'itinerary_update':
      return {
        icon: Calendar,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        badge: 'Itinerary',
        badgeVariant: 'warning'
      };
    case 'expense_created':
    case 'expense_updated':
    case 'expense_deleted':
      return {
        icon: IndianRupee,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        badge: 'Expense',
        badgeVariant: 'success'
      };
    case 'settlement_created':
      return {
        icon: CheckCircle2,
        color: 'text-teal-600 bg-teal-50 border-teal-200',
        badge: 'Settlement',
        badgeVariant: 'success'
      };
    case 'upcoming_trip_reminder':
      return {
        icon: Compass,
        color: 'text-forest-600 bg-forest-50 border-forest-200',
        badge: 'Upcoming Trip',
        badgeVariant: 'forest'
      };
    case 'unsettled_expense_reminder':
      return {
        icon: AlertCircle,
        color: 'text-terracotta-600 bg-terracotta-50 border-terracotta-200',
        badge: 'Payment Due',
        badgeVariant: 'error'
      };
    default:
      return {
        icon: Bell,
        color: 'text-charcoal-600 bg-ivory-100 border-ivory-200',
        badge: 'Notification',
        badgeVariant: 'neutral'
      };
  }
}

export function NotificationsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all, unread, invitations, expenses, itinerary, reminders
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    tripReminders: true,
    expenseAlerts: true,
    itineraryUpdates: true
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeFilter === 'unread') {
        params.isRead = 'false';
      } else if (activeFilter === 'invitations') {
        params.type = 'trip_invitation';
      } else if (activeFilter === 'expenses') {
        params.type = 'expense_created,expense_updated,settlement_created';
      } else if (activeFilter === 'itinerary') {
        params.type = 'itinerary_update';
      } else if (activeFilter === 'reminders') {
        params.type = 'upcoming_trip_reminder,unsettled_expense_reminder';
      }

      const res = await tripService.getNotifications(params);
      if (res?.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      toast.error('Error', 'Could not load your notifications.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, toast]);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    try {
      const res = await tripService.getNotificationPreferences();
      if (res?.success && res.preferences) {
        setPreferences(res.preferences);
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await tripService.markNotificationRead(id);
      if (res?.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      toast.error('Failed', 'Could not mark notification as read.');
    }
  };

  // Mark all unread notifications as read
  const handleMarkAllRead = async () => {
    try {
      const res = await tripService.markAllNotificationsRead();
      if (res?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
        setUnreadCount(0);
        toast.success('Done', 'All notifications marked as read.');
      }
    } catch (err) {
      toast.error('Failed', 'Could not mark all notifications as read.');
    }
  };

  // Delete a notification
  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await tripService.deleteNotification(id);
      if (res?.success) {
        setNotifications((prev) => {
          const target = prev.find((n) => n._id === id);
          if (target && !target.isRead) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n._id !== id);
        });
        toast.info('Deleted', 'Notification removed.');
      }
    } catch (err) {
      toast.error('Failed', 'Could not delete notification.');
    }
  };

  // Clear read notifications
  const handleClearRead = async () => {
    try {
      const res = await tripService.clearReadNotifications();
      if (res?.success) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        toast.success('Cleared', `Removed ${res.deletedCount || 0} read notifications.`);
      }
    } catch (err) {
      toast.error('Failed', 'Could not clear read notifications.');
    }
  };

  // Save Preferences
  const handleSavePreferences = async (updated) => {
    setSavingPrefs(true);
    try {
      const res = await tripService.updateNotificationPreferences(updated);
      if (res?.success) {
        setPreferences(res.preferences);
        toast.success('Saved', 'Notification preferences updated.');
      }
    } catch (err) {
      toast.error('Error', 'Failed to update preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleTogglePref = (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    handleSavePreferences(updated);
  };

  // Trigger reminders manually
  const handleTriggerReminders = async () => {
    setTriggeringReminders(true);
    try {
      const res = await tripService.triggerScheduledReminders();
      if (res?.success) {
        toast.success(
          'Reminders Evaluated',
          `Trips: ${res.result?.upcomingTripsReminded || 0}, Pending Balances: ${res.result?.unsettledExpensesReminded || 0}`
        );
        loadNotifications();
      }
    } catch (err) {
      toast.error('Error', 'Failed to run scheduled reminders check.');
    } finally {
      setTriggeringReminders(false);
    }
  };

  // Handle clicking a notification card
  const handleCardClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', badge: unreadCount > 0 ? unreadCount : null },
    { id: 'invitations', label: 'Invitations' },
    { id: 'expenses', label: 'Expenses & Debts' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'reminders', label: 'Reminders' },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ivory-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 font-display">
              Activity & Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge variant="terracotta" size="sm">
                {unreadCount} New
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
            Real-time updates, trip invitations, expense logs, and travel reminders.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreferencesOpen(true)}
            leftIcon={<Settings className="w-4 h-4 text-charcoal-500" />}
          >
            Preferences
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllRead}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Mark All Read
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearRead}
            title="Clear already read notifications"
            className="text-charcoal-500 hover:text-charcoal-700"
          >
            Clear Read
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Manual Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-ivory-300 shadow-soft-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeFilter === tab.id
                  ? 'bg-forest-600 text-white shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-terracotta-500 text-white'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleTriggerReminders}
          disabled={triggeringReminders}
          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-forest-700 bg-forest-50 hover:bg-forest-100 border border-forest-200/60 px-3 py-1.5 rounded-xl transition-colors shrink-0 disabled:opacity-50"
          title="Scan upcoming trips and unsettled balances now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${triggeringReminders ? 'animate-spin' : ''}`} />
          <span>{triggeringReminders ? 'Scanning...' : 'Run Reminders Check'}</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-4 rounded-2xl bg-white border border-ivory-200 animate-pulse flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-ivory-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-ivory-200 rounded w-1/3" />
                  <div className="h-3 bg-ivory-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center border-dashed border-ivory-300">
            <div className="w-14 h-14 rounded-2xl bg-forest-50 border border-forest-200 text-forest-700 flex items-center justify-center mx-auto mb-4 shadow-soft-sm">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-charcoal-900 font-display">
              No notifications to display
            </h3>
            <p className="text-xs sm:text-sm text-charcoal-500 max-w-sm mx-auto mt-1 leading-relaxed">
              {activeFilter === 'unread'
                ? "You're all caught up! No unread notifications right now."
                : "You don't have any notifications in this view. Updates and reminders will appear here."}
            </p>
            {activeFilter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setActiveFilter('all')}
              >
                View All Notifications
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => {
              const meta = getNotificationMeta(n.type);
              const Icon = meta.icon;

              return (
                <div
                  key={n._id}
                  onClick={() => handleCardClick(n)}
                  className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 sm:gap-4 ${
                    !n.isRead
                      ? 'bg-white border-forest-200/90 shadow-soft hover:shadow-soft-md hover:border-forest-300'
                      : 'bg-ivory-50/70 border-ivory-200/80 hover:bg-white hover:border-ivory-300'
                  }`}
                >
                  {/* Unread dot indicator */}
                  {!n.isRead && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-terracotta-500 animate-pulse" />
                  )}

                  {/* Icon Avatar */}
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-soft-sm ${meta.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-charcoal-900 font-display">
                        {n.title}
                      </span>
                      <Badge variant={meta.badgeVariant} size="sm">
                        {meta.badge}
                      </Badge>
                      <span className="text-[11px] text-charcoal-400 font-medium ml-auto sm:ml-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-charcoal-600 leading-relaxed font-sans">
                      {n.message}
                    </p>

                    {/* Metadata chips if any */}
                    {n.trip && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 bg-forest-50/80 border border-forest-200/60 px-2 py-0.5 rounded-md">
                          <Compass className="w-3 h-3 text-forest-600" />
                          <span>{n.trip.title || 'Trip Workspace'}</span>
                        </span>

                        {n.link && (
                          <span className="text-[11px] font-semibold text-forest-600 group-hover:text-forest-800 flex items-center gap-1 transition-colors">
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity self-center">
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n._id, e)}
                        title="Mark as read"
                        className="p-1.5 text-charcoal-400 hover:text-forest-700 hover:bg-forest-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteNotification(n._id, e)}
                      title="Delete notification"
                      className="p-1.5 text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      {preferencesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-soft-2xl border border-ivory-300 p-6 space-y-6 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-ivory-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-forest-50 border border-forest-200 flex items-center justify-center text-forest-700">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-charcoal-900 text-base font-display">
                    Notification Preferences
                  </h3>
                  <p className="text-[11px] text-charcoal-400">
                    Control how and when TripTally alerts you.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreferencesOpen(false)}
                className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Email Notifications master toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-ivory-50 border border-ivory-200">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-bold text-charcoal-900">Email Notifications</p>
                  <p className="text-[11px] text-charcoal-500 leading-snug">
                    Send important invitations and reminders to your registered email address.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePref('emailNotifications')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.emailNotifications ? 'bg-forest-600' : 'bg-charcoal-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      preferences.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Trip Reminders toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-ivory-50 border border-ivory-200">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-bold text-charcoal-900">Upcoming Trip Reminders</p>
                  <p className="text-[11px] text-charcoal-500 leading-snug">
                    Notify me 3 days and 1 day before an upcoming journey starts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePref('tripReminders')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.tripReminders ? 'bg-forest-600' : 'bg-charcoal-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      preferences.tripReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Expense & Debt Alerts */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-ivory-50 border border-ivory-200">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-bold text-charcoal-900">Expense & Settlement Alerts</p>
                  <p className="text-[11px] text-charcoal-500 leading-snug">
                    Alert when members add shared expenses or log payment settlements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePref('expenseAlerts')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.expenseAlerts ? 'bg-forest-600' : 'bg-charcoal-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      preferences.expenseAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Itinerary Updates */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-ivory-50 border border-ivory-200">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-bold text-charcoal-900">Itinerary Activity Changes</p>
                  <p className="text-[11px] text-charcoal-500 leading-snug">
                    Alert when companions add, change, or remove daily itinerary plans.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePref('itineraryUpdates')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.itineraryUpdates ? 'bg-forest-600' : 'bg-charcoal-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      preferences.itineraryUpdates ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPreferencesOpen(false)}
                className="w-full sm:w-auto"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
