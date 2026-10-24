import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Compass,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Check,
  IndianRupee,
  AlertTriangle,
  UploadCloud,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Dialog from '../ui/Dialog';
import Input from '../ui/Input';
import Button from '../ui/Button';
import tripService from '../../services/tripService';
import { useToast } from '../../context/ToastContext';

const updateSchema = z.object({
  title: z.string().trim().min(3, 'Trip title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  destination: z.string().trim().min(2, 'Destination is required'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().or(z.literal('')),
  coverImage: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  currency: z.string().default('INR'),
  budget: z.coerce.number().min(0, 'Budget must be zero or positive').default(0),
  status: z.enum(['planning', 'confirmed', 'ongoing', 'completed', 'archived']).default('planning'),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

const coverPresets = [
  { name: 'Manali & Solang', url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Goa Beaches', url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Jaipur & Udaipur', url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Kerala Backwaters', url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Srinagar Dal Lake', url: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80' },
];

export function EditTripModal({ isOpen, onClose, trip, onTripUpdated }) {
  const [loading, setLoading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedCover, setSelectedCover] = useState(trip?.coverImage || '');
  const bannerInputRef = useRef(null);
  const { toast } = useToast();

  const toInputDate = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    return !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '';
  };

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      title: trip?.title || '',
      destination: trip?.destination || '',
      description: trip?.description || '',
      coverImage: trip?.coverImage || '',
      startDate: toInputDate(trip?.startDate),
      endDate: toInputDate(trip?.endDate),
      currency: trip?.currency || 'INR',
      budget: trip?.budget || 0,
      status: trip?.status || 'planning',
    },
  });

  useEffect(() => {
    if (trip) {
      reset({
        title: trip.title || '',
        destination: trip.destination || '',
        description: trip.description || '',
        coverImage: trip.coverImage || '',
        startDate: toInputDate(trip.startDate),
        endDate: toInputDate(trip.endDate),
        currency: trip.currency || 'INR',
        budget: trip.budget || 0,
        status: trip.status || 'planning',
      });
      setSelectedCover(trip.coverImage || '');
    }
  }, [trip, reset]);

  const onSelectCover = (url) => {
    setSelectedCover(url);
    setValue('coverImage', url);
  };

  const handleBannerFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid File', 'Please select an image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File Too Large', 'Banner image size must be less than 10MB.');
      return;
    }

    setUploadingBanner(true);
    try {
      const res = await tripService.uploadBanner(file);
      if (res?.success && res.bannerUrl) {
        setSelectedCover(res.bannerUrl);
        setValue('coverImage', res.bannerUrl, { shouldValidate: true, shouldDirty: true });
        toast.success('Banner Uploaded!', 'Custom trip banner updated successfully.');
      } else {
        toast.error('Upload Failed', res?.message || 'Could not upload banner.');
      }
    } catch (err) {
      toast.error('Upload Error', err.response?.data?.message || err.message || 'Error uploading banner.');
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await tripService.updateTrip(trip._id, data);
      if (response.success && response.trip) {
        toast.success('Trip Updated!', `Saved changes for "${response.trip.title}".`);
        onClose();
        if (onTripUpdated) onTripUpdated(response.trip);
      } else {
        toast.error('Update Failed', response.message || 'Please review your inputs.');
      }
    } catch (err) {
      toast.error('Error', err.response?.data?.message || err.message || 'Could not update trip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Trip Settings"
      description="Update destinations, trip dates, budget target in rupees, or cover imagery."
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        
        <Input
          label="Trip Title"
          placeholder="e.g. Manali Adventure with Friends"
          required
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Destination"
            placeholder="e.g. Manali, Himachal Pradesh"
            required
            leftIcon={<MapPin className="w-4 h-4" />}
            error={errors.destination?.message}
            {...register('destination')}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Trip Status
            </label>
            <select
              className="w-full bg-white text-charcoal-900 text-sm rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100/80 h-10 px-3 transition-all outline-none capitalize"
              {...register('status')}
            >
              <option value="planning">Planning (Draft)</option>
              <option value="confirmed">Confirmed (Booked)</option>
              <option value="ongoing">Ongoing (In Progress)</option>
              <option value="completed">Completed (Wrap-up)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="date"
            leftIcon={<Calendar className="w-4 h-4" />}
            error={errors.startDate?.message}
            {...register('startDate')}
          />

          <Input
            label="End Date"
            type="date"
            leftIcon={<Calendar className="w-4 h-4" />}
            error={errors.endDate?.message}
            {...register('endDate')}
          />

          <Input
            label="Target Budget"
            type="number"
            leftIcon={<IndianRupee className="w-4 h-4" />}
            error={errors.budget?.message}
            {...register('budget')}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Trip Currency
          </label>
          <select
            className="w-full bg-white text-charcoal-900 text-sm rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100/80 h-10 px-3 transition-all outline-none"
            {...register('currency')}
          >
            <option value="INR">INR (₹) Indian Rupee</option>
            <option value="USD">USD ($) United States Dollar</option>
            <option value="EUR">EUR (€) Euro</option>
            <option value="GBP">GBP (£) British Pound</option>
            <option value="AED">AED (د.إ) UAE Dirham</option>
            <option value="THB">THB (฿) Thai Baht</option>
            <option value="SGD">SGD ($) Singapore Dollar</option>
          </select>
        </div>

        {/* Cover Photo Banner & Upload */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between">
            <span>Change Cover Banner</span>
            <span className="text-[10px] text-charcoal-400 font-normal">Upload or select preset</span>
          </label>

          {/* Hidden banner file input */}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleBannerFileChange}
          />

          {/* Current Banner Preview with Instant Upload Overlay */}
          <div className="relative h-28 rounded-2xl overflow-hidden border-2 border-forest-600/30 bg-forest-950 group shadow-soft">
            {selectedCover ? (
              <img src={selectedCover} alt="Trip banner preview" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
            ) : (
              <div className="w-full h-full bg-forest-900 flex items-center justify-center text-ivory-300 text-xs">
                No banner set
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end justify-between p-3">
              <span className="text-xs font-medium text-white truncate max-w-[200px] flex items-center gap-1.5 drop-shadow">
                <Sparkles className="w-3.5 h-3.5 text-terracotta-400" /> Current Trip Banner
              </span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={uploadingBanner}
                isLoading={uploadingBanner}
                leftIcon={<UploadCloud className="w-4 h-4" />}
                onClick={() => bannerInputRef.current?.click()}
                className="shadow-soft-md"
              >
                {uploadingBanner ? 'Uploading...' : 'Upload New Banner'}
              </Button>
            </div>
          </div>

          {/* Preset Inspirations */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-medium text-charcoal-500">Or choose from destinations:</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {coverPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onSelectCover(preset.url)}
                  className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedCover === preset.url
                      ? 'border-forest-600 ring-2 ring-forest-200 scale-[1.02]'
                      : 'border-ivory-300 opacity-70 hover:opacity-100 hover:border-forest-500'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-white bg-black/60 px-1 py-0.5 rounded backdrop-blur-sm truncate block text-left">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Or Custom Cover Image URL"
            placeholder="https://images.unsplash.com/..."
            leftIcon={<ImageIcon className="w-4 h-4" />}
            error={errors.coverImage?.message}
            {...register('coverImage', {
              onChange: (e) => setSelectedCover(e.target.value),
            })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Trip Description & Summary
          </label>
          <textarea
            rows={2}
            placeholder="Share context, lodging links, and group guidelines..."
            className="w-full bg-white text-charcoal-900 text-sm rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100/80 p-3 transition-all outline-none resize-none"
            {...register('description')}
          />
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-ivory-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Changes
          </Button>
        </div>

      </form>
    </Dialog>
  );
}

export default EditTripModal;
