import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Compass, Mail, Lock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const from = location.state?.from
    ? `${location.state.from.pathname || '/'}${location.state.from.search || ''}`
    : '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await login(data);
    setLoading(false);
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  const handleDemoSignIn = async () => {
    setValue('email', 'alex.traveler@example.com');
    setValue('password', 'Password123!');
    setLoading(true);
    // Attempt login or fallback to registering demo user
    let res = await login({ email: 'alex.traveler@example.com', password: 'Password123!' });
    if (!res.success) {
      // Create demo user if not existing
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
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-forest-600 flex items-center justify-center text-ivory-50 shadow-soft">
              <Compass className="w-6 h-6" />
            </div>
          </Link>
          <h2 className="text-3xl font-extrabold text-charcoal-900 font-display tracking-tight">
            Welcome back to Trip<span className="text-terracotta-500">Tally</span>
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Sign in to coordinate itineraries and group tallies.
          </p>
        </div>

        {/* Card */}
        <Card variant="default" className="shadow-soft-xl border border-ivory-300">
          <CardContent className="p-6 sm:p-8 space-y-6">
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                id="login-email"
                label="Email Address"
                type="email"
                placeholder="you@example.com"
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
                  <Link
                    to="/forgot-password"
                    className="text-xs text-forest-700 hover:text-forest-900 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              <div className="pt-2">
                <Button
                  id="login-submit-btn"
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Sign In
                </Button>
              </div>
            </form>

            {/* Quick Demo Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-ivory-300 w-full" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-charcoal-400 font-semibold absolute">
                Or Instant Preview
              </span>
            </div>

            <Button
              id="demo-login-btn"
              type="button"
              variant="secondary"
              size="md"
              className="w-full justify-center"
              onClick={handleDemoSignIn}
              leftIcon={<Sparkles className="w-4 h-4 text-terracotta-500" />}
            >
              Sign In as Guest Demo
            </Button>

          </CardContent>

          <CardFooter className="bg-ivory-50/50 justify-center py-4 border-t border-ivory-200">
            <p className="text-xs text-charcoal-600">
              Don't have an account?{' '}
              <Link to="/register" state={location.state} className="font-bold text-forest-700 hover:text-forest-900">
                Create one free
              </Link>
            </p>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}

export default LoginPage;
