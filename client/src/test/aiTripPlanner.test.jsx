import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AiTripPlannerPage from '../pages/AiTripPlannerPage';
import { ToastContext } from '../context/ToastContext';
import aiService from '../services/aiService';

// Mock aiService
vi.mock('../services/aiService', () => ({
  default: {
    generateItinerary: vi.fn(),
    regenerateDay: vi.fn(),
    saveItinerary: vi.fn(),
  },
}));

const mockToast = vi.fn();

function renderWithProviders(ui) {
  return render(
    <ToastContext.Provider value={{ toast: mockToast }}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ToastContext.Provider>
  );
}

describe('Frontend Gemini AI Trip Planner Tests', () => {
  const sampleItinerary = {
    tripTitle: 'Himalayan Manali Getaway',
    destination: 'Manali, Himachal Pradesh',
    durationDays: 3,
    currency: 'INR',
    travellers: 4,
    budget: {
      total: 40000,
      transport: 10000,
      accommodation: 15000,
      food: 8000,
      activities: 5000,
      miscellaneous: 2000,
    },
    days: [
      {
        day: 1,
        title: 'Arrival and Old Manali Vibes',
        date: '2026-11-10',
        activities: [
          {
            name: 'Check into riverside hotel',
            description: 'Unpack and enjoy mountain views',
            startTime: '12:00',
            endTime: '13:30',
            location: 'Old Manali',
            category: 'accommodation',
            estimatedCost: 0,
            costType: 'group_total',
            travelNotes: 'Keep jackets handy',
          },
          {
            name: 'Hidimba Devi Temple Walk',
            description: 'Explore the wooden temple',
            startTime: '15:00',
            endTime: '17:00',
            location: 'Dhungri Forest',
            category: 'sightseeing',
            estimatedCost: 200,
            costType: 'group_total',
            travelNotes: 'Scenic cedar forest',
          },
        ],
      },
      {
        day: 2,
        title: 'Solang Valley Snow Thrills',
        date: '2026-11-11',
        activities: [
          {
            name: 'Paragliding at Solang',
            description: 'Tandem flight',
            startTime: '10:00',
            endTime: '13:00',
            location: 'Solang Valley',
            category: 'activity',
            estimatedCost: 3500,
            costType: 'group_total',
            travelNotes: 'Wear warm gear',
          },
        ],
      },
      {
        day: 3,
        title: 'Vashisht Springs & Local Cafes',
        date: '2026-11-12',
        activities: [
          {
            name: 'Hot Sulphur Baths',
            description: 'Relax in natural springs',
            startTime: '10:00',
            endTime: '12:00',
            location: 'Vashisht Village',
            category: 'sightseeing',
            estimatedCost: 100,
            costType: 'group_total',
            travelNotes: 'Traditional village',
          },
        ],
      },
    ],
    packingChecklist: [
      {
        item: 'Thermal warmers & jacket',
        category: 'clothing',
        essential: true,
      },
      {
        item: 'Hiking boots',
        category: 'essentials',
        essential: true,
      },
    ],
    travelTips: [
      'Carry cash as mountain ATMs frequently face power cuts.',
    ],
    assumptions: [
      'Estimates are seasonal indicative prices in INR.',
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the AI Trip Planner initial form correctly', () => {
    renderWithProviders(<AiTripPlannerPage />);

    expect(screen.getByText(/Personalized AI Itinerary Generator/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Manali, Himachal Pradesh/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate AI Itinerary/i })).toBeInTheDocument();
    expect(screen.getByText(/Adventure & Trekking/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget-Friendly/i)).toBeInTheDocument();
    expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
  });

  it('prevents submission when destination is empty', async () => {
    const { container } = renderWithProviders(<AiTripPlannerPage />);

    const form = container.querySelector('form');
    fireEvent.submit(form);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Destination Required',
        variant: 'danger',
      })
    );
    expect(aiService.generateItinerary).not.toHaveBeenCalled();
  });


  it('submits form and displays the generated itinerary on success', async () => {
    aiService.generateItinerary.mockResolvedValueOnce({
      success: true,
      itinerary: sampleItinerary,
    });

    renderWithProviders(<AiTripPlannerPage />);

    // Fill destination
    const destInput = screen.getByPlaceholderText(/e\.g\. Manali, Himachal Pradesh/i);
    fireEvent.change(destInput, { target: { value: 'Manali, Himachal Pradesh' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Generate AI Itinerary/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(aiService.generateItinerary).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: 'Manali, Himachal Pradesh',
          budgetType: 'group',
          travellers: 4,
        })
      );
    });

    // Check rendered results
    await waitFor(() => {
      expect(screen.getByText('Himalayan Manali Getaway')).toBeInTheDocument();
      expect(screen.getByText(/Check into riverside hotel/i)).toBeInTheDocument();
      expect(screen.getByText(/Hidimba Devi Temple Walk/i)).toBeInTheDocument();
      expect(screen.getByText(/Day 1 •/i)).toBeInTheDocument();
      expect(screen.getByText(/Day 2 •/i)).toBeInTheDocument();
      expect(screen.getByText(/Day 3 •/i)).toBeInTheDocument();
    });
  });

  it('handles and displays rate-limit or quota error gracefully without losing inputs', async () => {
    aiService.generateItinerary.mockRejectedValueOnce(
      new Error('Gemini API quota or rate limit reached. Please wait a moment.')
    );

    renderWithProviders(<AiTripPlannerPage />);

    const destInput = screen.getByPlaceholderText(/e\.g\. Manali, Himachal Pradesh/i);
    fireEvent.change(destInput, { target: { value: 'Goa Beaches' } });

    const submitBtn = screen.getByRole('button', { name: /Generate AI Itinerary/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Gemini API Limit/i)).toBeInTheDocument();
      expect(screen.getByText(/Gemini API quota or rate limit reached/i)).toBeInTheDocument();
    });

    // Form inputs should be preserved
    expect(destInput.value).toBe('Goa Beaches');
  });

  it('interactively toggles packing checklist items', async () => {
    aiService.generateItinerary.mockResolvedValueOnce({
      success: true,
      itinerary: sampleItinerary,
    });

    renderWithProviders(<AiTripPlannerPage />);

    const destInput = screen.getByPlaceholderText(/e\.g\. Manali, Himachal Pradesh/i);
    fireEvent.change(destInput, { target: { value: 'Manali' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate AI Itinerary/i }));

    await waitFor(() => {
      expect(screen.getByText('Himalayan Manali Getaway')).toBeInTheDocument();
    });

    // Switch to packing checklist tab
    const packingTab = screen.getByRole('button', { name: /Packing Checklist/i });
    fireEvent.click(packingTab);

    expect(screen.getByText(/Thermal warmers & jacket/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 2 Packed')).toBeInTheDocument();

    // Toggle one item
    fireEvent.click(screen.getByText(/Thermal warmers & jacket/i));

    await waitFor(() => {
      expect(screen.getByText('1 / 2 Packed')).toBeInTheDocument();
    });
  });

  it('saves itinerary to My Trips successfully', async () => {
    aiService.generateItinerary.mockResolvedValueOnce({
      success: true,
      itinerary: sampleItinerary,
    });
    aiService.saveItinerary.mockResolvedValueOnce({
      success: true,
      tripId: 'trip123abc',
      trip: { title: 'Himalayan Manali Getaway' },
    });

    renderWithProviders(<AiTripPlannerPage />);

    const destInput = screen.getByPlaceholderText(/e\.g\. Manali, Himachal Pradesh/i);
    fireEvent.change(destInput, { target: { value: 'Manali' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate AI Itinerary/i }));

    await waitFor(() => {
      expect(screen.getByText('Himalayan Manali Getaway')).toBeInTheDocument();
    });

    const saveBtn = screen.getAllByRole('button', { name: /Save to My Trips/i })[0];
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(aiService.saveItinerary).toHaveBeenCalledWith(sampleItinerary);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Trip Saved to TripTally/i),
          variant: 'success',
        })
      );
    });
  });
});
