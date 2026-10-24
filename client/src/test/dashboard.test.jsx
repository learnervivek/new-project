import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import tripService from '../services/tripService';

// Mock tripService
vi.mock('../services/tripService', () => ({
  default: {
    getDashboardData: vi.fn(),
    getTrips: vi.fn(),
    getTripById: vi.fn(),
    createTrip: vi.fn(),
    joinTrip: vi.fn(),
    getMyInvitations: vi.fn().mockResolvedValue({ success: true, count: 2, invitations: [] }),
  },
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

const mockUser = {
  id: 'user-123',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatar: '',
};

function renderDashboard(ui) {
  const authValue = {
    user: mockUser,
    loading: false,
    isAuthenticated: true,
    logout: vi.fn(),
  };

  return render(
    <ToastContext.Provider value={{ toast: mockToast }}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </ToastContext.Provider>
  );
}

describe('Dashboard Component & Analytics UI Tests', () => {
  it('renders DashboardLayout with sidebar navigation links', () => {
    renderDashboard(<DashboardLayout><div>Dashboard Body</div></DashboardLayout>);
    
    expect(screen.getAllByText(/dashboard/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/my trips/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/invitations/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/notifications/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/profile/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dashboard Body')).toBeInTheDocument();
  });

  it('renders DashboardPage with real summary metrics and upcoming trips', async () => {
    tripService.getDashboardData.mockResolvedValueOnce({
      success: true,
      data: {
        summary: {
          totalTrips: 2,
          upcomingCount: 2,
          ongoingCount: 0,
          totalBudget: 4500,
          totalSpent: 1200,
          expenseCount: 4,
          pendingSettlementsCount: 2,
        },
        upcomingTrips: [
          {
            _id: 'trip-1',
            title: 'Amalfi Coast Villa & Sailing',
            destination: 'Positano, Italy',
            budget: 3500,
            currency: 'USD',
            status: 'planning',
            startDate: '2026-08-01',
            endDate: '2026-08-08',
            members: [{ user: { name: 'Alex Rivera' } }],
          },
        ],
        recentExpenses: [
          {
            _id: 'exp-1',
            title: 'Villa Deposit',
            amount: 1200,
            currency: 'USD',
            paidBy: { name: 'Alex Rivera' },
            trip: { title: 'Amalfi Coast Villa & Sailing' },
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });

    renderDashboard(<DashboardPage />);

    // Check welcome header
    expect(screen.getByText(/welcome back, alex/i)).toBeInTheDocument();

    await waitFor(() => {
      // Check summary card metrics
      expect(screen.getByText(/₹\s*4,500/)).toBeInTheDocument();
      expect(screen.getByText('Amalfi Coast Villa & Sailing')).toBeInTheDocument();
      expect(screen.getByText('Villa Deposit')).toBeInTheDocument();
    });
  });

  it('renders EmptyState when user has zero trips', async () => {
    tripService.getDashboardData.mockResolvedValueOnce({
      success: true,
      data: {
        summary: {
          totalTrips: 0,
          upcomingCount: 0,
          ongoingCount: 0,
          totalBudget: 0,
          totalSpent: 0,
          expenseCount: 0,
          pendingSettlementsCount: 0,
        },
        upcomingTrips: [],
        recentExpenses: [],
      },
    });

    renderDashboard(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no collaborative trips yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create your first trip/i })).toBeInTheDocument();
    });
  });
});
