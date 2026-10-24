import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Calendar,
  Compass,
  MapPin,
  Users,
  IndianRupee,
  Receipt,
  Plus,
  ArrowRight,
  Sparkles,
  Plane,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Mail
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton, { TripCardSkeleton, StatSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import tripService from '../services/tripService';
import CreateTripModal from '../components/trips/CreateTripModal';
import { formatCurrency } from '../lib/utils';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tripService.getDashboardData();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError('Failed to load dashboard metrics.');
      }
    } catch (err) {
      setError(err.message || 'Could not connect to TripTally backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const summary = data?.summary || {
    totalTrips: 0,
    upcomingCount: 0,
    ongoingCount: 0,
    totalBudget: 0,
    totalSpent: 0,
    expenseCount: 0,
    pendingSettlementsCount: 0,
  };

  const upcomingTrips = data?.upcomingTrips || [];
  const recentExpenses = data?.recentExpenses || [];

  // Filter trips by search term
  const filteredTrips = upcomingTrips.filter((t) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.title.toLowerCase().includes(term) ||
      t.destination.toLowerCase().includes(term)
    );
  });

  const triggerCreateTrip = () => {
    if (outletContext?.openCreateTrip) {
      outletContext.openCreateTrip();
    } else {
      setCreateModalOpen(true);
    }
  };

  const formatDateRange = (start, end) => {
    if (!start) return 'Flexible travel dates';
    const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!end) return `${s} onwards`;
    const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${s} - ${e}`;
  };

  const statusVariants = {
    planning: 'forest',
    confirmed: 'success',
    ongoing: 'terracotta',
    completed: 'neutral',
  };

  return (
    <div className="space-y-10">
      
      {/* 1. Welcome Section & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ivory-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-400">
              Trip Command Center
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-forest-600" />
            <span className="text-xs text-charcoal-500 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 font-display tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Traveler'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
            Here is your group travel overview, upcoming schedules, and shared expenses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Link to="/ai-trip-planner">
            <Button
              variant="accent"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Plan with AI
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={triggerCreateTrip}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Trip
          </Button>
        </div>

      </div>

      {/* 2. Error Recovery State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3 text-xs text-rose-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      )}

      {/* 3. Summary Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Upcoming Trips */}
          <Card variant="default" className="p-5 shadow-soft hover:border-forest-400 transition-colors">
            <div className="flex items-center justify-between text-charcoal-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Trips</span>
              <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 font-display">
              {summary.upcomingCount}
            </p>
            <p className="text-[11px] text-charcoal-400 mt-1">
              {summary.totalTrips} total trips in your account
            </p>
          </Card>

          {/* Card 2: Ongoing Adventures */}
          <Card variant="default" className="p-5 shadow-soft hover:border-forest-400 transition-colors">
            <div className="flex items-center justify-between text-charcoal-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Ongoing Now</span>
              <div className="w-8 h-8 rounded-xl bg-terracotta-50 text-terracotta-600 flex items-center justify-center">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 font-display">
              {summary.ongoingCount}
            </p>
            <p className="text-[11px] text-charcoal-400 mt-1">
              Active itineraries this week
            </p>
          </Card>

          {/* Card 3: Planned Budget */}
          <Card variant="default" className="p-5 shadow-soft hover:border-forest-400 transition-colors">
            <div className="flex items-center justify-between text-charcoal-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Planned Budget</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-forest-800 font-display font-mono">
              {formatCurrency(summary.totalBudget)}
            </p>
            <p className="text-[11px] text-charcoal-400 mt-1">
              Combined group targets
            </p>
          </Card>

          {/* Card 4: Settlements / Tallies */}
          <Card variant="default" className="p-5 shadow-soft hover:border-forest-400 transition-colors">
            <div className="flex items-center justify-between text-charcoal-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Settlements</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 font-display">
              {summary.pendingSettlementsCount}
            </p>
            <p className="text-[11px] text-charcoal-400 mt-1">
              {summary.expenseCount} receipts tallied
            </p>
          </Card>
        </div>
      )}

      {/* Pending Invitations Status Banner */}
      {!loading && summary.pendingInvitationsCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-forest-800 to-forest-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-forest-700/80 border border-forest-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-terracotta-400" />
            </div>
            <div>
              <p className="text-sm font-bold font-display">
                You have {summary.pendingInvitationsCount} pending trip {summary.pendingInvitationsCount === 1 ? 'invitation' : 'invitations'}!
              </p>
              <p className="text-xs text-forest-200">
                Your travel companions are waiting for your response.
              </p>
            </div>
          </div>
          <Link to="/invitations">
            <Button variant="accent" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View Invitations
            </Button>
          </Link>
        </div>
      )}

      {/* 4. Upcoming Trips Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-charcoal-900 font-display flex items-center gap-2">
              <Compass className="w-5 h-5 text-forest-600" />
              Your Trips & Gatherings
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Select any trip to manage itineraries, view live balances, and invite friends.
            </p>
          </div>

          {/* Search Input */}
          {upcomingTrips.length > 0 && (
            <div className="w-full sm:w-64 relative">
              <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter trips..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white text-charcoal-900 text-xs rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 h-9 pl-8 pr-3 outline-none"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TripCardSkeleton />
            <TripCardSkeleton />
            <TripCardSkeleton />
          </div>
        ) : upcomingTrips.length === 0 ? (
          /* Empty State for New Users */
          <EmptyState
            icon={Compass}
            title="No collaborative trips yet"
            description="Start by creating your first trip board. You can invite friends with a single link, build day-by-day itineraries, and tally receipts together."
            actionLabel="Create Your First Trip"
            onAction={triggerCreateTrip}
          />
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-12 p-6 bg-white rounded-2xl border border-ivory-300 text-xs text-charcoal-500">
            No trips matching "{searchTerm}". Try clearing your search filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => {
              const memberList = trip.members || [];
              return (
                <Card
                  key={trip._id}
                  variant="interactive"
                  className="flex flex-col justify-between group"
                  onClick={() => navigate(`/trips/${trip._id}`)}
                >
                  <div>
                    {/* Cover photo */}
                    <div className="relative h-44 w-full bg-charcoal-900 overflow-hidden">
                      <img
                        src={trip.coverImage || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80'}
                        alt={trip.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80';
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/75 via-charcoal-950/20 to-transparent" />
                      
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <Badge variant={statusVariants[trip.status] || 'forest'} size="sm" withDot>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                          {formatCurrency(trip.budget || 0, trip.currency)}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="text-[11px] font-semibold text-terracotta-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {trip.destination}
                        </p>
                        <h3 className="text-base font-bold text-white font-display leading-tight truncate">
                          {trip.title}
                        </h3>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-charcoal-500">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-forest-600" />
                          {formatDateRange(trip.startDate, trip.endDate)}
                        </span>
                      </div>

                      {trip.description && (
                        <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
                          {trip.description}
                        </p>
                      )}
                    </CardContent>
                  </div>

                  {/* Card Footer with Member Avatars */}
                  <CardFooter className="bg-ivory-50/40">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        {memberList.slice(0, 3).map((m, idx) => {
                          const memUser = m.user || {};
                          const initials = memUser.name
                            ? memUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                            : 'C';
                          return (
                            <div
                              key={idx}
                              title={memUser.name || 'Companion'}
                              className="w-7 h-7 rounded-full bg-forest-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white overflow-hidden shadow-soft-sm"
                            >
                              {memUser.avatar ? (
                                <img src={memUser.avatar} alt={memUser.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-charcoal-400">
                        {memberList.length} {memberList.length === 1 ? 'traveler' : 'companions'}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-forest-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Board <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Recent Activity & Expense Summary */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-charcoal-900 font-display flex items-center gap-2">
            <Receipt className="w-5 h-5 text-forest-600" />
            Recent Group Activity & Expenses
          </h2>
          <Link to="/trips" className="text-xs font-semibold text-forest-700 hover:text-forest-900">
            View All Trips →
          </Link>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-ivory-300 text-xs text-charcoal-500 space-y-2">
            <Clock className="w-6 h-6 text-charcoal-400 mx-auto" />
            <p className="font-semibold text-charcoal-800">No expenses recorded yet</p>
            <p className="text-charcoal-400 max-w-sm mx-auto">
              Once you log receipts or settlements inside a trip, they will stream here in real time.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-ivory-300 divide-y divide-ivory-200 overflow-hidden shadow-soft">
            {recentExpenses.map((exp) => (
              <div key={exp._id} className="p-4 flex items-center justify-between gap-4 hover:bg-ivory-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0 border border-forest-100">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-charcoal-900 truncate">
                      {exp.title}
                    </p>
                    <p className="text-[11px] text-charcoal-400">
                      Paid by <strong className="text-charcoal-700">{exp.paidBy?.name || 'Companion'}</strong> in {exp.trip?.title || 'Trip'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-charcoal-900 block">
                    {formatCurrency((exp.amount || 0) / 100, exp.trip?.currency || 'INR')}
                  </span>
                  <span className="text-[10px] text-charcoal-400">
                    {new Date(exp.date || exp.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Standalone Create Trip Modal if opened directly */}
      <CreateTripModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTripCreated={(newTrip) => {
          fetchDashboard();
          navigate(`/trips/${newTrip._id}`);
        }}
      />

    </div>
  );
}

export default DashboardPage;
