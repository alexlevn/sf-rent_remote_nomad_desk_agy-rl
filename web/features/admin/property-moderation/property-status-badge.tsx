import React from 'react';
import type { PropertyStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border';

const STATUS_STYLES: Record<PropertyStatus, { label: string; className: string }> = {
  published: { label: 'Published', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending_review: { label: 'Pending Review', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  hidden: { label: 'Hidden', className: 'bg-neutral-200 text-neutral-800 border-neutral-300' },
  draft: { label: 'Draft', className: 'bg-neutral-100 text-neutral-600 border-neutral-300' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
};

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  const style = STATUS_STYLES[status];
  if (!style) {
    return <span className={cn(BASE, 'bg-neutral-100 text-neutral-700 border-neutral-200')}>{status}</span>;
  }
  return <span className={cn(BASE, style.className)}>{style.label}</span>;
}
