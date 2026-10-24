import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from '../pages/NotificationsPage';
import { ToastProvider } from '../context/ToastContext';
import tripService from '../services/tripService';

// Mock tripService
vi.mock('../services/tripService', () => ({
  default: {
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    deleteNotification: vi.fn(),
    clearReadNotifications: vi.fn(),
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    triggerScheduledReminders: vi.fn(),
  },
}));

describe('NotificationsPage Component UI Tests', () => {
  const mockNotifications = [
    {
      _id: 'notif-1',
      type: 'trip_invitation',
      title: 'Trip Invitation: Amalfi Coast',
      message: 'Marco invited you to join Amalfi Coast.',
      isRead: false,
      createdAt: new Date().toISOString(),
      link: '/invitations',
      trip: { _id: 'trip-1', title: 'Amalfi Coast' },
    },
    {
      _id: 'notif-2',
      type: 'expense_created',
      title: 'New Expense Logged',
      message: 'Sofia added Villa Deposit ($1,200.00).',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      link: '/trips/trip-1',
      trip: { _id: 'trip-1', title: 'Amalfi Coast' },
    },
    {
      _id: 'notif-3',
      type: 'upcoming_trip_reminder',
      title: 'Upcoming Trip Reminder',
      message: 'Amalfi Coast is starting in 2 days!',
      isRead: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      link: '/trips/trip-1',
      trip: { _id: 'trip-1', title: 'Amalfi Coast' },
    },
  ];

  const mockPreferences = {
    emailNotifications: true,
    tripReminders: true,
    expenseAlerts: true,
    itineraryUpdates: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tripService.getNotifications.mockResolvedValue({
      success: true,
      notifications: mockNotifications,
      unreadCount: 2,
    });
    tripService.getNotificationPreferences.mockResolvedValue({
      success: true,
      preferences: mockPreferences,
    });
    tripService.markNotificationRead.mockResolvedValue({
      success: true,
      notification: { ...mockNotifications[0], isRead: true },
    });
    tripService.markAllNotificationsRead.mockResolvedValue({
      success: true,
      count: 2,
    });
    tripService.deleteNotification.mockResolvedValue({
      success: true,
    });
    tripService.clearReadNotifications.mockResolvedValue({
      success: true,
      deletedCount: 1,
    });
    tripService.updateNotificationPreferences.mockResolvedValue({
      success: true,
      preferences: { ...mockPreferences, itineraryUpdates: true },
    });
    tripService.triggerScheduledReminders.mockResolvedValue({
      success: true,
      result: { upcomingTripsReminded: 1, unsettledExpensesReminded: 0 },
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ToastProvider>
          <NotificationsPage />
        </ToastProvider>
      </MemoryRouter>
    );

  it('renders notifications list with unread count and badges', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Activity & Notifications')).toBeInTheDocument();
      expect(screen.getByText('2 New')).toBeInTheDocument();
    });

    expect(screen.getByText('Trip Invitation: Amalfi Coast')).toBeInTheDocument();
    expect(screen.getByText('New Expense Logged')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Trip Reminder')).toBeInTheDocument();
  });

  it('filters notifications when clicking tabs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Activity & Notifications')).toBeInTheDocument();
    });

    const unreadTab = screen.getByRole('button', { name: /Unread/i });
    fireEvent.click(unreadTab);

    expect(tripService.getNotifications).toHaveBeenCalledWith({ isRead: 'false' });
  });

  it('marks a single notification as read', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Trip Invitation: Amalfi Coast')).toBeInTheDocument();
    });

    const markReadButtons = screen.getAllByTitle('Mark as read');
    expect(markReadButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(markReadButtons[0]);

    await waitFor(() => {
      expect(tripService.markNotificationRead).toHaveBeenCalledWith('notif-1');
    });
  });

  it('marks all notifications read in bulk', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mark All Read')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark All Read'));

    await waitFor(() => {
      expect(tripService.markAllNotificationsRead).toHaveBeenCalled();
    });
  });

  it('opens and updates notification preferences modal', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByText('Preferences'));

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Trip Reminders')).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => {
      expect(screen.queryByText('Notification Preferences')).not.toBeInTheDocument();
    });
  });

  it('deletes a notification', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Trip Invitation: Amalfi Coast')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete notification');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(tripService.deleteNotification).toHaveBeenCalledWith('notif-1');
    });
  });

  it('triggers manual reminders evaluation scan', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Run Reminders Check')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Run Reminders Check'));

    await waitFor(() => {
      expect(tripService.triggerScheduledReminders).toHaveBeenCalled();
    });
  });
});
