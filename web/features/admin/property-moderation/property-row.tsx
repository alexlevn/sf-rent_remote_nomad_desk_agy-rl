'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Edit, ExternalLink, MapPin, Trash2, Wifi } from 'lucide-react';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PropertyStatusBadge } from './property-status-badge';
import type { ModerationActions } from './moderation-actions';

const PILL_BTN = 'inline-flex items-center justify-center rounded-lg text-xs font-semibold px-2.5 py-1.5 transition-colors cursor-pointer disabled:opacity-50';
const ICON_LINK = 'p-1.5 text-neutral-500 hover:text-neutral-800 rounded-md hover:bg-neutral-100';
const FALLBACK_IMAGE = '/seed/property/prop-madrid-1.webp';

interface PropertyRowProps {
  property: Property;
  hostName: string;
  actions: ModerationActions;
}

export function PropertyRow({ property, hostName, actions }: PropertyRowProps) {
  const { isSubmitting } = actions;
  const monthlyUSD = Math.round(property.pricePerMonth / 100);
  const firstImage = property.images?.[0] || FALLBACK_IMAGE;

  return (
    <tr className="hover:bg-neutral-50/70 transition-colors">
      <td className="px-6 py-4 max-w-md">
        <div className="flex items-start gap-3">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
            <Image src={firstImage} alt={property.title} fill unoptimized className="object-cover" />
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => actions.onInspect(property)}
              className="font-semibold text-[var(--color-text-on-light)] hover:text-[var(--color-brand)] text-left line-clamp-1"
            >
              {property.title}
            </button>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
              <span>{property.reference}</span>
              <span>·</span>
              <span>{property.bedrooms} BR</span>
              <span>·</span>
              <span>{property.totalSurface} m²</span>
              {Boolean(property.workstation?.wifiSpeed) && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                    <Wifi className="w-3 h-3" />
                    {property.workstation?.wifiSpeed} Mbps
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 text-[var(--color-text-on-light-muted)] whitespace-nowrap">
        <div className="font-medium text-[var(--color-text-on-light)]">{hostName}</div>
        <div className="text-xs text-neutral-400">Host #{property.hostId}</div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-1 text-[var(--color-text-on-light)]">
          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span>{property.city}</span>
        </div>
        {property.neighborhood && (
          <div className="text-xs text-[var(--color-text-on-light-muted)] pl-4">{property.neighborhood}</div>
        )}
      </td>

      <td className="px-6 py-4 font-bold text-[var(--color-text-on-light)] whitespace-nowrap">
        ${monthlyUSD.toLocaleString()}
        <span className="text-xs font-normal text-neutral-400">/mo</span>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <PropertyStatusBadge status={property.status} />
      </td>

      <td className="px-6 py-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => actions.onInspect(property)}
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-white text-neutral-700 hover:bg-neutral-50 text-xs font-semibold px-2.5 py-1.5 transition-colors cursor-pointer"
            title="Inspect listing details"
          >
            Inspect
          </button>

          {property.status === 'pending_review' && (
            <>
              <button
                type="button"
                onClick={() => actions.onApprove(property)}
                disabled={isSubmitting}
                className={cn(PILL_BTN, 'bg-emerald-600 hover:bg-emerald-700 text-white')}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => actions.onStartReject(property)}
                disabled={isSubmitting}
                className={cn(PILL_BTN, 'border border-red-200 bg-white text-red-600 hover:bg-red-50')}
              >
                Reject
              </button>
            </>
          )}

          {property.status === 'published' && (
            <>
              <Link
                href={`/l/apartments/${property.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${property.title} on public site`}
                className={ICON_LINK}
                title="View public page"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => actions.onHide(property)}
                disabled={isSubmitting}
                className={cn(PILL_BTN, 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50')}
                title="Hide listing from public search"
              >
                Hide
              </button>
            </>
          )}

          {property.status === 'hidden' && (
            <button
              type="button"
              onClick={() => actions.onPublish(property)}
              disabled={isSubmitting}
              className={cn(PILL_BTN, 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white')}
              title="Publish listing"
            >
              Publish
            </button>
          )}

          <Link
            href={`/admin/properties/${property.id}/edit`}
            aria-label={`Edit ${property.title}`}
            className={ICON_LINK}
            title="Edit listing details"
          >
            <Edit className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => actions.onDelete(property)}
            disabled={isSubmitting}
            aria-label={`Delete ${property.title}`}
            className="p-1.5 text-neutral-500 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer disabled:opacity-50"
            title="Delete listing"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
