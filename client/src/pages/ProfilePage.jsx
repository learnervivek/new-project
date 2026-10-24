import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User,
  Mail,
  Camera,
  CheckCircle2,
  Calendar,
  Compass,
  LogOut,
  Save,
  ShieldCheck,
  FileText,
  MapPin,
  Sparkles,
  UploadCloud,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name cannot exceed 60 characters'),
  avatar: z.string().optional().or(z.literal('')),
  bio: z.string().max(240, 'Bio cannot exceed 240 characters').optional().or(z.literal('')),
});

const defaultAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
];

export function ProfilePage() {
  const { user, updateProfile, uploadAvatar, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      avatar: user?.avatar || '',
      bio: user?.bio || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
      });
      setSelectedAvatar(user.avatar || '');
    }
  }, [user, reset]);

  const onSelectPresetAvatar = (url) => {
    setSelectedAvatar(url);
    setValue('avatar', url, { shouldDirty: true });
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    setUploadingAvatar(true);
    const res = await uploadAvatar(file);
    if (res?.success && res.avatarUrl) {
      setSelectedAvatar(res.avatarUrl);
      setValue('avatar', res.avatarUrl, { shouldDirty: true });
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    await updateProfile(data);
    setSaving(false);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TT';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '2026';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Profile Header Banner */}
      <div className="relative rounded-3xl bg-forest-900 text-ivory-50 p-6 sm:p-10 overflow-hidden shadow-soft-xl border border-forest-800">
        <div className="absolute inset-0 bg-[radial-gradient(#2D6A4F_1px,transparent_1px)] [background-size:20px_20px] opacity-30 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          
          {/* Avatar display with quick upload */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-ivory-100/40 bg-forest-800 shadow-soft-lg flex items-center justify-center text-3xl font-bold font-display text-ivory-50 relative">
              {selectedAvatar ? (
                <img
                  src={selectedAvatar}
                  alt={user?.name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-forest-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs gap-1 z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-terracotta-400" />
                  <span className="text-[10px] font-medium tracking-wide">Uploading...</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              title="Upload profile photo"
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 active:scale-95 text-white shadow-soft-md transition-all group-hover:scale-110 disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* User Bio & Meta */}
          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                {user?.name}
              </h1>
              <Badge variant="terracotta" size="sm" withDot>
                Active Traveler
              </Badge>
            </div>

            <p className="text-xs sm:text-sm text-forest-200/90 font-mono">
              {user?.email}
            </p>

            <p className="text-xs text-forest-300/80 pt-1 flex items-center justify-center sm:justify-start gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Member since {memberSince}
            </p>
          </div>

          {/* Action button */}
          <div className="sm:self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-forest-700 text-ivory-100 hover:bg-forest-800"
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </div>

        </div>
      </div>

      {/* Grid: Edit Details & Account Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Edit Profile Form */}
        <div className="lg:col-span-8 space-y-6">
          <Card variant="default" className="shadow-soft border border-ivory-300">
            <CardHeader className="border-b border-ivory-200">
              <CardTitle className="text-xl font-display">Personal Details</CardTitle>
              <CardDescription>
                Update your display name, traveler avatar, and bio seen by trip companions.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                <Input
                  label="Display Name"
                  placeholder="Your full name"
                  required
                  leftIcon={<User className="w-4 h-4" />}
                  error={errors.name?.message}
                  {...register('name')}
                />

                {/* Direct Upload Profile Photo Option */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between">
                    <span>Profile Photo</span>
                    <span className="text-[10px] text-charcoal-400 font-normal">PNG, JPG, WEBP (Max 5MB)</span>
                  </label>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />

                  <div className="p-4 rounded-2xl border-2 border-dashed border-ivory-300 hover:border-forest-500 bg-ivory-50/60 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-forest-100 border border-forest-200 text-forest-700 flex items-center justify-center shrink-0">
                        {selectedAvatar ? (
                          <img src={selectedAvatar} alt="Current Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UploadCloud className="w-6 h-6 text-forest-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-charcoal-900">Upload from Device</p>
                        <p className="text-xs text-charcoal-500">Choose a high-res photo for your traveler passport</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={uploadingAvatar}
                      isLoading={uploadingAvatar}
                      leftIcon={<UploadCloud className="w-4 h-4" />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                  </div>
                </div>

                {/* Avatar Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between">
                    <span>Or Choose Avatar Preset</span>
                    <span className="text-[10px] text-charcoal-400 font-normal">Click to apply</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {defaultAvatars.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onSelectPresetAvatar(url)}
                        className={`w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                          selectedAvatar === url
                            ? 'border-forest-600 ring-2 ring-forest-200 scale-105'
                            : 'border-ivory-300 hover:border-forest-500 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Avatar preset ${i + 1}`} className="w-full h-full object-cover rounded-xl" />
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Or Image URL"
                  placeholder="https://example.com/avatar.jpg"
                  leftIcon={<ImageIcon className="w-4 h-4" />}
                  error={errors.avatar?.message}
                  {...register('avatar', {
                    onChange: (e) => setSelectedAvatar(e.target.value),
                  })}
                  helperText="You can also paste any public image link"
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    Traveler Bio
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell your travel buddies a bit about your travel style (e.g., foodie, mountain hiker, budget planner)..."
                    className="w-full bg-white text-charcoal-900 placeholder:text-charcoal-300 text-sm rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100/80 p-3.5 transition-all outline-none"
                    {...register('bio')}
                  />
                  {errors.bio && (
                    <p className="text-xs text-red-600">{errors.bio.message}</p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-charcoal-400">
                    {isDirty ? 'Unsaved changes pending' : 'All changes saved'}
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={saving}
                    disabled={!isDirty && !saving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Changes
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Account Security & Trip Overview */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Account Security Box */}
          <Card variant="default" className="shadow-soft border border-ivory-300">
            <CardHeader className="border-b border-ivory-200">
              <CardTitle className="text-base font-display">Account Security</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">
                  Registered Email
                </span>
                <p className="text-xs font-mono font-bold text-charcoal-900 break-all">
                  {user?.email}
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Secure & Verified</span>
                </div>
              </div>

              <div className="pt-3 border-t border-ivory-200 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">
                  Session Type
                </span>
                <p className="text-xs text-charcoal-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-forest-600" />
                  HTTP-Only Encrypted Cookie
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Travel Stats Box */}
          <Card variant="subtle" className="border border-ivory-300">
            <CardHeader>
              <CardTitle className="text-base font-display">TripTally Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-white border border-ivory-200">
                <span className="text-charcoal-600">Collaborative Trips</span>
                <span className="font-bold font-mono text-charcoal-900">3 Planned</span>
              </div>
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-white border border-ivory-200">
                <span className="text-charcoal-600">Shared Tallies</span>
                <span className="font-bold font-mono text-forest-700">100% In Sync</span>
              </div>
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-white border border-ivory-200">
                <span className="text-charcoal-600">Travel Crew</span>
                <span className="font-bold font-mono text-charcoal-900">8 Companions</span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}

export default ProfilePage;
