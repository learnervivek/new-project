import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettlementModal from '../components/expenses/SettlementModal';
import ExpenseManager from '../components/expenses/ExpenseManager';
import { ToastProvider } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import tripService from '../services/tripService';
import * as razorpayUtil from '../utils/razorpay';

// Mock tripService
vi.mock('../services/tripService', () => ({
  default: {
    getPaymentConfig: vi.fn(),
    createPaymentOrder: vi.fn(),
    verifyPayment: vi.fn(),
    getTripPayments: vi.fn(),
    getExpenses: vi.fn(),
    getSettlements: vi.fn(),
    getExpenseBalances: vi.fn(),
    createSettlement: vi.fn(),
    deleteSettlement: vi.fn(),
  },
}));

// Mock razorpay utility
vi.mock('../utils/razorpay', () => ({
  openRazorpayModal: vi.fn(),
  loadRazorpayScript: vi.fn().mockResolvedValue(true),
}));

describe('Razorpay Online Payments & Settlement UI Integration Tests', () => {
  const mockUser = {
    _id: 'user-payer-1',
    id: 'user-payer-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  };

  const mockPayee = {
    _id: 'user-payee-2',
    id: 'user-payee-2',
    name: 'Charles Babbage',
    email: 'charles@example.com',
  };

  const mockTrip = {
    _id: 'trip-rzp-101',
    title: 'London Calculus Tour',
    currency: 'USD',
    owner: mockPayee,
    members: [{ user: mockUser, role: 'editor', status: 'accepted' }],
  };

  const mockMembers = [
    { user: mockUser, role: 'editor', status: 'accepted' },
    { user: mockPayee, role: 'owner', status: 'accepted' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    tripService.getPaymentConfig.mockResolvedValue({
      success: true,
      enabled: true,
      testMode: true,
      keyId: 'rzp_test_MockKey123',
      merchantArrangement: 'TripTally Merchant Settlement Collection',
    });

    tripService.getExpenses.mockResolvedValue({
      success: true,
      expenses: [],
    });

    tripService.getSettlements.mockResolvedValue({
      success: true,
      settlements: [
        {
          _id: 'settlement-1',
          payer: mockUser,
          payee: mockPayee,
          amount: 5000,
          currency: 'USD',
          status: 'pending',
          paymentMethod: 'razorpay',
          date: new Date().toISOString(),
          notes: 'Train ticket share',
        },
      ],
    });

    tripService.getExpenseBalances.mockResolvedValue({
      success: true,
      balances: {
        totalSpent: 10000,
        totalSettled: 0,
        suggestedSettlements: [
          {
            from: mockUser,
            to: mockPayee,
            amount: 5000,
          },
        ],
        memberLedgers: [
          { user: mockUser, netBalance: -5000 },
          { user: mockPayee, netBalance: 5000 },
        ],
      },
    });

    tripService.getTripPayments.mockResolvedValue({
      success: true,
      payments: [
        {
          _id: 'pay-ord-1',
          razorpayOrderId: 'order_test_London_123',
          razorpayPaymentId: 'pay_test_Captured_456',
          status: 'paid',
          amount: 5000,
          currency: 'USD',
          payer: mockUser,
          payee: mockPayee,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    tripService.createPaymentOrder.mockResolvedValue({
      success: true,
      order: {
        id: 'order_test_London_123',
        amount: 5000,
        currency: 'USD',
        keyId: 'rzp_test_MockKey123',
      },
      paymentOrderId: 'pay-ord-1',
      settlementId: 'settlement-1',
    });

    tripService.verifyPayment.mockResolvedValue({
      success: true,
      settlement: {
        _id: 'settlement-1',
        status: 'completed',
        amount: 5000,
      },
    });
  });

  const renderWithAuth = (component) => {
    return render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
          <ToastProvider>{component}</ToastProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  it('displays disabled warning state in SettlementModal when payment credentials are not configured', async () => {
    tripService.getPaymentConfig.mockResolvedValueOnce({
      success: true,
      enabled: false,
      testMode: true,
      keyId: '',
    });

    renderWithAuth(
      <SettlementModal
        isOpen={true}
        onClose={vi.fn()}
        trip={mockTrip}
        members={mockMembers}
        prefill={{ forceRazorpay: true }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Razorpay credentials not configured/i)).toBeInTheDocument();
    });

    // The payment button is disabled
    const payBtn = screen.getByRole('button', { name: /Pay with Razorpay/i });
    expect(payBtn).toBeDisabled();
  });

  it('initiates Razorpay test checkout and verifies payment signature on modal submission', async () => {
    let capturedOnSuccess = null;
    razorpayUtil.openRazorpayModal.mockImplementationOnce(async ({ onSuccess }) => {
      capturedOnSuccess = onSuccess;
    });

    const onSavedMock = vi.fn();
    const onCloseMock = vi.fn();

    renderWithAuth(
      <SettlementModal
        isOpen={true}
        onClose={onCloseMock}
        trip={mockTrip}
        members={mockMembers}
        prefill={{ fromUser: mockUser, toUser: mockPayee, amountMinor: 5000, forceRazorpay: true }}
        onSaved={onSavedMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Razorpay Test-Mode Checkout')).toBeInTheDocument();
      expect(screen.getByText('Test Mode')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Pay with Razorpay \(₹50\.00\)/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(tripService.createPaymentOrder).toHaveBeenCalledWith(mockTrip._id, {
        payeeId: mockPayee._id,
        amount: 5000,
        notes: '',
      });
      expect(razorpayUtil.openRazorpayModal).toHaveBeenCalled();
    });

    // Simulate successful checkout callback from Razorpay
    expect(capturedOnSuccess).toBeDefined();
    await capturedOnSuccess({
      razorpay_order_id: 'order_test_London_123',
      razorpay_payment_id: 'pay_test_Captured_456',
      razorpay_signature: 'test_signature_valid_hex',
    });

    await waitFor(() => {
      expect(tripService.verifyPayment).toHaveBeenCalledWith(mockTrip._id, {
        orderId: 'order_test_London_123',
        paymentId: 'pay_test_Captured_456',
        signature: 'test_signature_valid_hex',
        paymentOrderId: 'pay-ord-1',
      });
      expect(onSavedMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('renders Pay Online option on suggested settlements and displays payment transactions history in ExpenseManager', async () => {
    renderWithAuth(
      <ExpenseManager trip={mockTrip} members={mockMembers} canEdit={true} />
    );

    // Verify Suggested Settlement has "Pay Online" and "Settle" buttons
    await waitFor(() => {
      expect(screen.getByText('Suggested Settlements')).toBeInTheDocument();
      expect(screen.getByText('Pay Online')).toBeInTheDocument();
      expect(screen.getByText('Settle')).toBeInTheDocument();
    });

    // Switch to settlements tab
    await waitFor(() => {
      expect(screen.getByTestId('settlements-tab')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('settlements-tab'));

    // Verify pending settlement badge and "Pay Now" action
    await waitFor(() => {
      expect(screen.getByText('Pending Payment')).toBeInTheDocument();
      expect(screen.getByText('Pay Now')).toBeInTheDocument();
    });

    // Switch to Online Payments view
    const onlinePaymentsViewBtn = screen.getByRole('button', { name: /Online Payments/i });
    fireEvent.click(onlinePaymentsViewBtn);

    await waitFor(() => {
      expect(screen.getByText(/order_test_London_123/i)).toBeInTheDocument();
      expect(screen.getByText('PAID')).toBeInTheDocument();
    });
  });
});
