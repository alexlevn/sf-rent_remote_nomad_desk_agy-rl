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
  alternates: {
    canonical: '/workstations/build',
  },
  openGraph: {
    title: 'Workstation Builder | NomadDesk',
    description:
      'Customize your monitor arrangement, ergonomic chair, and peripherals before booking.',
    type: 'website',
  },
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
          <h1 className="text-3xl sm:text-4xl lg:text-[48px] lg:leading-[48px] font-medium tracking-tight text-[var(--color-text-on-light)]">
            Start with Comfort, Upgrade What Matters
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-on-light-muted)] mt-2 max-w-2xl">
            Customize your monitor arrangement, ergonomic chair, and peripherals before booking.
          </p>
        </div>

        {/* Builder 2-Column Grid */}
        <WorkstationBuilderContainer workstationData={workstationData} />
      </div>
    </div>
  );
}
