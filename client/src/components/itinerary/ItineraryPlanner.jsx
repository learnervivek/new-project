import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  IndianRupee,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Compass,
  ArrowUpDown,
  Filter,
  Map
} from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import ActivityCard from './ActivityCard';
import ActivityModal from './ActivityModal';
import tripService from '../../services/tripService';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/utils';

export function ItineraryPlanner({
  trip,
  canEdit = false,
  items: propItems,
  onItemsChange,
  onSwitchToMap,
}) {
  const { toast } = useToast();

  const [items, setItems] = useState(propItems || []);
  const [loading, setLoading] = useState(propItems && propItems.length > 0 ? false : true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Day 1, -1 = All Days
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync with propItems if passed
  useEffect(() => {
    if (propItems) {
      setItems(propItems);
      setLoading(false);
    }
  }, [propItems]);

  const updateItemsState = (updater) => {
    setItems((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onItemsChange?.(next);
      return next;
    });
  };

  // Load itinerary items
  const fetchItinerary = async () => {
    setLoading(true);
    try {
      const res = await tripService.getItinerary(trip._id);
      if (res.success && res.items) {
        setItems(res.items);
        onItemsChange?.(res.items);
      }
    } catch (err) {
      console.error('Failed to load itinerary:', err);
      toast.error('Schedule Load Failed', err.message || 'Could not load itinerary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trip?._id && !propItems) {
      fetchItinerary();
    }
  }, [trip?._id]);

  // Generate day-by-day dates from trip startDate and endDate
  const daysList = useMemo(() => {
    if (!trip?.startDate) {
      // If dates not set, extract unique dates from existing items
      const uniqueDates = Array.from(
        new Set(items.map((i) => new Date(i.date).toISOString().split('T')[0]))
      ).sort();

      if (uniqueDates.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        return [{ index: 0, dayNumber: 1, dateStr: today, label: 'Day 1' }];
      }

      return uniqueDates.map((dateStr, idx) => ({
        index: idx,
        dayNumber: idx + 1,
        dateStr,
        label: `Day ${idx + 1}`,
      }));
    }

    const start = new Date(trip.startDate);
    const end = trip.endDate ? new Date(trip.endDate) : new Date(start);
    const days = [];
    const curr = new Date(start);
    let count = 1;

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      days.push({
        index: count - 1,
        dayNumber: count,
        dateStr,
        label: `Day ${count}`,
      });
      curr.setDate(curr.getDate() + 1);
      count++;
    }

    return days;
  }, [trip?.startDate, trip?.endDate, items]);

  const activeDay = selectedDayIndex >= 0 ? daysList[selectedDayIndex] : null;

  // Filter items by selected day and category
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      // Day filter
      if (selectedDayIndex >= 0 && activeDay) {
        const itemYMD = new Date(item.date).toISOString().split('T')[0];
        if (itemYMD !== activeDay.dateStr) return false;
      }

      // Category filter
      if (filterCategory !== 'all' && item.category !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [items, selectedDayIndex, activeDay, filterCategory]);

  // Daily statistics for active day
  const dailyStats = useMemo(() => {
    if (!activeDay) {
      return { totalCost: 0, durationMinutes: 0, count: 0 };
    }

    const dayItems = items.filter(
      (item) => new Date(item.date).toISOString().split('T')[0] === activeDay.dateStr
    );

    const totalCost = dayItems.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
    const durationMinutes = dayItems.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    return {
      totalCost,
      durationMinutes,
      count: dayItems.length,
    };
  }, [items, activeDay]);

  // Overall planned cost across all itinerary items
  const overallPlannedCost = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
  }, [items]);

  const budgetPct = trip?.budget > 0 ? Math.min(100, (overallPlannedCost / trip.budget) * 100) : 0;

  // Handlers
  const handleOpenAddModal = (dateStr) => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSaveItem = (savedItem, isNew) => {
    if (isNew) {
      updateItemsState((prev) => [...prev, savedItem]);
    } else {
      updateItemsState((prev) =>
        prev.map((i) => (i._id === savedItem._id ? savedItem : i))
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    const id = itemToDelete._id;

    // Optimistic delete
    updateItemsState((prev) => prev.filter((i) => i._id !== id));
    setItemToDelete(null);

    try {
      await tripService.deleteItineraryItem(trip._id, id);
      toast.success('Activity Deleted', 'Removed from daily schedule.');
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Could not delete item.');
      // Rollback
      fetchItinerary();
    } finally {
      setDeleteLoading(false);
    }
  };

  // Reorder Handler (accessible Move Up / Move Down)
  const handleMove = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= displayedItems.length) return;

    const reordered = [...displayedItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistic UI update for items
    const reorderedMap = new Map();
    reordered.forEach((it, idx) => {
      reorderedMap.set(it._id, idx);
    });

    updateItemsState((prev) =>
      prev.map((it) => (reorderedMap.has(it._id) ? { ...it, order: reorderedMap.get(it._id) } : it))
    );

    try {
      const payload = reordered.map((it, idx) => ({ id: it._id, order: idx }));
      await tripService.reorderItineraryItems(trip._id, payload);
    } catch (err) {
      toast.error('Reorder Failed', err.message || 'Could not persist order.');
      fetchItinerary();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Overall Itinerary Summary Header */}
      <Card variant="default" className="p-5 shadow-soft border border-ivory-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ivory-200">
          <div>
            <span className="text-[11px] font-bold text-forest-700 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Day-by-Day Master Schedule
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-charcoal-900 font-display mt-0.5">
              Trip Itinerary Planner
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToMap && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToMap}
                leftIcon={<Map className="w-4 h-4 text-forest-600" />}
              >
                Map View
              </Button>
            )}
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenAddModal(activeDay?.dateStr)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Activity
              </Button>
            )}
          </div>
        </div>

        {/* Budget & Target Progress Meter */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-charcoal-500 font-medium">Planned Itinerary Cost</span>
            <p className="text-lg sm:text-xl font-bold text-forest-800 font-display font-mono">
              {formatCurrency(overallPlannedCost, trip.currency || 'INR')}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-charcoal-500 font-medium">Target Trip Budget</span>
            <p className="text-lg sm:text-xl font-bold text-charcoal-900 font-display font-mono">
              {formatCurrency(trip.budget || 0, trip.currency || 'INR')}
            </p>
          </div>

          <div className="space-y-1.5 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-semibold text-charcoal-600">
              <span>Budget Allocation</span>
              <span>{Math.round(budgetPct)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-ivory-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  budgetPct > 100
                    ? 'bg-rose-500'
                    : budgetPct > 80
                    ? 'bg-amber-500'
                    : 'bg-forest-600'
                }`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Day-by-Day Horizontal Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Day Pills Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedDayIndex(-1)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              selectedDayIndex === -1
                ? 'bg-forest-800 text-white border-forest-800 shadow-soft-sm'
                : 'bg-white text-charcoal-600 border-ivory-300 hover:border-ivory-400'
            }`}
          >
            All Days ({items.length})
          </button>

          {daysList.map((day) => {
            const isSelected = selectedDayIndex === day.index;
            const dayItems = items.filter(
              (i) => new Date(i.date).toISOString().split('T')[0] === day.dateStr
            );
            const dateObj = new Date(day.dateStr);
            const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return (
              <button
                key={day.index}
                type="button"
                onClick={() => setSelectedDayIndex(day.index)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-forest-800 text-white border-forest-800 shadow-soft-sm'
                    : 'bg-white text-charcoal-700 border-ivory-300 hover:border-ivory-400'
                }`}
              >
                <span>{day.label}</span>
                <span className={`text-[10px] font-normal ${isSelected ? 'text-forest-200' : 'text-charcoal-400'}`}>
                  {dateLabel}
                </span>
                {dayItems.length > 0 && (
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isSelected
                        ? 'bg-white text-forest-900'
                        : 'bg-forest-100 text-forest-800'
                    }`}
                  >
                    {dayItems.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day Step Controls */}
        {selectedDayIndex >= 0 && (
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedDayIndex <= 0}
              onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
              className="h-8 px-2"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono font-semibold text-charcoal-600 px-1">
              {selectedDayIndex + 1} / {daysList.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedDayIndex >= daysList.length - 1}
              onClick={() => setSelectedDayIndex((prev) => Math.min(daysList.length - 1, prev + 1))}
              className="h-8 px-2"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 3. Selected Day Focus Header */}
      {activeDay && (
        <div className="p-3.5 rounded-2xl bg-ivory-100/80 border border-ivory-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-charcoal-900 text-sm font-display">
              {activeDay.label}: {new Date(activeDay.dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-4 text-charcoal-600 font-medium">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-forest-600" />
              {dailyStats.count} {dailyStats.count === 1 ? 'activity' : 'activities'}
            </span>
            {dailyStats.durationMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-forest-600" />
                {Math.floor(dailyStats.durationMinutes / 60)}h {dailyStats.durationMinutes % 60}m scheduled
              </span>
            )}
            <span className="flex items-center gap-1 font-mono font-bold text-forest-800">
              <IndianRupee className="w-3.5 h-3.5 text-forest-600" />
              {formatCurrency(dailyStats.totalCost)} est.
            </span>
          </div>
        </div>
      )}

      {/* 4. Timeline Activities List */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-28 rounded-2xl bg-ivory-100 animate-pulse" />
          <div className="h-28 rounded-2xl bg-ivory-100 animate-pulse" />
        </div>
      ) : displayedItems.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={selectedDayIndex >= 0 ? `No activities scheduled for ${activeDay?.label}` : 'No activities scheduled yet'}
          description={
            canEdit
              ? 'Start building your day by adding sightseeing highlights, dining spots, transit, or walking tours.'
              : 'The organizers have not added scheduled activities for this date yet.'
          }
          actionLabel={canEdit ? 'Schedule Activity' : undefined}
          onAction={canEdit ? () => handleOpenAddModal(activeDay?.dateStr) : undefined}
        />
      ) : (
        <div className="space-y-3 pt-2">
          {displayedItems.map((item, idx) => (
            <ActivityCard
              key={item._id}
              item={item}
              canEdit={canEdit}
              isFirst={idx === 0}
              isLast={idx === displayedItems.length - 1}
              currency={trip.currency || 'INR'}
              onEdit={() => handleOpenEditModal(item)}
              onDelete={() => setItemToDelete(item)}
              onMoveUp={() => handleMove(idx, 'up')}
              onMoveDown={() => handleMove(idx, 'down')}
            />
          ))}
        </div>
      )}

      {/* Activity Add / Edit Modal */}
      {modalOpen && (
        <ActivityModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
          trip={trip}
          initialDate={activeDay?.dateStr}
          activity={editingItem}
          onSave={handleSaveItem}
        />
      )}

      {/* Delete Activity Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteLoading}
        title="Remove Activity?"
        description={`Are you sure you want to remove "${itemToDelete?.title}" from the itinerary? This cannot be undone.`}
        confirmText="Yes, Remove Activity"
        variant="danger"
      />

    </div>
  );
}

export default ItineraryPlanner;
