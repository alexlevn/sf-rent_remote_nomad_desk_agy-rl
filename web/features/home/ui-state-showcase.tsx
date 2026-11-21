import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/content/site';

export function UIStateShowcase() {
  return (
    <section className="py-12 bg-white text-[var(--color-text-on-light)] border-t border-[var(--color-border-light)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#fcfaf7] border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8">
          <div className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-1">
            📋 UI States & Verification Blocks — Trang Chủ (Home)
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-6">
            These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Empty Filter State */}
            <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-4 flex flex-col justify-between">
              <div>
                <Badge variant="warning" className="mb-3 text-[11px]">
                  Empty Filter State
                </Badge>
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="font-semibold text-xs text-[var(--color-text-on-light)]">
                    No apartments match your search
                  </div>
                  <p className="text-[11px] text-[var(--color-text-on-light-muted)] mt-1">
                    Try loosening your bedroom filter or choosing a different city.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" pill className="w-full text-xs mt-2">
                Reset Filters
              </Button>
            </div>

            {/* 2. Skeleton Card Loading */}
            <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-4 flex flex-col justify-between">
              <div>
                <Badge variant="neutral" className="mb-3 text-[11px]">
                  Skeleton Card Loading
                </Badge>
                <div className="space-y-3 py-2 animate-pulse">
                  <div className="h-24 bg-neutral-200 rounded-lg w-full" />
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2" />
                </div>
              </div>
              <div className="text-[11px] text-[var(--color-text-on-light-muted)] pt-2 border-t border-neutral-100">
                Simulated async fetch state
              </div>
            </div>

            {/* 3. Date Warning Alert */}
            <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-4 flex flex-col justify-between">
              <div>
                <Badge variant="error" className="mb-3 text-[11px]">
                  Date Warning Alert
                </Badge>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                  <strong className="block font-semibold mb-1">Minimum 30 Nights Required</strong>
                  NomadDesk caters to monthly stays. Please select at least 30 consecutive nights.
                </div>
              </div>
              <div className="text-[11px] text-red-600 font-medium pt-2">
                Booking validation guard
              </div>
            </div>

            {/* 4. Authenticated Guest Pill */}
            <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-4 flex flex-col justify-between">
              <div>
                <Badge variant="accent" className="mb-3 text-[11px]">
                  Authenticated Guest Pill
                </Badge>
                <div className="flex items-center gap-3 p-3 border border-[var(--color-border-light)] rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    JD
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">John Nomad</div>
                    <Link
                      href={SITE_CONFIG.links.guestDashboard}
                      className="text-[11px] text-[var(--color-brand)] hover:underline truncate block"
                    >
                      View Dashboard →
                    </Link>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[var(--color-text-on-light-muted)] pt-2 border-t border-neutral-100">
                Session badge simulation
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
