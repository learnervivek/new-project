import React from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-ivory-200/90',
        className
      )}
      {...props}
    />
  );
}

export function TripCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-ivory-300/80 p-5 shadow-soft space-y-4">
      {/* Image Skeleton */}
      <Skeleton className="h-44 w-full rounded-xl" />
      
      {/* Title & Badge */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Dates & Location */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>

      {/* Footer / Members */}
      <div className="pt-4 border-t border-ivory-200 flex items-center justify-between">
        <div className="flex -space-x-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }) {
  return (
    <div className="flex items-center gap-4 py-3.5 px-4 border-b border-ivory-200">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/6 ml-auto" />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-ivory-300/80 p-5 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export default Skeleton;
