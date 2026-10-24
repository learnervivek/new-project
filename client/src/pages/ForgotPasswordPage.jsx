import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Compass, Mail, ArrowRight, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

const forgotSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetToken, setDevResetToken] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await forgotPassword(data.email);
      setSubmitted(true);
      if (res?.devResetToken) {
        setDevResetToken(res.devResetToken);
      }
    } catch (err) {
      // Handled in context toast
    } finally {
      setLoading(false);
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
            Reset Your Password
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Enter your account email to receive a password reset link.
          </p>
        </div>

        <Card variant="default" className="shadow-soft-xl border border-ivory-300">
          <CardContent className="p-6 sm:p-8 space-y-6">
            
            {submitted ? (
              <div className="space-y-5 text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900 font-display">
                  Check your inbox
                </h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  If an account exists for that email, a secure reset link has been dispatched with further instructions.
                </p>

                {devResetToken && (
                  <div className="p-4 rounded-2xl bg-forest-50/80 border border-forest-200 text-left space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest-800">
                      Development Mode Helper
                    </span>
                    <p className="text-xs text-charcoal-600">
                      Click below to proceed directly with your generated reset token:
                    </p>
                    <Link to={`/reset-password/${devResetToken}`}>
                      <Button variant="primary" size="sm" className="w-full mt-2">
                        Open Reset Password Page
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label="Registered Email"
                  type="email"
                  placeholder="alex@example.com"
                  required
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Send Reset Link
                </Button>
              </form>
            )}

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

export default ForgotPasswordPage;
