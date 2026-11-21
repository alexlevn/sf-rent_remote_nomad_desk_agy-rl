import React from 'react';
import type { PropertyStatus } from '@/lib/types';

interface ListingStatusBadgeProps {
  status: PropertyStatus;
  className?: string;
}

export function ListingStatusBadge({ status, className = '' }: ListingStatusBadgeProps) {
  switch (status) {
    case 'published':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          Published
        </span>
      );
    case 'pending_review':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
        >
          Pending review
        </span>
      );
    case 'draft':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 ${className}`}
        >
          Draft
        </span>
      );
    case 'rejected':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
        >
          Rejected
        </span>
      );
    case 'hidden':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 ${className}`}
        >
          Hidden
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 ${className}`}
        >
          {status}
        </span>
      );
  }
}

interface BookingModeBadgeProps {
  isDirectBooking: boolean;
  className?: string;
}

export function BookingModeBadge({ isDirectBooking, className = '' }: BookingModeBadgeProps) {
  if (isDirectBooking) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
      >
        Instant
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 ${className}`}
    >
      Request
    </span>
  );
}
