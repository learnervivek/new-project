import React from 'react';
import {
  Camera,
  Utensils,
  Hotel,
  Car,
  Sparkles,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react';
import Badge from '../ui/Badge';

const categoryMeta = {
  sightseeing: {
    label: 'Sightseeing',
    icon: Camera,
    badgeVariant: 'neutral',
    colorClasses: 'bg-violet-50 text-violet-700 border-violet-200',
    iconBg: 'bg-violet-600',
  },
  restaurant: {
    label: 'Dining',
    icon: Utensils,
    badgeVariant: 'terracotta',
    colorClasses: 'bg-terracotta-50 text-terracotta-700 border-terracotta-200',
    iconBg: 'bg-terracotta-600',
  },
  accommodation: {
    label: 'Stay',
    icon: Hotel,
    badgeVariant: 'neutral',
    colorClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-600',
  },
  transportation: {
    label: 'Transit',
    icon: Car,
    badgeVariant: 'neutral',
    colorClasses: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-600',
  },
  activity: {
    label: 'Activity',
    icon: Sparkles,
    badgeVariant: 'forest',
    colorClasses: 'bg-forest-50 text-forest-700 border-forest-200',
    iconBg: 'bg-forest-600',
  },
};

import { formatCurrency } from '../../lib/utils';

export function ActivityCard({
  item,
  canEdit = false,
  isFirst = false,
  isLast = false,
  currency = 'INR',
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const meta = categoryMeta[item.category] || categoryMeta.activity;
  const CategoryIcon = meta.icon;

  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m || '00'} ${ampm}`;
  };

  const formattedTime = formatTime(item.startTime);

  return (
    <div className="relative pl-8 sm:pl-10 group transition-all">
      {/* Timeline vertical connector */}
      <div className="absolute left-3.5 sm:left-4 top-5 bottom-0 w-0.5 bg-ivory-300 group-last:hidden" />

      {/* Timeline circular node */}
      <div
        className={`absolute left-1.5 sm:left-2 top-3 w-5 h-5 rounded-full ${meta.iconBg} text-white flex items-center justify-center shadow-soft-sm ring-4 ring-white shrink-0`}
      >
        <CategoryIcon className="w-2.5 h-2.5" />
      </div>

      {/* Main Activity Card */}
      <div className="p-4 rounded-2xl bg-white border border-ivory-300 hover:border-ivory-400 hover:shadow-soft transition-all">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
          
          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Top row: Timing & Category Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${meta.colorClasses}`}>
                <CategoryIcon className="w-3 h-3" />
                {meta.label}
              </span>

              {formattedTime ? (
                <span className="text-[11px] font-mono font-semibold text-charcoal-700 flex items-center gap-1 bg-ivory-100 px-2 py-0.5 rounded-md">
                  <Clock className="w-3 h-3 text-forest-700" />
                  {formattedTime}
                  {item.duration ? ` • ${item.duration}m` : ''}
                </span>
              ) : item.duration ? (
                <span className="text-[11px] font-mono text-charcoal-500 bg-ivory-100 px-2 py-0.5 rounded-md">
                  {item.duration} mins
                </span>
              ) : null}

              {item.estimatedCost > 0 && (
                <span className="text-[11px] font-mono font-bold text-forest-800 bg-forest-50 border border-forest-200 px-2 py-0.5 rounded-md">
                  {formatCurrency(item.estimatedCost, currency)}
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="text-sm sm:text-base font-bold text-charcoal-900 font-display">
              {item.title}
            </h4>

            {/* Location */}
            {item.location && (
              <p className="text-xs text-charcoal-500 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-terracotta-500 shrink-0" />
                <span className="truncate">{item.location}</span>
              </p>
            )}

            {/* Notes */}
            {item.notes && (
              <p className="text-xs text-charcoal-600 bg-ivory-50/80 border border-ivory-200/80 p-2.5 rounded-xl leading-relaxed whitespace-pre-line">
                {item.notes}
              </p>
            )}
          </div>

          {/* Action buttons (Owner / Organizer / Editor) */}
          {canEdit && (
            <div className="flex items-center gap-1 shrink-0 self-end sm:self-start pt-1">
              {/* Reorder Up / Down */}
              <div className="flex items-center bg-ivory-100 rounded-lg p-0.5 border border-ivory-200">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={isFirst}
                  className="p-1 rounded text-charcoal-500 hover:text-forest-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-white transition-colors"
                  title="Move earlier"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={isLast}
                  className="p-1 rounded text-charcoal-500 hover:text-forest-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-white transition-colors"
                  title="Move later"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Edit */}
              <button
                type="button"
                onClick={onEdit}
                className="p-1.5 rounded-lg text-charcoal-400 hover:text-forest-700 hover:bg-forest-50 transition-colors"
                title="Edit activity"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete activity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default ActivityCard;
