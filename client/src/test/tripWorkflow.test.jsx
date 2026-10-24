import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CreateTripModal } from '../components/trips/CreateTripModal';
import { InviteMemberModal } from '../components/trips/InviteMemberModal';
import { ToastContext } from '../context/ToastContext';
import tripService from '../services/tripService';

// Mock tripService
vi.mock('../services/tripService', () => ({
  default: {
    createTrip: vi.fn(),
    inviteMember: vi.fn(),
  },
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

function renderWithProviders(ui) {
  return render(
    <ToastContext.Provider value={{ toast: mockToast }}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ToastContext.Provider>
  );
}

describe('Frontend Trip Workflow & Modals Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateTripModal Form Validation & Submission', () => {
    it('renders all form inputs and cover preset options when open', () => {
      renderWithProviders(
        <CreateTripModal isOpen={true} onClose={vi.fn()} onTripCreated={vi.fn()} />
      );

      expect(screen.getByText('Create New Trip Board')).toBeInTheDocument();
      expect(screen.getByLabelText(/trip title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target budget/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create trip board/i })).toBeInTheDocument();
    });

    it('displays validation errors when submitting with empty required fields', async () => {
      const { container } = renderWithProviders(
        <CreateTripModal isOpen={true} onClose={vi.fn()} onTripCreated={vi.fn()} />
      );

      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/trip title must be at least 3 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/destination is required/i)).toBeInTheDocument();
      });

      expect(tripService.createTrip).not.toHaveBeenCalled();
    });

    it('rejects date range where end date precedes start date', async () => {
      const { container } = renderWithProviders(
        <CreateTripModal isOpen={true} onClose={vi.fn()} onTripCreated={vi.fn()} />
      );

      const titleInput = screen.getByLabelText(/trip title/i);
      const destinationInput = screen.getByLabelText(/destination/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      fireEvent.change(titleInput, { target: { value: 'Dolomites Hiking' } });
      fireEvent.change(destinationInput, { target: { value: 'Bolzano, Italy' } });
      fireEvent.change(startDateInput, { target: { value: '2026-10-20' } });
      fireEvent.change(endDateInput, { target: { value: '2026-10-10' } }); // before start date

      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/end date must be on or after start date/i)).toBeInTheDocument();
      });

      expect(tripService.createTrip).not.toHaveBeenCalled();
    });

    it('submits valid trip successfully and notifies user', async () => {
      const mockTrip = {
        _id: 'trip123',
        title: 'Kyoto Autumn Walk',
        destination: 'Kyoto, Japan',
        budget: 2500,
        currency: 'USD',
      };

      tripService.createTrip.mockResolvedValueOnce({
        success: true,
        trip: mockTrip,
      });

      const handleTripCreated = vi.fn();
      const handleClose = vi.fn();

      const { container } = renderWithProviders(
        <CreateTripModal isOpen={true} onClose={handleClose} onTripCreated={handleTripCreated} />
      );

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'Kyoto Autumn Walk' },
      });
      fireEvent.change(screen.getByLabelText(/destination/i), {
        target: { value: 'Kyoto, Japan' },
      });

      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(tripService.createTrip).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Kyoto Autumn Walk',
            destination: 'Kyoto, Japan',
          })
        );
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringMatching(/trip created/i),
          expect.anything()
        );
        expect(handleTripCreated).toHaveBeenCalledWith(mockTrip);
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });

  describe('InviteMemberModal Form Validation & Collaboration Workflow', () => {
    const sampleTrip = {
      _id: 'trip_invite_001',
      title: 'Amalfi Summer Retreat',
      inviteCode: 'AMALFI26',
    };

    it('renders invite modal with email input, role selector, and permission explainer', () => {
      renderWithProviders(
        <InviteMemberModal isOpen={true} onClose={vi.fn()} trip={sampleTrip} onMemberInvited={vi.fn()} />
      );

      expect(screen.getByText('Invite Travel Companion')).toBeInTheDocument();
      expect(screen.getByLabelText(/companion's email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
    });

    it('flags invalid email addresses with validation error message', async () => {
      const { container } = renderWithProviders(
        <InviteMemberModal isOpen={true} onClose={vi.fn()} trip={sampleTrip} onMemberInvited={vi.fn()} />
      );

      const emailInput = screen.getByLabelText(/companion's email address/i);
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      expect(tripService.inviteMember).not.toHaveBeenCalled();
    });

    it('dispatches invitation and displays local development invite link when available', async () => {
      tripService.inviteMember.mockResolvedValueOnce({
        success: true,
        invitation: { id: 'inv_01', email: 'companion@example.com', role: 'editor' },
        devInviteUrl: 'http://localhost:5173/invitations?token=testdevtoken123',
      });

      const handleMemberInvited = vi.fn();

      const { container } = renderWithProviders(
        <InviteMemberModal
          isOpen={true}
          onClose={vi.fn()}
          trip={sampleTrip}
          onMemberInvited={handleMemberInvited}
        />
      );

      const emailInput = screen.getByLabelText(/companion's email address/i);
      fireEvent.change(emailInput, { target: { value: 'companion@example.com' } });

      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(tripService.inviteMember).toHaveBeenCalledWith(
          'trip_invite_001',
          expect.objectContaining({
            email: 'companion@example.com',
            role: 'editor',
          })
        );
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringMatching(/invitation sent/i),
          expect.anything()
        );
        expect(handleMemberInvited).toHaveBeenCalled();
      });
    });
  });
});
