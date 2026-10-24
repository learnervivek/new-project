import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Check,
  X,
  ArrowRight,
  Compass,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';
import tripService from '../services/tripService';

export function InvitationsPage() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [inviteCode, setInviteCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);

  // User pending invitations state
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Token invitation banner state (if URL contains ?token=...)
  const [tokenInvite, setTokenInvite] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  const fetchMyInvitations = async () => {
    setLoading(true);
    try {
      const res = await tripService.getMyInvitations();
      if (res.success && res.invitations) {
        setInvitations(res.invitations);
      }
    } catch (err) {
      console.error('Failed to load user invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const inspectToken = async (tok) => {
    setTokenLoading(true);
    setTokenError(null);
    try {
      const res = await tripService.getInvitationByToken(tok);
      if (res.success && res.invitation) {
        setTokenInvite(res.invitation);
      }
    } catch (err) {
      setTokenError(err.message || 'Invitation is invalid or has expired.');
    } finally {
      setTokenLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInvitations();
    if (tokenParam) {
      inspectToken(tokenParam);
    }
  }, [tokenParam]);

  const handleJoinTripWithCode = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setJoiningCode(true);
    try {
      const res = await tripService.joinTrip(inviteCode.trim());
      if (res.success && res.trip) {
        toast.success('Joined Trip!', `You are now a companion on "${res.trip.title}".`);
        navigate(`/trips/${res.trip._id}`);
      }
    } catch (err) {
      toast.error('Could Not Join', err.message || 'Invalid or expired invite code.');
    } finally {
      setJoiningCode(false);
    }
  };

  const handleAcceptTokenInvite = async () => {
    if (!tokenParam) return;
    setActionInProgress('token');
    try {
      const res = await tripService.acceptInvitationByToken(tokenParam);
      if (res.success) {
        toast.success('Invitation Accepted!', res.message);
        navigate(`/trips/${res.trip._id}`);
      }
    } catch (err) {
      toast.error('Could Not Accept', err.message || 'Failed to accept invitation.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeclineTokenInvite = async () => {
    if (!tokenParam) return;
    setActionInProgress('token');
    try {
      const res = await tripService.declineInvitationByToken(tokenParam);
      if (res.success) {
        toast.info('Invitation Declined', res.message);
        setTokenInvite(null);
      }
    } catch (err) {
      toast.error('Action Failed', err.message || 'Could not decline invitation.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAcceptInvite = async (invitation) => {
    setActionInProgress(invitation._id);
    try {
      const res = await tripService.acceptInvitationById(invitation._id);
      if (res.success) {
        toast.success('Joined Board!', `You joined "${invitation.trip?.title}".`);
        navigate(`/trips/${res.trip._id}`);
      }
    } catch (err) {
      toast.error('Accept Failed', err.message || 'Could not accept invitation.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeclineInvite = async (invitationId) => {
    setActionInProgress(invitationId);
    try {
      const res = await tripService.declineInvitationById(invitationId);
      if (res.success) {
        toast.info('Declined', 'Invitation declined.');
        setInvitations((prev) => prev.filter((i) => i._id !== invitationId));
      }
    } catch (err) {
      toast.error('Decline Failed', err.message || 'Could not decline invitation.');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 font-display">
          Trip Invitations
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
          Review personalized invites or join an adventure using an invite code.
        </p>
      </div>

      {/* Direct Token Link Highlight Banner (if navigated via email token link) */}
      {tokenParam && (
        <div>
          {tokenLoading ? (
            <div className="p-6 rounded-2xl bg-ivory-200 animate-pulse h-36" />
          ) : tokenError ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Invalid or Expired Invitation Link</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{tokenError}</p>
              </div>
            </div>
          ) : tokenInvite && (
            <Card variant="forest" className="p-6 shadow-soft-lg space-y-4 border-2 border-forest-500/50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-terracotta-500/20 text-terracotta-300 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-terracotta-400" /> Direct Invitation Received
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white font-display">
                    {tokenInvite.trip?.title}
                  </h3>
                  <p className="text-xs text-forest-200 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-terracotta-400" />
                    <span>{tokenInvite.trip?.destination}</span>
                    <span>•</span>
                    <span>Role: <strong className="capitalize text-white">{tokenInvite.role}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="accent"
                    size="md"
                    isLoading={actionInProgress === 'token'}
                    onClick={handleAcceptTokenInvite}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Accept & Join
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    className="text-ivory-300 hover:text-white hover:bg-forest-800"
                    disabled={actionInProgress === 'token'}
                    onClick={handleDeclineTokenInvite}
                  >
                    Decline
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-forest-900/60 border border-forest-700/50 text-xs text-forest-200 flex items-center justify-between">
                <span>
                  Invited by <strong>{tokenInvite.inviter?.name || 'A fellow traveler'}</strong> ({tokenInvite.inviter?.email})
                </span>
                <span className="text-[11px] text-forest-300">
                  Expires {new Date(tokenInvite.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Join with code box */}
      <Card variant="default" className="p-6 shadow-soft border border-ivory-300">
        <h3 className="text-sm font-bold text-charcoal-900 font-display mb-1">
          Have a Trip Invite Code?
        </h3>
        <p className="text-xs text-charcoal-500 mb-4">
          Enter the 8-character code shared by your trip organizer to instantly join the board.
        </p>

        <form onSubmit={handleJoinTripWithCode} className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
          <Input
            placeholder="e.g. 7F438792"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            leftIcon={<Mail className="w-4 h-4" />}
            className="uppercase font-mono tracking-wider"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={joiningCode}
            className="w-full sm:w-auto shrink-0"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Join Board
          </Button>
        </form>
      </Card>

      {/* Pending Invites list */}
      <Card variant="default" className="shadow-soft border border-ivory-300">
        <CardHeader className="border-b border-ivory-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-display">Pending Travel Invites ({invitations.length})</CardTitle>
            <CardDescription className="text-xs text-charcoal-500">
              Invitations sent directly to your registered email address
            </CardDescription>
          </div>
          {invitations.length > 0 && (
            <Badge variant="terracotta" size="sm">Awaiting Response</Badge>
          )}
        </CardHeader>
        <CardContent className="p-4">
          
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 rounded-xl bg-ivory-100 animate-pulse" />
              <div className="h-20 rounded-xl bg-ivory-100 animate-pulse" />
            </div>
          ) : invitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No pending invitations"
              description="When friends invite you to join their trip itineraries, you'll see them right here."
            />
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => {
                const trip = inv.trip || {};
                const inviter = inv.inviter || {};
                const isOperating = actionInProgress === inv._id;

                return (
                  <div
                    key={inv._id}
                    className="p-4 rounded-xl bg-ivory-50/80 border border-ivory-200 hover:border-ivory-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-forest-700 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-soft-sm">
                        {trip.coverImage ? (
                          <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                        ) : (
                          <span>{trip.destination ? trip.destination.slice(0, 2).toUpperCase() : 'TT'}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-charcoal-900 truncate">
                            {trip.title || 'Untitled Trip'}
                          </p>
                          <Badge variant="forest" size="sm" className="capitalize">
                            {inv.role}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-charcoal-500 mt-0.5 truncate">
                          {inviter.name || 'Friend'} invited you • {trip.destination || 'Flexible'}
                        </p>
                        <p className="text-[10px] text-charcoal-400 flex items-center gap-1 mt-1 font-mono">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Expires on {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isOperating}
                        onClick={() => handleAcceptInvite(inv)}
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isOperating}
                        onClick={() => handleDeclineInvite(inv._id)}
                        leftIcon={<X className="w-3.5 h-3.5" />}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

export default InvitationsPage;
