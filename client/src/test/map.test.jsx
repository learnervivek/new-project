import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TripMapView from '../components/map/TripMapView';

describe('TripMapView Component', () => {
  const mockTrip = {
    _id: 'trip123',
    title: 'Rome Escapade',
    destination: 'Rome, Italy',
    coordinates: { lat: 41.9028, lng: 12.4964 },
  };

  const mockItems = [
    {
      _id: 'act1',
      title: 'Colosseum Guided Tour',
      category: 'sightseeing',
      date: '2026-06-15T00:00:00.000Z',
      startTime: '09:00',
      location: 'Piazza del Colosseo, 1, Rome',
      estimatedCost: 35,
      coordinates: { lat: 41.8902, lng: 12.4922 },
    },
    {
      _id: 'act2',
      title: 'Trattoria da Enzo Dinner',
      category: 'restaurant',
      date: '2026-06-15T00:00:00.000Z',
      startTime: '19:30',
      location: 'Via dei Vascellari, 29, Rome',
      estimatedCost: 50,
      coordinates: { lat: 41.8885, lng: 12.4764 },
    },
    {
      _id: 'act3',
      title: 'Ungeocoded Stroll',
      category: 'activity',
      date: '2026-06-16T00:00:00.000Z',
      startTime: '11:00',
      location: '',
      estimatedCost: 0,
      coordinates: null, // missing coordinates
    },
  ];

  it('renders map controls, day filters, and view options', () => {
    const handleSwitchToList = vi.fn();

    render(
      <TripMapView
        trip={mockTrip}
        items={mockItems}
        onSwitchToList={handleSwitchToList}
      />
    );

    // Day filter pills
    expect(screen.getByText(/All Stops/i)).toBeInTheDocument();
    expect(screen.getByText(/Day 1/i)).toBeInTheDocument();

    // Route line and reset view buttons
    expect(screen.getByTitle(/Toggle sequential itinerary connection lines/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Fit map to all stops/i)).toBeInTheDocument();

    // Switch to List View
    const listBtn = screen.getByRole('button', { name: /List View/i });
    expect(listBtn).toBeInTheDocument();
    fireEvent.click(listBtn);
    expect(handleSwitchToList).toHaveBeenCalled();
  });

  it('shows missing coordinates notification when items lack coordinates', () => {
    render(
      <TripMapView
        trip={mockTrip}
        items={mockItems}
      />
    );

    expect(
      screen.getByText(/1 activity is missing verified location coordinates/i)
    ).toBeInTheDocument();
  });

  it('renders helpful empty state when trip has no coordinates and zero stops have coordinates', () => {
    const unlocatedTrip = {
      _id: 'trip999',
      title: 'Mysterious Island',
      destination: '',
      coordinates: null,
    };

    render(
      <TripMapView
        trip={unlocatedTrip}
        items={[]}
      />
    );

    expect(screen.getByText(/No Plottable Map Locations Yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Add itinerary stops with valid venue names or addresses/i)).toBeInTheDocument();
  });
});
