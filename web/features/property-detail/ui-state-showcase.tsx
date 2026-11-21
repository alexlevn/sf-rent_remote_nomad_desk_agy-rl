import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function UIStateShowcase() {
  return (
    <section className="mt-16 mb-12">
      <div className="bg-[#fcfaf7] border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8">
        <div className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-1">
          📋 UI States & Verification Blocks — Chi Tiết Căn Hộ (/l/apartments/:slug)
        </div>
        <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-6">
          These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Date Unavailable Alert */}
          <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-5 flex flex-col justify-between shadow-xs">
            <div>
              <Badge variant="error" className="mb-3">
                Date Unavailable Alert
              </Badge>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <strong className="block font-semibold mb-1">Dates Already Booked</strong>
                This residence is occupied from Dec 15 to Jan 15. Please choose alternative dates.
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-on-light-muted)] mt-4 pt-2 border-t border-neutral-100">
              Triggered when selected dates collide with confirmed bookings.
            </div>
          </div>

          {/* 2. Request to Book Mode */}
          <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-5 flex flex-col justify-between shadow-xs">
            <div>
              <Badge variant="warning" className="mb-3">
                Request to Book Mode (CTA: &quot;Request to book&quot;)
              </Badge>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <strong className="block font-semibold mb-1">Host Approval Required</strong>
                The host will review and confirm your profile within 48 hours. No charge until accepted.
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-on-light-muted)] mt-4 pt-2 border-t border-neutral-100">
              Applied for standard non-instant verified residences.
            </div>
          </div>

          {/* 3. Instant Book Mode */}
          <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-5 flex flex-col justify-between shadow-xs">
            <div>
              <Badge variant="success" className="mb-3">
                Instant Book Mode
              </Badge>
              <div className="p-4 bg-white border border-[var(--color-border-light)] rounded-xl">
                <div className="flex justify-between font-bold text-sm mb-3">
                  <span>Total Due</span>
                  <span className="text-[var(--color-brand)] font-extrabold">$1,200.00</span>
                </div>
                <Button variant="primary" size="md" pill className="w-full text-xs font-bold">
                  Book now →
                </Button>
                <p className="text-[10px] text-[var(--color-text-on-light-muted)] text-center mt-2.5">
                  Instant confirmation. Your card is authorized now and charged when the stay is confirmed.
                </p>
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-on-light-muted)] mt-4 pt-2 border-t border-neutral-100">
              Immediate reservation without host manual review.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
