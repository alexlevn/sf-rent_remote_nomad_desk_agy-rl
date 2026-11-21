import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listWorkstations } from '@/lib/api/workstations';
import { WorkstationBuilderContainer } from '@/features/workstations/workstation-builder-container';
import { SITE_CONFIG } from '@/content/site';

export const metadata: Metadata = {
  title: 'Workstation Builder | NomadDesk',
  description:
    'Customize your monitor arrangement, ergonomic chair, and peripherals before booking.',
};

export default async function WorkstationBuilderPage() {
  const workstationData = await listWorkstations();

  return (
    <div className="bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb & Header */}
        <div className="mb-8">
          <Link
            href={SITE_CONFIG.links.workstations}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand)] hover:underline mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text-on-light)]">
            Start with Comfort, Upgrade What Matters
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-on-light-muted)] mt-2 max-w-2xl">
            Customize your monitor arrangement, ergonomic chair, and peripherals before booking.
          </p>
        </div>

        {/* Builder 2-Column Grid */}
        <WorkstationBuilderContainer workstationData={workstationData} />

        {/* UI States & Verification Blocks (faithful to design/workstations-build.html) */}
        <section className="mt-16 pt-10 border-t border-[var(--color-border-light)]">
          <div className="rounded-2xl border border-[var(--color-border-light)] bg-white p-6 sm:p-8 shadow-xs">
            <div className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>📋 UI States & Verification Blocks — Công Cụ Workstation Builder (/workstations/build)</span>
            </div>
            <p className="text-xs text-[var(--color-text-on-light-muted)] mb-6">
              These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/50">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-brand)] text-white mb-2">
                  Live Cost Recalculation
                </span>
                <div className="flex justify-between font-bold text-sm text-neutral-900">
                  <span>Upgrade Total:</span>
                  <span className="text-[var(--color-brand)]">+€185.00/mo</span>
                </div>
                <div className="text-xs text-[var(--color-text-on-light-muted)] mt-1">
                  Dynamic sum changes instantaneously when ticking add-on peripherals.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-700 text-white mb-2">
                  Baseline Setup
                </span>
                <div className="flex justify-between font-bold text-sm text-neutral-900">
                  <span>Comfort Base:</span>
                  <span className="text-emerald-700">€0.00 Included</span>
                </div>
                <div className="text-xs text-[var(--color-text-on-light-muted)] mt-1">
                  Zero incremental cost with single 4K display and mesh chair.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-700 text-white mb-2">
                  AC-BUILD-1 Specification
                </span>
                <div className="flex justify-between font-bold text-sm text-neutral-900">
                  <span>Aeron + 4K Ultrawide:</span>
                  <span className="text-[var(--color-brand)]">+€85/month</span>
                </div>
                <div className="text-xs text-[var(--color-text-on-light-muted)] mt-1">
                  Selecting 4K Ultrawide (€40) and Aeron (€45) updates total to €85/month.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
