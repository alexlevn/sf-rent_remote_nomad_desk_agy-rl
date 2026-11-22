'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, MapPin, Sparkles } from 'lucide-react';
import type { Location } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LIST_HEAD_ROW_CLASS } from '@/features/admin/content/content-list-parts';

export const TOP_CITY_LIMIT = 8;

const ORDER_BTN_CLASS =
  'p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer';
const ICON_BTN_CLASS =
  'p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors';

export function isTopCity(loc: Location): boolean {
  return loc.position != null && loc.position <= TOP_CITY_LIMIT;
}

interface LocationsTableProps {
  locations: Location[];
  topCities: Location[];
  onReorderTopCity: (locId: number, direction: -1 | 1) => void;
  onToggleActive: (loc: Location) => void;
  onEdit: (loc: Location) => void;
}

export function LocationsTable({ locations, topCities, onReorderTopCity, onToggleActive, onEdit }: LocationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className={LIST_HEAD_ROW_CLASS}>
            <th className="py-3 px-4">City</th>
            <th className="py-3 px-4">Country</th>
            <th className="py-3 px-4">Continent</th>
            <th className="py-3 px-4">Properties</th>
            <th className="py-3 px-4">Top Cities Order</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-light)]">
          {locations.map((loc) => {
            const isHidden = loc.isActive === false;
            const label = loc.name || loc.city;

            return (
              <tr
                key={loc.id}
                data-testid={`location-row-${loc.id}`}
                className={cn('hover:bg-neutral-50/50 transition-colors', isHidden ? 'opacity-60 bg-neutral-50/30' : '')}
              >
                <td className="py-3.5 px-4 font-semibold text-[var(--color-text-on-light)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                    <span>{label}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-normal pl-5 block">
                    /c/furnished-apartments-{loc.slug}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-neutral-600">
                  {loc.country} ({loc.countryCode})
                </td>
                <td className="py-3.5 px-4 text-neutral-600">{loc.continent}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-800">
                    {loc.propertiesCount}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  {isTopCity(loc) ? (
                    <div className="inline-flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Sparkles className="w-3 h-3 text-amber-600" />#{loc.position}
                      </span>
                      {topCities.length > 1 && (
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={topCities[0]?.id === loc.id}
                            onClick={() => onReorderTopCity(loc.id, -1)}
                            aria-label={`Move ${label} up in Top Cities`}
                            className={ORDER_BTN_CLASS}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={topCities[topCities.length - 1]?.id === loc.id}
                            onClick={() => onReorderTopCity(loc.id, 1)}
                            aria-label={`Move ${label} down in Top Cities`}
                            className={ORDER_BTN_CLASS}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-400 text-xs">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {isHidden ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                      Hidden
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {!isHidden && (
                      <Link
                        href={`/c/furnished-apartments-${loc.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on Web"
                        aria-label={`View ${label} on web`}
                        data-testid={`view-location-${loc.slug}`}
                        className={ICON_BTN_CLASS}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleActive(loc)}
                      title={isHidden ? 'Show destination' : 'Hide destination'}
                      aria-label={isHidden ? `Show ${label}` : `Hide ${label}`}
                      data-testid={`toggle-active-${loc.slug}`}
                      className={cn(ICON_BTN_CLASS, 'cursor-pointer')}
                    >
                      {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(loc)}
                      data-testid={`edit-location-${loc.slug}`}
                      className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-xs font-medium text-[var(--color-text-on-light)] hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      Edit City
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
