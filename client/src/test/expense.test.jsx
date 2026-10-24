import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExpenseManager from '../components/expenses/ExpenseManager';
import { ToastProvider } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import tripService from '../services/tripService';

// Mock tripService
vi.mock('../services/tripService', () => ({
  default: {
    getExpenses: vi.fn(),
    getSettlements: vi.fn(),
    getExpenseBalances: vi.fn(),
    createExpense: vi.fn(),
    deleteExpense: vi.fn(),
    createSettlement: vi.fn(),
    deleteSettlement: vi.fn(),
    getTripPayments: vi.fn().mockResolvedValue({ success: true, payments: [] }),
  },
}));

describe('ExpenseManager Component UI Tests', () => {
  const mockUser = {
    _id: 'user1',
    name: 'Elena Rostova',
    email: 'elena@example.com',
  };

  const mockTrip = {
    _id: 'trip123',
    title: 'Amalfi Coast Dream',
    currency: 'USD',
    budget: 3000,
    owner: mockUser,
  };

  const mockMembers = [
    { user: mockUser, role: 'organizer' },
    { user: { _id: 'user2', name: 'Luca Romano', email: 'luca@example.com' }, role: 'editor' },
  ];

  const mockExpenses = [
    {
      _id: 'exp1',
      title: 'Cliffside Villa Deposit',
      amount: 150000, // $1500.00
      currency: 'USD',
      category: 'lodging',
      paidBy: mockUser,
      splitType: 'equal',
      splits: [
        { user: mockUser, amount: 75000 },
        { user: { _id: 'user2', name: 'Luca Romano' }, amount: 75000 },
      ],
      date: '2026-07-01T00:00:00.000Z',
      notes: 'Paid via credit card',
      createdBy: mockUser,
    },
    {
      _id: 'exp2',
      title: 'Seafood Dinner in Positano',
      amount: 20000, // $200.00
      currency: 'USD',
      category: 'dining',
      paidBy: { _id: 'user2', name: 'Luca Romano' },
      splitType: 'equal',
      splits: [
        { user: mockUser, amount: 10000 },
        { user: { _id: 'user2', name: 'Luca Romano' }, amount: 10000 },
      ],
      date: '2026-07-02T00:00:00.000Z',
      createdBy: { _id: 'user2' },
    },
  ];

  const mockBalances = {
    totalSpent: 170000,
    totalSettled: 0,
    memberLedgers: [
      {
        user: mockUser,
        totalPaid: 150000,
        totalShare: 85000,
        settlementsPaid: 0,
        settlementsReceived: 0,
        netBalance: 65000, // +$650.00
        status: 'receives',
      },
      {
        user: { _id: 'user2', name: 'Luca Romano' },
        totalPaid: 20000,
        totalShare: 85000,
        settlementsPaid: 0,
        settlementsReceived: 0,
        netBalance: -65000, // -$650.00
        status: 'owes',
      },
    ],
    suggestedSettlements: [
      {
        from: { _id: 'user2', name: 'Luca Romano' },
        to: mockUser,
        amount: 65000,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tripService.getExpenses.mockResolvedValue({ success: true, expenses: mockExpenses });
    tripService.getSettlements.mockResolvedValue({ success: true, settlements: [] });
    tripService.getExpenseBalances.mockResolvedValue({
      success: true,
      currency: 'USD',
      balances: mockBalances,
    });
  });

  const renderComponent = (canEdit = true) => {
    return render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
          <ToastProvider>
            <ExpenseManager trip={mockTrip} members={mockMembers} canEdit={canEdit} />
          </ToastProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  it('renders spending summary and authoritative net balances', async () => {
    renderComponent();

    // Check header
    expect(screen.getByText(/Trip Expenses & Settlements/i)).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText(/₹\s*1,700/)).toBeInTheDocument(); // total spent
    });

    // Check user net balance
    expect(screen.getAllByText(/\+₹\s*650/)[0]).toBeInTheDocument();
    expect(screen.getByText(/Companions owe you money/i)).toBeInTheDocument();

    // Check suggested settlement
    expect(screen.getAllByText('Luca Romano')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/₹\s*650/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays expense items with category badges and payer info', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Cliffside Villa Deposit')).toBeInTheDocument();
      expect(screen.getByText('Seafood Dinner in Positano')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Lodging/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dining/i).length).toBeGreaterThan(0);
  });

  it('allows switching to Settlement History tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Settlement History/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Settlement History/i));

    // Empty state should be visible since settlements array is empty
    expect(screen.getByText(/No Settlements Recorded/i)).toBeInTheDocument();
  });

  it('renders action buttons (Log Expense, Settle Up) for users with edit permissions', async () => {
    renderComponent(true);

    expect(screen.getByRole('button', { name: /Log Expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Settle Up/i })).toBeInTheDocument();
  });
});
