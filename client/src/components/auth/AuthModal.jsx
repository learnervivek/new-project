import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import Dialog from '../ui/Dialog';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const signinSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export function AuthModal({ isOpen, onClose, initialMode = 'signin', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const { login, register: registerAuth } = useAuth();
  const navigate = useNavigate();

  const isSignIn = mode === 'signin';
  const currentSchema = isSignIn ? signinSchema : signupSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    let result;
    if (isSignIn) {
      result = await login({ email: data.email, password: data.password });
    } else {
      result = await registerAuth(data);
    }
    setLoading(false);

    if (result.success) {
      reset();
      onClose();
      if (onAuthSuccess) onAuthSuccess(result.user);
    }
  };

  const handleDemoLogin = async () => {
    setValue('email', 'alex.traveler@example.com');
    setValue('password', 'Password123!');
    setLoading(true);

    let res = await login({ email: 'alex.traveler@example.com', password: 'Password123!' });
    if (!res.success) {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: 'Alex Rivera',
          email: 'alex.traveler@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });
      res = await login({ email: 'alex.traveler@example.com', password: 'Password123!' });
    }

    setLoading(false);
    if (res.success) {
      onClose();
      if (onAuthSuccess) onAuthSuccess(res.user);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isSignIn ? 'Welcome back to TripTally' : 'Start your travel journey'}
      description={
        isSignIn
          ? 'Sign in to access your shared group itineraries and tallies.'
          : 'Create a free account to coordinate friend trips and split costs.'
      }
      size="md"
    >
      <div className="space-y-6">
        {/* Mode Toggle Tabs */}
        <div className="flex p-1 rounded-xl bg-ivory-200/70 border border-ivory-300">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              reset();
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isSignIn
                ? 'bg-white text-forest-800 shadow-soft-sm'
                : 'text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              reset();
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isSignIn
                ? 'bg-white text-forest-800 shadow-soft-sm'
                : 'text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isSignIn && (
            <Input
              label="Full Name"
              placeholder="e.g. Alex Rivera"
              required
              leftIcon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />
          )}

          <Input
            id="modal-email"
            label="Email Address"
            type="email"
            placeholder="alex@example.com"
            required
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Password <span className="text-terracotta-500">*</span>
              </label>
              {isSignIn && (
                <Link
                  to="/forgot-password"
                  onClick={onClose}
                  className="text-xs text-forest-700 hover:text-forest-900 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="modal-password"
              type="password"
              placeholder="••••••••"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              helperText={isSignIn ? undefined : 'Minimum 6 characters'}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          {!isSignIn && (
            <Input
              id="modal-confirm-password"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          )}

          <div className="pt-2">
            <Button
              id="modal-submit-btn"
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isSignIn ? 'Sign In to TripTally' : 'Create Free Account'}
            </Button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-ivory-300 w-full" />
          <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-charcoal-400 font-semibold absolute">
            Or Quick Access
          </span>
        </div>

        {/* Demo Traveler Button */}
        <div className="space-y-2">
          <Button
            id="modal-demo-btn"
            type="button"
            variant="secondary"
            size="md"
            className="w-full justify-center"
            onClick={handleDemoLogin}
            disabled={loading}
            leftIcon={<Sparkles className="w-4 h-4 text-terracotta-500" />}
          >
            Instant Demo Sign-In (Guest)
          </Button>
          <p className="text-[11px] text-center text-charcoal-400">
            One-click sign-in • Real session with HTTP-only cookies
          </p>
        </div>
      </div>
    </Dialog>
  );
}

export default AuthModal;
