import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PackingChecklist from '../components/packing/PackingChecklist';
import TripActivityFeed from '../components/activity/TripActivityFeed';
import { ToastProvider } from '../context/ToastContext';
import tripService from '../services/tripService';

// Mock tripService
vi.mock('../services/tripService', () => ({
  default: {
    getPackingItems: vi.fn(),
    createPackingItem: vi.fn(),
    togglePackingItem: vi.fn(),
    updatePackingItem: vi.fn(),
    deletePackingItem: vi.fn(),
    getTripActivities: vi.fn(),
  },
}));

describe('PackingChecklist & TripActivityFeed Component UI Tests', () => {
  const mockTrip = {
    _id: 'trip-pack-777',
    title: 'Patagonia Glaciers Expedition',
    currency: 'USD',
    owner: {
      _id: 'user-owner',
      name: 'Amelia Earhart',
      avatar: '',
    },
  };

  const mockMembers = [
    {
      user: { _id: 'user-owner', name: 'Amelia Earhart' },
      role: 'organizer',
    },
    {
      user: { _id: 'user-mate', name: 'Fred Noonan' },
      role: 'editor',
    },
  ];

  const mockPackingData = {
    success: true,
    stats: {
      totalItems: 3,
      packedItems: 1,
      unpackedItems: 2,
      progressPercentage: 33,
      categoryStats: {
        clothing: { total: 1, packed: 1 },
        documents: { total: 1, packed: 0 },
        medicines: { total: 1, packed: 0 },
      },
    },
    items: [
      {
        _id: 'pack-1',
        title: 'Thermal Fleece Jacket',
        category: 'clothing',
        quantity: 1,
        isPacked: true,
        assignedTo: { _id: 'user-owner', name: 'Amelia Earhart' },
        notes: 'Windproof layer',
      },
      {
        _id: 'pack-2',
        title: 'International Passports',
        category: 'documents',
        quantity: 2,
        isPacked: false,
        assignedTo: null,
        notes: 'Check validity 6 months',
      },
      {
        _id: 'pack-3',
        title: 'Altitude Sickness Pills',
        category: 'medicines',
        quantity: 1,
        isPacked: false,
        assignedTo: { _id: 'user-mate', name: 'Fred Noonan' },
        notes: '',
      },
    ],
    canEdit: true,
    isOwner: true,
  };

  const mockActivitiesData = {
    success: true,
    activities: [
      {
        _id: 'act-1',
        actor: { _id: 'user-owner', name: 'Amelia Earhart' },
        action: 'packing_toggle',
        entityType: 'packing',
        summary: 'Packed "Thermal Fleece Jacket"',
        createdAt: new Date().toISOString(),
        metadata: { title: 'Thermal Fleece Jacket', isPacked: true },
      },
      {
        _id: 'act-2',
        actor: { _id: 'user-mate', name: 'Fred Noonan' },
        action: 'expense_add',
        entityType: 'expense',
        summary: 'Logged expense "Camp Groceries" for 85.00 USD',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        metadata: { title: 'Camp Groceries', amountMajor: 85, currency: 'USD' },
      },
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasMore: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tripService.getPackingItems.mockResolvedValue(mockPackingData);
    tripService.createPackingItem.mockResolvedValue({
      success: true,
      item: {
        _id: 'pack-new',
        title: 'Hiking Boots',
        category: 'clothing',
        quantity: 1,
        isPacked: false,
      },
    });
    tripService.togglePackingItem.mockResolvedValue({
      success: true,
      stats: { totalItems: 3, packedItems: 2, progressPercentage: 67 },
    });
    tripService.getTripActivities.mockResolvedValue(mockActivitiesData);
  });

  describe('PackingChecklist UI', () => {
    it('renders progress bar, category groups, and item cards', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PackingChecklist trip={mockTrip} members={mockMembers} canEdit={true} />
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Packing Checklist')).toBeInTheDocument();
      });

      // Progress bar header
      expect(screen.getByText(/1 of 3 items packed \(33%\)/i)).toBeInTheDocument();

      // Check category groups
      expect(screen.getByText('Clothing & Apparel')).toBeInTheDocument();
      expect(screen.getByText('Documents & Passes')).toBeInTheDocument();
      expect(screen.getByText('Health & Medicines')).toBeInTheDocument();

      // Check items
      expect(screen.getByText('Thermal Fleece Jacket')).toBeInTheDocument();
      expect(screen.getByText('International Passports')).toBeInTheDocument();
      expect(screen.getByText('Altitude Sickness Pills')).toBeInTheDocument();

      // Check assignment indicator
      expect(screen.getAllByText('Amelia Earhart').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Fred Noonan').length).toBeGreaterThan(0);
    });

    it('toggles an item and invokes togglePackingItem', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PackingChecklist trip={mockTrip} members={mockMembers} canEdit={true} />
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('International Passports')).toBeInTheDocument();
      });

      // Click checkbox for "International Passports"
      const toggleBtn = screen.getByLabelText(/Mark "International Passports" as packed/i);
      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(tripService.togglePackingItem).toHaveBeenCalledWith('trip-pack-777', 'pack-2');
      });
    });

    it('filters items by search query', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PackingChecklist trip={mockTrip} members={mockMembers} canEdit={true} />
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Thermal Fleece Jacket')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search items or travelers/i);
      fireEvent.change(searchInput, { target: { value: 'Passports' } });

      expect(screen.queryByText('Thermal Fleece Jacket')).not.toBeInTheDocument();
      expect(screen.getByText('International Passports')).toBeInTheDocument();
    });

    it('opens modal and creates a new checklist item', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PackingChecklist trip={mockTrip} members={mockMembers} canEdit={true} />
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Add Item')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Item'));

      // Modal appears
      expect(screen.getByText('Add Packing Checklist Item')).toBeInTheDocument();

      // Enter name
      const titleInput = screen.getByPlaceholderText(/e\.g\. Hiking boots/i);
      fireEvent.change(titleInput, { target: { value: 'Water Purification Tablets' } });

      // Submit
      const submitBtn = screen.getByText('Add to Checklist');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(tripService.createPackingItem).toHaveBeenCalledWith(
          'trip-pack-777',
          expect.objectContaining({
            title: 'Water Purification Tablets',
          })
        );
      });
    });
  });

  describe('TripActivityFeed UI', () => {
    it('renders chronological activity events and filter tabs', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <TripActivityFeed trip={mockTrip} />
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Trip Activity Log')).toBeInTheDocument();
      });

      // Events
      expect(screen.getByText(/Packed "Thermal Fleece Jacket"/i)).toBeInTheDocument();
      expect(screen.getByText(/Logged expense "Camp Groceries" for 85.00 USD/i)).toBeInTheDocument();

      // Filter tabs
      expect(screen.getByRole('button', { name: 'All Activities' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Itinerary' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expenses' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Packing' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Companions' })).toBeInTheDocument();
    });

    it('switches filter tab and calls getTripActivities with type filter', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <TripActivityFeed trip={mockTrip} />
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Trip Activity Log')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Expenses' }));

      await waitFor(() => {
        expect(tripService.getTripActivities).toHaveBeenCalledWith(
          'trip-pack-777',
          expect.objectContaining({
            type: 'expense',
          })
        );
      });
    });
  });
});
