import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Compass,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Utensils,
  Camera,
  Hotel,
  Car,
  Sparkles,
  Save,
  Plus,
  Check,
  Navigation,
  IndianRupee
} from 'lucide-react';
import Dialog from '../ui/Dialog';
import Input from '../ui/Input';
import Button from '../ui/Button';
import tripService from '../../services/tripService';
import { useToast } from '../../context/ToastContext';

const activitySchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120, 'Title cannot exceed 120 characters'),
  category: z.enum(['sightseeing', 'restaurant', 'accommodation', 'transportation', 'activity']),
  date: z.string().min(1, 'Please select a date'),
  startTime: z.string().optional().or(z.literal('')),
  duration: z.coerce.number().min(0, 'Duration cannot be negative').default(60),
  location: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  estimatedCost: z.coerce.number().min(0, 'Estimated cost cannot be negative').default(0),
});

const categoryOptions = [
  { value: 'sightseeing', label: 'Sightseeing', icon: Camera, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { value: 'restaurant', label: 'Food & Dining', icon: Utensils, color: 'text-terracotta-600 bg-terracotta-50 border-terracotta-200' },
  { value: 'activity', label: 'Activity', icon: Sparkles, color: 'text-forest-600 bg-forest-50 border-forest-200' },
  { value: 'transportation', label: 'Transit', icon: Car, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'accommodation', label: 'Stay', icon: Hotel, color: 'text-amber-600 bg-amber-50 border-amber-200' },
];

export function ActivityModal({
  isOpen,
  onClose,
  trip,
  initialDate,
  activity = null,
  onSave,
}) {
  const [loading, setLoading] = useState(false);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState(activity?.coordinates || null);
  const { toast } = useToast();

  const toInputDate = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    return !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '';
  };

  const defaultDateStr = activity?.date
    ? toInputDate(activity.date)
    : initialDate
    ? toInputDate(initialDate)
    : trip?.startDate
    ? toInputDate(trip.startDate)
    : toInputDate(new Date());

  const minDate = trip?.startDate ? toInputDate(trip.startDate) : undefined;
  const maxDate = trip?.endDate ? toInputDate(trip.endDate) : undefined;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: activity?.title || '',
      category: activity?.category || 'activity',
      date: defaultDateStr,
      startTime: activity?.startTime || '',
      duration: activity?.duration || 60,
      location: activity?.location || '',
      notes: activity?.notes || '',
      estimatedCost: activity?.estimatedCost || 0,
    },
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    if (activity) {
      reset({
        title: activity.title || '',
        category: activity.category || 'activity',
        date: toInputDate(activity.date),
        startTime: activity.startTime || '',
        duration: activity.duration || 60,
        location: activity.location || '',
        notes: activity.notes || '',
        estimatedCost: activity.estimatedCost || 0,
      });
      setCoordinates(activity.coordinates || null);
    } else {
      reset({
        title: '',
        category: 'activity',
        date: defaultDateStr,
        startTime: '',
        duration: 60,
        location: '',
        notes: '',
        estimatedCost: 0,
      });
      setCoordinates(null);
    }
  }, [activity, initialDate, reset]);

  const handleVerifyLocation = async () => {
    const loc = watch('location');
    if (!loc?.trim()) {
      toast.info('Enter Location First', 'Type an attraction, restaurant, or address to verify.');
      return;
    }
    setVerifyingLocation(true);
    try {
      const query = loc.trim() + (trip?.destination ? `, ${trip.destination}` : '');
      const res = await tripService.geocode(query);
      if (res?.success && res.result) {
        setCoordinates({ lat: res.result.lat, lng: res.result.lng });
        toast.success('Coordinates Found!', `Pinned: ${res.result.displayName.slice(0, 45)}...`);
      } else {
        toast.warning('Not Found', 'Could not locate exact coordinates. You can still save the text address.');
      }
    } catch (err) {
      toast.error('Search Failed', 'Could not reach geocoding provider.');
    } finally {
      setVerifyingLocation(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (coordinates) {
        data.coordinates = coordinates;
      }
      let savedItem;
      if (activity && activity._id) {
        const res = await tripService.updateItineraryItem(trip._id, activity._id, data);
        savedItem = res.item;
        toast.success('Activity Updated!', `Updated "${data.title}".`);
      } else {
        const res = await tripService.createItineraryItem(trip._id, data);
        savedItem = res.item;
        toast.success('Activity Added!', `Scheduled "${data.title}".`);
      }

      if (onSave) onSave(savedItem, !activity);
      onClose();
    } catch (err) {
      toast.error(
        activity ? 'Could Not Update Activity' : 'Could Not Schedule Activity',
        err.message || 'Please check the required inputs.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={activity ? 'Edit Scheduled Activity' : 'Schedule New Activity'}
      description={`Plan daily experiences, reservations, and travels for "${trip?.title}".`}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Category Selector Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 block">
            Activity Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {categoryOptions.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setValue('category', cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? `${cat.color} ring-2 ring-forest-500/30 font-bold shadow-soft-sm`
                      : 'border-ivory-300 text-charcoal-600 hover:border-ivory-400 bg-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <Input
          label="Activity Title"
          placeholder="e.g. Fushimi Inari Sunrise Hike & Torii Walk"
          required
          leftIcon={<Sparkles className="w-4 h-4" />}
          error={errors.title?.message}
          {...register('title')}
        />

        {/* Date, Time, Duration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Scheduled Date"
            type="date"
            required
            min={minDate}
            max={maxDate}
            leftIcon={<Calendar className="w-4 h-4" />}
            error={errors.date?.message}
            {...register('date')}
          />

          <Input
            label="Start Time (Optional)"
            type="time"
            leftIcon={<Clock className="w-4 h-4" />}
            error={errors.startTime?.message}
            {...register('startTime')}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Duration (Minutes)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="15"
                placeholder="60"
                className="w-full bg-white text-charcoal-900 text-sm rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100/80 h-10 px-3 outline-none"
                {...register('duration')}
              />
              <span className="absolute right-3 top-2.5 text-xs text-charcoal-400 pointer-events-none">
                min
              </span>
            </div>
            {errors.duration?.message && (
              <p className="text-[11px] text-rose-600">{errors.duration.message}</p>
            )}
          </div>
        </div>

        {/* Location & Estimated Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              label="Location / Meeting Point"
              placeholder="e.g. Kyoto Station, Platform 4"
              leftIcon={<MapPin className="w-4 h-4" />}
              error={errors.location?.message}
              {...register('location')}
            />
            <div className="flex items-center justify-between text-[11px] px-1">
              {coordinates ? (
                <span className="text-forest-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Pinned ({coordinates.lat.toFixed(3)}, {coordinates.lng.toFixed(3)})
                </span>
              ) : (
                <span className="text-charcoal-400">Map coordinates optional</span>
              )}
              <button
                type="button"
                onClick={handleVerifyLocation}
                disabled={verifyingLocation}
                className="text-forest-700 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <Navigation className="w-3 h-3" />
                {verifyingLocation ? 'Finding...' : 'Verify Pin'}
              </button>
            </div>
          </div>

          <Input
            label={`Estimated Cost (${trip?.currency || 'INR'})`}
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            leftIcon={<IndianRupee className="w-4 h-4" />}
            error={errors.estimatedCost?.message}
            {...register('estimatedCost')}
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between">
            <span>Notes, Booking Reference & Tips (Optional)</span>
            <span className="text-[10px] text-charcoal-400 font-normal">Max 1000 chars</span>
          </label>
          <textarea
            rows={3}
            placeholder="Confirmation numbers, tickets info, dress codes, packing reminders..."
            className="w-full bg-white text-charcoal-900 placeholder:text-charcoal-300 text-sm rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100/80 p-3 transition-all outline-none"
            {...register('notes')}
          />
          {errors.notes?.message && (
            <p className="text-[11px] text-rose-600">{errors.notes.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-ivory-200 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            leftIcon={activity ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          >
            {activity ? 'Save Changes' : 'Schedule Activity'}
          </Button>
        </div>

      </form>
    </Dialog>
  );
}

export default ActivityModal;
