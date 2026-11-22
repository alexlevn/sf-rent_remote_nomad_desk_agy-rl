'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, Edit, Monitor, X } from 'lucide-react';
import type { Property } from '@/lib/types';
import { stripHtmlTags } from '@/lib/validations/content';
import { cn } from '@/lib/utils';
import { PropertyStatusBadge } from './property-status-badge';
import type { ModerationActions } from './moderation-actions';

const FOOTER_BTN =
  'inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50';

function Stat({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div>
      <span className="text-neutral-400 block">{label}</span>
      <span className={cn('font-bold text-sm text-[var(--color-text-on-light)]', valueClassName)}>{value}</span>
    </div>
  );
}

interface PropertyInspectModalProps {
  property: Property;
  hostName: string;
  actions: ModerationActions;
  onClose: () => void;
}

export function PropertyInspectModal({ property, hostName, actions, onClose }: PropertyInspectModalProps) {
  const { isSubmitting } = actions;
  const ws = property.workstation;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Inspect ${property.title}`}
        className="w-full max-w-2xl bg-white max-h-[90vh] rounded-2xl shadow-2xl p-6 overflow-y-auto border border-[var(--color-border-light)] space-y-6"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-border-light)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PropertyStatusBadge status={property.status} />
              <span className="text-xs text-neutral-400">{property.reference}</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text-on-light)]">{property.title}</h3>
            <div className="text-sm text-[var(--color-text-on-light-muted)]">
              {property.neighborhood}, {property.city}, {property.country} · Host: {hostName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspection modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {property.images && property.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {property.images.slice(0, 3).map((img, idx) => (
              <div key={idx} className="relative h-28 rounded-lg overflow-hidden bg-neutral-100">
                <Image src={img} alt={`Photo ${idx + 1}`} fill unoptimized className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="p-4 rounded-xl bg-neutral-50 border border-[var(--color-border-light)] space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-[var(--color-text-on-light)]">
            <Monitor className="w-4 h-4 text-[var(--color-brand)]" />
            <span>Verified Remote Workstation Specs</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-neutral-400 block">Desk:</span>
              <strong className="text-[var(--color-text-on-light)]">{ws?.desk || 'Standard'}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block">Chair:</span>
              <strong className="text-[var(--color-text-on-light)]">{ws?.chair || 'Standard'}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block">Monitor:</span>
              <strong className="text-[var(--color-text-on-light)]">{ws?.monitors || 'Single Screen'}</strong>
            </div>
            <div>
              <span className="text-neutral-500 block">Verified Wi-Fi:</span>
              <strong className="text-emerald-600">{ws?.wifiSpeed ? `${ws.wifiSpeed} Mbps` : 'Not verified'}</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-neutral-50 rounded-xl text-center text-xs">
          <Stat label="Monthly Rent" value={`$${Math.round(property.pricePerMonth / 100).toLocaleString()}`} />
          <Stat label="Bedrooms / Baths" value={`${property.bedrooms} BR / ${property.bathrooms} BA`} />
          <Stat label="Total Surface" value={`${property.totalSurface} m²`} />
          <Stat
            label="Booking Type"
            value={property.isDirectBooking ? 'Instant Book' : 'Request to Book'}
            valueClassName="text-[var(--color-brand)]"
          />
        </div>

        <div className="text-sm space-y-1">
          <span className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-on-light-muted)]">
            Description
          </span>
          <p className="text-neutral-700 leading-relaxed text-xs">
            {property.description ? stripHtmlTags(property.description) : 'No detailed description provided.'}
          </p>
        </div>

        {property.rejectionReason && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Rejection Reason:
            </div>
            <p>{property.rejectionReason}</p>
          </div>
        )}

        <div className="pt-4 border-t border-[var(--color-border-light)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link
              href={`/admin/properties/${property.id}/edit`}
              className="inline-flex min-h-10 sm:min-h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Full Form
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(FOOTER_BTN, 'border border-[var(--color-border-light)] bg-white text-neutral-700 hover:bg-neutral-50')}
            >
              Close
            </button>

            {property.status === 'pending_review' && (
              <>
                <button
                  type="button"
                  onClick={() => actions.onStartReject(property)}
                  disabled={isSubmitting}
                  className={cn(FOOTER_BTN, 'border border-red-200 bg-white text-red-600 hover:bg-red-50')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => actions.onApprove(property)}
                  disabled={isSubmitting}
                  className={cn(FOOTER_BTN, 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                >
                  Approve & Publish
                </button>
              </>
            )}

            {property.status === 'published' && (
              <button
                type="button"
                onClick={() => actions.onHide(property)}
                disabled={isSubmitting}
                className={cn(FOOTER_BTN, 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50')}
              >
                Hide Listing
              </button>
            )}

            {property.status === 'hidden' && (
              <button
                type="button"
                onClick={() => actions.onPublish(property)}
                disabled={isSubmitting}
                className={cn(FOOTER_BTN, 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white')}
              >
                Republish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
