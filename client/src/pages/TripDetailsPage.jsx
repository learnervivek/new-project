import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Copy,
  Check,
  Share2,
  Receipt,
  Plus,
  ShieldCheck,
  AlertCircle,
  Edit3,
  Archive,
  Trash2,
  Lock,
  UserPlus,
  Clock,
  X,
  Map,
  BarChart3,
  Luggage,
  Activity,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton, { TripCardSkeleton } from '../components/ui/Skeleton';
import EditTripModal from '../components/trips/EditTripModal';
import InviteMemberModal from '../components/trips/InviteMemberModal';
import ItineraryPlanner from '../components/itinerary/ItineraryPlanner';
import TripMapView from '../components/map/TripMapView';
import ExpenseManager from '../components/expenses/ExpenseManager';
import BudgetAnalytics from '../components/analytics/BudgetAnalytics';
import PackingChecklist from '../components/packing/PackingChecklist';
import TripActivityFeed from '../components/activity/TripActivityFeed';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import tripService from '../services/tripService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';

export function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('itinerary');

  // Dialog states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTrip = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tripService.getTripById(id);
      if (res.success && res.trip) {
        setTrip(res.trip);
        setExpenses(res.expenses || []);
        setIsOwner(res.isOwner || false);
        setCanEdit(res.canEdit || false);
        setInvitations(res.invitations || []);

        // Load itinerary items
        try {
          const itinRes = await tripService.getItinerary(id);
          if (itinRes.success && itinRes.items) {
            setItineraryItems(itinRes.items);
          }
        } catch (itinErr) {
          console.warn('Itinerary items load error:', itinErr);
        }
      } else {
        setError('Trip details not available.');
      }
    } catch (err) {
      setError(err.message || 'Could not load trip details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip();
  }, [id]);

  const copyInviteCode = () => {
    if (!trip?.inviteCode) return;
    navigator.clipboard.writeText(trip.inviteCode);
    setCopied(true);
    toast.success('Invite Code Copied!', `Share code "${trip.inviteCode}" with your travel companions.`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleArchiveConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await tripService.archiveTrip(trip._id);
      if (res.success) {
        toast.info(res.status === 'archived' ? 'Trip Archived' : 'Trip Restored', res.message);
        setTrip((prev) => ({ ...prev, status: res.status }));
        setArchiveDialogOpen(false);
      }
    } catch (err) {
      toast.error('Action Failed', err.message || 'Could not archive trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await tripService.deleteTrip(trip._id);
      if (res.success) {
        toast.success('Trip Deleted', `"${trip.title}" and its expenses were permanently deleted.`);
        setDeleteDialogOpen(false);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error('Deletion Failed', err.message || 'Could not delete trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMemberConfirm = async () => {
    if (!memberToRemove) return;
    setActionLoading(true);
    try {
      const res = await tripService.removeMember(trip._id, memberToRemove._id);
      if (res.success) {
        toast.info('Member Removed', `${memberToRemove.name || 'Member'} has been removed.`);
        setTrip((prev) => ({
          ...prev,
          members: prev.members.filter((m) => m.user?._id !== memberToRemove._id),
        }));
        setRemoveMemberDialogOpen(false);
        setMemberToRemove(null);
      }
    } catch (err) {
      toast.error('Could Not Remove', err.message || 'Failed to remove member.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      const res = await tripService.updateMemberRole(trip._id, userId, role);
      if (res.success) {
        toast.success('Role Updated', `Member role changed to ${role}.`);
        setTrip((prev) => ({
          ...prev,
          members: prev.members.map((m) =>
            m.user?._id === userId ? { ...m, role } : m
          ),
        }));
      }
    } catch (err) {
      toast.error('Role Update Failed', err.message || 'Could not update role.');
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    try {
      const res = await tripService.revokeInvitation(trip._id, invitationId);
      if (res.success) {
        toast.info('Invitation Revoked', 'The pending invite was revoked.');
        setInvitations((prev) => prev.filter((i) => i._id !== invitationId));
      }
    } catch (err) {
      toast.error('Revoke Failed', err.message || 'Could not revoke invitation.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 rounded-3xl bg-ivory-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-ivory-300 max-w-md mx-auto my-12 space-y-4 shadow-soft">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-charcoal-900 font-display">Trip Not Accessible</h3>
        <p className="text-xs text-charcoal-500">{error || 'You do not have permission to view this trip.'}</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const members = trip.members || [];
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const statusVariants = {
    planning: 'forest',
    confirmed: 'success',
    ongoing: 'terracotta',
    completed: 'neutral',
    archived: 'danger',
  };

  return (
    <div className="space-y-8">
      
      {/* Top Header Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 hover:text-forest-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Edit Trip
            </Button>
          )}

          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setArchiveDialogOpen(true)}
              leftIcon={<Archive className="w-3.5 h-3.5 text-amber-600" />}
            >
              {trip.status === 'archived' ? 'Unarchive' : 'Archive'}
            </Button>
          )}

          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => setDeleteDialogOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
            >
              Delete Trip
            </Button>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-charcoal-900 text-white overflow-hidden shadow-soft-xl border border-ivory-300">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img
            src={trip.coverImage || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80'}
            alt={trip.title}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/40 to-transparent" />

          {/* Badges on top */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariants[trip.status] || 'forest'} size="md" withDot>
                {trip.status.toUpperCase()}
              </Badge>
              <span className="text-xs font-mono font-bold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-white/10 shadow-soft-sm">
                {formatCurrency(trip.budget || 0, trip.currency)} Target Budget
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={copyInviteCode}
                leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : `Invite Code: ${trip.inviteCode || '...'}`}
              </Button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <p className="text-xs sm:text-sm font-semibold text-terracotta-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {trip.destination}
            </p>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display">
              {trip.title}
            </h1>
            <p className="text-xs sm:text-sm text-ivory-200/80 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'Date TBD'} - {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'Date TBD'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {members.length} {members.length === 1 ? 'Traveler' : 'Companions'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Details, Members & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Itinerary & Expenses */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section Tab Switcher */}
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-ivory-200/70 border border-ivory-300 w-full sm:w-fit overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('itinerary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'itinerary'
                  ? 'bg-white text-forest-900 shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Compass className="w-4 h-4 text-forest-600" />
              <span>Daily Itinerary</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'map'
                  ? 'bg-white text-forest-900 shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Map className="w-4 h-4 text-forest-600" />
              <span>Map View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'expenses'
                  ? 'bg-white text-forest-900 shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Receipt className="w-4 h-4 text-terracotta-600" />
              <span>Expenses & Budget ({expenses.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'analytics'
                  ? 'bg-white text-forest-900 shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Budget Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('packing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'packing'
                  ? 'bg-white text-forest-900 shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Luggage className="w-4 h-4 text-purple-600" />
              <span>Packing Checklist</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'activity'
                  ? 'bg-white text-forest-900 shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Activity Log</span>
            </button>
          </div>

          {/* Trip Description Note */}
          {trip.description && (
            <Card variant="default" className="p-5 shadow-soft border border-ivory-200">
              <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-1">
                Trip Objectives & Notes
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">{trip.description}</p>
            </Card>
          )}

          {/* Tab 1: Itinerary Planner */}
          {activeTab === 'itinerary' && (
            <ItineraryPlanner
              trip={trip}
              canEdit={canEdit}
              items={itineraryItems}
              onItemsChange={setItineraryItems}
              onSwitchToMap={() => setActiveTab('map')}
            />
          )}

          {/* Tab 2: Map View */}
          {activeTab === 'map' && (
            <TripMapView
              trip={trip}
              items={itineraryItems}
              onSwitchToList={() => setActiveTab('itinerary')}
            />
          )}

          {/* Tab 3: Group Expenses & Debt Tally */}
          {activeTab === 'expenses' && (
            <ExpenseManager
              trip={trip}
              members={members}
              canEdit={canEdit}
            />
          )}

          {/* Tab 4: Budget Analytics */}
          {activeTab === 'analytics' && (
            <BudgetAnalytics
              trip={trip}
              members={members}
              canEdit={canEdit}
            />
          )}

          {/* Tab 5: Packing Checklist */}
          {activeTab === 'packing' && (
            <PackingChecklist
              trip={trip}
              members={members}
              canEdit={canEdit}
            />
          )}

          {/* Tab 6: Activity Feed */}
          {activeTab === 'activity' && (
            <TripActivityFeed
              trip={trip}
            />
          )}

        </div>

        {/* Right Column: Companions & Invite Box */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Invite Companions Box */}
          <Card variant="forest" className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-terracotta-400" />
              <h3 className="text-base font-bold text-white font-display">Invite Companions</h3>
            </div>
            <p className="text-xs text-forest-200 leading-relaxed">
              Anyone with this invite code can join your board and collaborate in real-time.
            </p>
            <div className="p-3 rounded-xl bg-forest-950 border border-forest-800 flex items-center justify-between">
              <span className="font-mono font-bold text-sm tracking-widest text-ivory-50">
                {trip.inviteCode || '...'}
              </span>
              <Button variant="accent" size="sm" onClick={copyInviteCode}>
                Copy
              </Button>
            </div>
          </Card>

          {/* Member Roster */}
          <Card variant="default" className="shadow-soft">
            <CardHeader className="border-b border-ivory-200 flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-display">Travel Companions ({members.length})</CardTitle>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInviteModalOpen(true)}
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Invite
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Accepted Companions */}
              <div className="space-y-2.5">
                {members.map((m, idx) => {
                  const memUser = m.user || {};
                  const isMemberOwner = trip.owner && (trip.owner._id === memUser._id || trip.owner === memUser._id);
                  const initials = memUser.name ? memUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'C';

                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-ivory-50/70 border border-ivory-200 hover:border-ivory-300 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-forest-600 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {memUser.avatar ? (
                            <img src={memUser.avatar} alt={memUser.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-charcoal-900 truncate">
                            {memUser.name || 'Friend'} {user?._id === memUser._id && <span className="text-[10px] text-forest-700 font-semibold">(You)</span>}
                          </p>
                          <p className="text-[10px] text-charcoal-400 font-mono truncate">{memUser.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isMemberOwner ? (
                          <Badge variant="terracotta" size="sm">Owner</Badge>
                        ) : isOwner ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={m.role || 'editor'}
                              onChange={(e) => handleUpdateRole(memUser._id, e.target.value)}
                              className="text-[11px] font-semibold bg-white border border-ivory-300 rounded-lg px-2 py-0.5 text-forest-900 outline-none hover:border-forest-500 capitalize"
                            >
                              <option value="organizer">Organizer</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                setMemberToRemove(memUser);
                                setRemoveMemberDialogOpen(true);
                              }}
                              className="p-1 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove Companion"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Badge variant="forest" size="sm" className="capitalize">
                            {m.role || 'Member'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pending Invitations Section (for editors/owners) */}
              {canEdit && invitations.filter((inv) => inv.status === 'pending').length > 0 && (
                <div className="pt-3 border-t border-ivory-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Pending Invitations ({invitations.filter((inv) => inv.status === 'pending').length})
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {invitations
                      .filter((inv) => inv.status === 'pending')
                      .map((inv) => (
                        <div
                          key={inv._id}
                          className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-charcoal-900 truncate text-[11px]">{inv.email}</p>
                            <p className="text-[10px] text-charcoal-500 capitalize">
                              Role: {inv.role} • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                            onClick={() => handleRevokeInvitation(inv._id)}
                          >
                            Revoke
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

        </div>

      </div>

      {/* Edit Trip Modal */}
      {trip && (
        <EditTripModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          trip={trip}
          onTripUpdated={(updatedTrip) => {
            setTrip(updatedTrip);
          }}
        />
      )}

      {/* Invite Member Modal */}
      {trip && (
        <InviteMemberModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          trip={trip}
          onMemberInvited={(newInvitation) => {
            setInvitations((prev) => [newInvitation, ...prev]);
          }}
        />
      )}

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        isOpen={removeMemberDialogOpen}
        onClose={() => {
          setRemoveMemberDialogOpen(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleRemoveMemberConfirm}
        isLoading={actionLoading}
        title="Remove Companion?"
        description={`Are you sure you want to remove ${memberToRemove?.name || 'this member'} from "${trip.title}"? They will lose access to the itinerary and group expenses.`}
        confirmText="Yes, Remove"
        variant="danger"
        icon={X}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        onConfirm={handleArchiveConfirm}
        isLoading={actionLoading}
        title={trip.status === 'archived' ? 'Unarchive Trip' : 'Archive Trip'}
        description={
          trip.status === 'archived'
            ? 'This trip will be restored to your active planning dashboard.'
            : 'Archiving hides this trip from active views. You can restore it anytime.'
        }
        confirmText={trip.status === 'archived' ? 'Restore Trip' : 'Archive'}
        variant="primary"
        icon={Archive}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        isLoading={actionLoading}
        title="Permanently Delete Trip?"
        description={`Are you sure you want to delete "${trip.title}"? All logged receipts, tallies, and member records will be permanently removed. This action cannot be undone.`}
        confirmText="Yes, Delete Trip"
        variant="danger"
        icon={Trash2}
      />

    </div>
  );
}

export default TripDetailsPage;
