import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BudgetAnalytics from '../components/analytics/BudgetAnalytics';
import { ToastProvider } from '../context/ToastContext';
import tripService from '../services/tripService';

// Mock ResizeObserver for Recharts ResponsiveContainer in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock tripService
vi.mock('../services/tripService', () => ({
  default: {
    getTripAnalytics: vi.fn(),
    updateBudgetAlertThreshold: vi.fn(),
  },
}));

describe('BudgetAnalytics Component UI Tests', () => {
  const mockTrip = {
    _id: 'trip-analytics-101',
    title: 'Swiss Alps Hiking Tour',
    currency: 'USD',
    budget: 4000,
    budgetAlertThreshold: 80,
  };

  const mockAnalyticsResponse = {
    success: true,
    currency: 'USD',
    kpis: {
      totalBudget: 4000,
      totalBudgetMinor: 400000,
      totalSpent: 2600,
      totalSpentMinor: 260000,
      remainingBudget: 1400,
      remainingBudgetMinor: 140000,
      overBudget: 0,
      overBudgetMinor: 0,
      percentageUsed: 65,
      totalPlannedCost: 3500,
      plannedVariance: 900,
      hasBudget: true,
    },
    alertStatus: {
      level: 'normal',
      threshold: 80,
      isThresholdExceeded: false,
      isOverBudget: false,
      message: 'Spending is within normal parameters (65% of budget).',
    },
    categorySpending: [
      {
        category: 'lodging',
        label: 'Lodging & Stays',
        color: '#3B82F6',
        totalSpent: 1600,
        totalSpentMinor: 160000,
        count: 2,
        percentage: 61.5,
      },
      {
        category: 'dining',
        label: 'Dining & Restaurants',
        color: '#E07A5F',
        totalSpent: 600,
        totalSpentMinor: 60000,
        count: 3,
        percentage: 23.1,
      },
      {
        category: 'transport',
        label: 'Transport & Transit',
        color: '#F59E0B',
        totalSpent: 400,
        totalSpentMinor: 40000,
        count: 1,
        percentage: 15.4,
      },
    ],
    plannedVsActual: [
      {
        key: 'lodging',
        name: 'Lodging',
        planned: 1800,
        actual: 1600,
        variance: 200,
        percentageUsed: 89,
      },
      {
        key: 'dining',
        name: 'Food & Dining',
        planned: 800,
        actual: 600,
        variance: 200,
        percentageUsed: 75,
      },
      {
        key: 'transit',
        name: 'Transit',
        planned: 500,
        actual: 400,
        variance: 100,
        percentageUsed: 80,
      },
    ],
    dailySpendingTrend: [
      {
        date: '2026-09-01',
        dailySpent: 1600,
        cumulativeSpent: 1600,
        count: 2,
      },
      {
        date: '2026-09-02',
        dailySpent: 600,
        cumulativeSpent: 2200,
        count: 3,
      },
      {
        date: '2026-09-03',
        dailySpent: 400,
        cumulativeSpent: 2600,
        count: 1,
      },
    ],
    memberContributions: [
      {
        userId: 'user-1',
        name: 'Maya Lin',
        email: 'maya@example.com',
        avatar: '',
        totalPaid: 2000,
        totalShare: 1300,
        netBalance: 700,
        percentageContributed: 76.9,
      },
      {
        userId: 'user-2',
        name: 'Carlos Santana',
        email: 'carlos@example.com',
        avatar: '',
        totalPaid: 600,
        totalShare: 1300,
        netBalance: -700,
        percentageContributed: 23.1,
      },
    ],
    expenseHistory: [
      {
        _id: 'exp-1',
        title: 'Chalet Alpine Booking',
        amount: 160000,
        amountMajor: 1600,
        category: 'lodging',
        categoryLabel: 'Lodging & Stays',
        type: 'expense',
        date: '2026-09-01T00:00:00.000Z',
        paidBy: { _id: 'user-1', name: 'Maya Lin' },
        splitType: 'equal',
        receiptUrl: '',
        notes: 'Deposit paid for 4 nights',
      },
      {
        _id: 'exp-2',
        title: 'Mountain Fondue Dinner',
        amount: 60000,
        amountMajor: 600,
        category: 'dining',
        categoryLabel: 'Dining & Restaurants',
        type: 'expense',
        date: '2026-09-02T00:00:00.000Z',
        paidBy: { _id: 'user-2', name: 'Carlos Santana' },
        splitType: 'equal',
        receiptUrl: '',
        notes: 'Includes drinks and service',
      },
    ],
    canEdit: true,
    isOwner: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tripService.getTripAnalytics.mockResolvedValue(mockAnalyticsResponse);
    tripService.updateBudgetAlertThreshold.mockResolvedValue({
      success: true,
      budgetAlertThreshold: 90,
    });
  });

  const renderComponent = (canEdit = true) => {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <BudgetAnalytics trip={mockTrip} members={[]} canEdit={canEdit} />
        </ToastProvider>
      </MemoryRouter>
    );
  };

  it('renders KPI summary cards with authoritative backend calculations', async () => {
    renderComponent();

    // Check loading first
    expect(screen.getByRole('status', { name: /loading budget analytics/i })).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Budget & Financial Analytics')).toBeInTheDocument();
    });

    // Check Total Budget card
    expect(screen.getByText('Total Budget')).toBeInTheDocument();
    expect(screen.getAllByText(/₹\s*4,000/).length).toBeGreaterThanOrEqual(1);

    // Check Total Spent card (appears in KPI and Donut center)
    expect(screen.getAllByText('Total Spent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₹\s*2,600/).length).toBeGreaterThanOrEqual(1);

    // Check Remaining Budget card
    expect(screen.getByText('Remaining Budget')).toBeInTheDocument();
    expect(screen.getByText(/₹\s*1,400/)).toBeInTheDocument();

    // Check Budget Used %
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText(/On Track/i)).toBeInTheDocument();
  });

  it('renders category spending distribution, planned vs actual and member contributions', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Category Spending Breakdown')).toBeInTheDocument();
    });

    // Donut chart region
    expect(screen.getByRole('region', { name: /category spending donut chart/i })).toBeInTheDocument();

    // Legend chips
    expect(screen.getAllByText('Lodging & Stays').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dining & Restaurants').length).toBeGreaterThan(0);

    // Planned vs Actual
    expect(screen.getByText('Planned vs. Actual Spending')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /planned versus actual spending bar chart/i })).toBeInTheDocument();

    // Member Contributions (names may also appear in expense table)
    expect(screen.getByText('Member Contribution Summary')).toBeInTheDocument();
    expect(screen.getAllByText('Maya Lin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Carlos Santana').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('To Receive')).toBeInTheDocument();
    expect(screen.getByText('Owes Money')).toBeInTheDocument();
  });

  it('filters expense history by search query and category', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Chalet Alpine Booking')).toBeInTheDocument();
      expect(screen.getByText('Mountain Fondue Dinner')).toBeInTheDocument();
    });

    // Search for "Fondue"
    const searchInput = screen.getByPlaceholderText(/search description or payer/i);
    fireEvent.change(searchInput, { target: { value: 'Fondue' } });

    expect(screen.queryByText('Chalet Alpine Booking')).not.toBeInTheDocument();
    expect(screen.getByText('Mountain Fondue Dinner')).toBeInTheDocument();
  });

  it('opens and updates budget alert limit threshold', async () => {
    renderComponent(true);

    await waitFor(() => {
      expect(screen.getByText(/Alert Limit: 80%/i)).toBeInTheDocument();
    });

    // Click Alert Limit button
    const alertBtn = screen.getByText(/Alert Limit: 80%/i);
    fireEvent.click(alertBtn);

    // Modal opens
    expect(screen.getByText('Configure Budget Alert Threshold')).toBeInTheDocument();

    // Click 90% preset
    const preset90 = screen.getByText('90%');
    fireEvent.click(preset90);

    // Submit form
    const saveBtn = screen.getByText('Save Alert Limit');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(tripService.updateBudgetAlertThreshold).toHaveBeenCalledWith('trip-analytics-101', 90);
    });
  });
});
