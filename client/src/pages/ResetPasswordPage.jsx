import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Compass, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

const resetSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your new password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export function ResetPasswordPage() {
  const { token } = useParams();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await resetPassword(token, data);
    setLoading(false);
    if (result.success) {
      navigate('/profile', { replace: true });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-forest-600 flex items-center justify-center text-ivory-50 shadow-soft">
              <Compass className="w-6 h-6" />
            </div>
          </Link>
          <h2 className="text-3xl font-extrabold text-charcoal-900 font-display tracking-tight">
            Create New Password
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Set your new secure password below to log back into TripTally.
          </p>
        </div>

        <Card variant="default" className="shadow-soft-xl border border-ivory-300">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                required
                leftIcon={<Lock className="w-4 h-4" />}
                helperText="Minimum 6 characters"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm New Password"
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
                  Save Password & Sign In
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="bg-ivory-50/50 justify-center py-4 border-t border-ivory-200">
            <Link
              to="/login"
              className="text-xs font-semibold text-charcoal-600 hover:text-forest-700 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}

export default ResetPasswordPage;
