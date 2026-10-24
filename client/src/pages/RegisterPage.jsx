import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Compass, User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name cannot exceed 60 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const from = location.state?.from
    ? `${location.state.from.pathname || '/'}${location.state.from.search || ''}`
    : '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await registerAuth(data);
    setLoading(false);
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-forest-600 flex items-center justify-center text-ivory-50 shadow-soft">
              <Compass className="w-6 h-6" />
            </div>
          </Link>
          <h2 className="text-3xl font-extrabold text-charcoal-900 font-display tracking-tight">
            Start with Trip<span className="text-terracotta-500">Tally</span>
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Create your account to co-plan adventures and split costs seamlessly.
          </p>
        </div>

        {/* Card */}
        <Card variant="default" className="shadow-soft-xl border border-ivory-300">
          <CardContent className="p-6 sm:p-8 space-y-6">
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Elena Rostova"
                required
                leftIcon={<User className="w-4 h-4" />}
                error={errors.name?.message}
                {...register('name')}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="elena@example.com"
                required
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                required
                leftIcon={<Lock className="w-4 h-4" />}
                helperText="Minimum 6 characters"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                required
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Create Free Account
                </Button>
              </div>
            </form>

            <div className="pt-2 border-t border-ivory-200 text-xs text-charcoal-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-forest-600 shrink-0" />
              <span>Passwords securely hashed with bcrypt. Sessions protected in HTTP-only cookies.</span>
            </div>

          </CardContent>

          <CardFooter className="bg-ivory-50/50 justify-center py-4 border-t border-ivory-200">
            <p className="text-xs text-charcoal-600">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-forest-700 hover:text-forest-900">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}

export default RegisterPage;
