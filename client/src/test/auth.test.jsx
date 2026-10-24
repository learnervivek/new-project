import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

// Helper mock wrapper
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

function renderWithAuth(ui, { user = null, loading = false } = {}) {
  const authValue = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login: vi.fn().mockResolvedValue({ success: true }),
    register: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    checkSession: vi.fn(),
  };

  return render(
    <ToastContext.Provider value={{ toast: mockToast }}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </ToastContext.Provider>
  );
}

describe('Frontend Authentication UI & Flow Tests', () => {
  it('renders LoginPage with email, password fields and sign-in button', () => {
    renderWithAuth(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guest demo/i })).toBeInTheDocument();
  });

  it('renders RegisterPage and flags mismatched password confirmation', async () => {
    renderWithAuth(<RegisterPage />);
    
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInputs = screen.getAllByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /create free account/i });

    fireEvent.change(nameInput, { target: { value: 'Test Traveler' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'Password123!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'Mismatch999!' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('ProtectedRoute displays loading spinner while verifying session', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Secret Itinerary Details</div>
      </ProtectedRoute>,
      { user: null, loading: true }
    );

    expect(screen.queryByText('Secret Itinerary Details')).not.toBeInTheDocument();
  });

  it('ProtectedRoute renders child content when user is authenticated', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Secret Itinerary Details</div>
      </ProtectedRoute>,
      { user: { id: '123', name: 'Alex Rivera' }, loading: false }
    );

    expect(screen.getByText('Secret Itinerary Details')).toBeInTheDocument();
  });
});
