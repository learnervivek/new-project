import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Compass,
  Receipt,
  CheckSquare,
  Users,
  UserPlus,
  RefreshCw,
  Clock,
  ArrowRight,
  HandCoins,
  MapPin,
  Filter,
} from 'lucide-react';
import tripService from '../../services/tripService';
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { cn, formatCurrency } from '../../lib/utils';

const entityMeta = {
  itinerary: {
    label: 'Itinerary',
    icon: Compass,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    dotColor: 'bg-blue-600',
  },
  expense: {
    label: 'Expenses',
    icon: Receipt,
    color: 'text-terracotta-600 bg-terracotta-50 border-terracotta-200',
    dotColor: 'bg-terracotta-600',
  },
  settlement: {
    label: 'Settlements',
    icon: HandCoins,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    dotColor: 'bg-emerald-600',
  },
  packing: {
    label: 'Packing',
    icon: CheckSquare,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    dotColor: 'bg-purple-600',
  },
  member: {
    label: 'Companions',
    icon: Users,
    color: 'text-forest-600 bg-forest-50 border-forest-200',
    dotColor: 'bg-forest-600',
  },
  trip: {
    label: 'Trip Details',
    icon: MapPin,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-600',
  },
};

/**
 * Format relative timestamp nicely (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
 */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function TripActivityFeed({ trip }) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  });

  const loadActivities = async (page = 1, append = false, isSilent = false) => {
    if (page === 1 && !isSilent) setLoading(true);
    if (page === 1 && isSilent) setRefreshing(true);
    if (page > 1) setLoadingMore(true);

    try {
      const params = {
        page,
        limit: 20,
      };
      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      const res = await tripService.getTripActivities(trip._id, params);
      if (res.success) {
        if (append) {
          setActivities((prev) => [...prev, ...(res.activities || [])]);
        } else {
          setActivities(res.activities || []);
        }
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load activity feed:', err);
      toast.error('Feed Error', err.message || 'Could not load activity feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (trip?._id) {
      loadActivities(1, false);
    }
  }, [trip?._id, selectedType]);

  const handleLoadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      loadActivities(pagination.page + 1, true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading trip activity feed">
        <Card className="p-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </Card>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const filterTabs = [
    { id: 'all', label: 'All Activities' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'expense', label: 'Expenses' },
    { id: 'packing', label: 'Packing' },
    { id: 'member', label: 'Companions' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="default" className="shadow-soft border border-ivory-200">
        <CardHeader className="border-b border-ivory-200/80 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-forest-700" />
              <CardTitle className="text-lg font-display">Trip Activity Log</CardTitle>
            </div>
            <CardDescription>
              Chronological history of collaboration updates, itinerary edits, expenses, and packing changes.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadActivities(1, false, true)}
              disabled={refreshing}
              aria-label="Refresh activity feed"
              className="text-charcoal-600 hover:text-charcoal-900"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin text-forest-600')} />
            </Button>
          </div>
        </CardHeader>

        {/* Filter Chips Bar */}
        <div className="px-6 py-3 bg-ivory-50/70 border-b border-ivory-200/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedType(tab.id)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0',
                selectedType === tab.id
                  ? 'bg-forest-900 text-white border-forest-900 shadow-soft-sm'
                  : 'bg-white text-charcoal-600 border-ivory-300 hover:border-forest-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline Content */}
        <CardContent className="p-6">
          {activities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Activity Logged Yet"
              description="Actions taken across itineraries, expenses, companion invites, and packing will appear here in chronological order."
              className="py-12"
            />
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-ivory-300/80">
              {activities.map((act) => {
                const meta = entityMeta[act.entityType] || entityMeta.trip;
                const IconComponent = meta.icon;
                const actorName = act.actor?.name || 'A traveler';
                const initials = actorName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div key={act._id} className="relative flex items-start gap-3.5 group">
                    {/* Timeline Node Dot */}
                    <div
                      className={cn(
                        'absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white shadow-soft-sm',
                        meta.dotColor
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>

                    {/* Actor Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {act.actor?.avatar ? (
                        <img
                          src={act.actor.avatar}
                          alt={actorName}
                          className="w-8 h-8 rounded-full object-cover border border-ivory-300"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-800 text-xs font-bold flex items-center justify-center border border-forest-200">
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Content Box */}
                    <div className="flex-1 min-w-0 bg-white p-3.5 rounded-xl border border-ivory-200 group-hover:border-ivory-300 shadow-soft-sm transition-all space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-charcoal-900">
                            {actorName}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1',
                              meta.color
                            )}
                          >
                            <IconComponent className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </div>

                        <span
                          className="text-[11px] text-charcoal-400 font-mono flex items-center gap-1"
                          title={new Date(act.createdAt).toLocaleString()}
                        >
                          <Clock className="w-3 h-3 text-charcoal-300" />
                          {formatRelativeTime(act.createdAt)}
                        </span>
                      </div>

                      {/* Summary Message */}
                      <p className="text-xs text-charcoal-700 leading-relaxed font-medium">
                        {act.summary}
                      </p>

                      {/* Safe Metadata Preview */}
                      {act.metadata && (act.metadata.category || act.metadata.amountMajor) && (
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-charcoal-500 font-mono">
                          {act.metadata.category && (
                            <span className="capitalize bg-ivory-100 px-1.5 py-0.5 rounded">
                              {act.metadata.category}
                            </span>
                          )}
                          {act.metadata.amountMajor && (
                            <span className="font-semibold text-charcoal-800">
                              {formatCurrency(act.metadata.amountMajor, act.metadata.currency || 'INR')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="pt-6 text-center border-t border-ivory-200/70 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                isLoading={loadingMore}
                className="text-xs"
              >
                Load Older Activities
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TripActivityFeed;
