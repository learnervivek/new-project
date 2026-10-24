import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Mail,
  Shield,
  Send,
  Copy,
  Check,
  Users,
  Info
} from 'lucide-react';
import Dialog from '../ui/Dialog';
import Input from '../ui/Input';
import Button from '../ui/Button';
import tripService from '../../services/tripService';
import { useToast } from '../../context/ToastContext';

const inviteSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  role: z.enum(['organizer', 'editor', 'viewer']).default('editor'),
});

export function InviteMemberModal({ isOpen, onClose, trip, onMemberInvited }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'editor',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setLastInviteLink('');
    try {
      const res = await tripService.inviteMember(trip._id, data);
      if (res.success) {
        toast.success(
          'Invitation Sent!',
          `Travel invite dispatched to ${data.email} as an ${data.role}.`
        );
        if (res.devInviteUrl) {
          setLastInviteLink(res.devInviteUrl);
        }
        reset();
        if (onMemberInvited) onMemberInvited(res.invitation);
        if (!res.devInviteUrl) {
          onClose();
        }
      }
    } catch (err) {
      toast.error('Could Not Send Invite', err.message || 'Please check the email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!lastInviteLink) return;
    navigator.clipboard.writeText(lastInviteLink);
    setCopied(true);
    toast.info('Copied!', 'Direct invitation link copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    if (!trip?.inviteCode) return;
    navigator.clipboard.writeText(trip.inviteCode);
    setCopied(true);
    toast.info('Copied!', 'Trip invite code copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        setLastInviteLink('');
        onClose();
      }}
      title="Invite Travel Companion"
      description={`Add friends to collaborate on "${trip?.title}".`}
      size="md"
    >
      <div className="space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Companion's Email Address"
            placeholder="friend@example.com"
            type="email"
            required
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-forest-600" />
              Collaboration Role
            </label>
            <select
              className="w-full bg-white text-charcoal-900 text-sm rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100/80 h-10 px-3 transition-all outline-none"
              {...register('role')}
            >
              <option value="editor">Editor — Can manage itinerary & log shared expenses</option>
              <option value="viewer">Viewer — Read-only access to itinerary & budget</option>
              <option value="organizer">Organizer — Can invite companions & edit trip details</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-ivory-100/70 border border-ivory-200 text-xs text-charcoal-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-forest-600 shrink-0 mt-0.5" />
            <p>
              Invitations expire in <strong>7 days</strong>. We'll send an email with an accept link, or you can share the trip code directly.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLastInviteLink('');
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send Invitation
            </Button>
          </div>
        </form>

        {/* Development or Direct Link Quick Copy */}
        {lastInviteLink && (
          <div className="p-3.5 rounded-xl bg-forest-50/60 border border-forest-200 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-forest-900">
              <span>Direct Invitation Link</span>
              <span className="text-[10px] text-forest-700 font-normal">Active for 7 days</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={lastInviteLink}
                className="w-full text-xs font-mono bg-white border border-forest-300 rounded-lg px-2.5 py-1.5 text-forest-950 select-all"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyLink}
                leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}

        {/* Fallback Invite Code Box */}
        <div className="pt-3 border-t border-ivory-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-charcoal-600">
            <Users className="w-4 h-4 text-forest-600" />
            <span>Trip Invite Code: <strong className="font-mono text-charcoal-900">{trip?.inviteCode}</strong></span>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="text-xs font-semibold text-forest-700 hover:text-forest-900 hover:underline flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Copy Code
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export default InviteMemberModal;
