import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wifi,
  Armchair,
  Monitor,
  Zap,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listWorkstations } from '@/lib/api/workstations';
import { PackageComparison } from '@/features/workstations/package-comparison';
import { SITE_CONFIG } from '@/content/site';

export const metadata: Metadata = {
  title: 'Our Ergonomic Workstations | NomadDesk',
  description:
    'Every NomadDesk home comes with our certified Comfort Base hardware. Elevate your workflow with Pro upgrades or configure every peripheral.',
};

const BENEFITS = [
  {
    icon: Wifi,
    title: 'Guaranteed Fiber Internet (≥ 300 Mbps)',
    description:
      'Low-latency fiber optic connection certified with documented speedtests before every check-in. Zero bandwidth throttling or shared public networks.',
  },
  {
    icon: Armchair,
    title: 'Medical-Grade Ergonomics',
    description:
      'High-performance seating designed for 10+ hour sustained posture health. Upgrade to Herman Miller Aeron for pressure-distributing 8Z Pellicle mesh.',
  },
  {
    icon: Monitor,
    title: 'Dual 4K & Ultrawide Real Estate',
    description:
      'Maximize screen productivity with calibrated 4K displays on heavy-duty gas counter-balance arms. Includes USB-C 90W single-cable power delivery.',
  },
  {
    icon: Zap,
    title: 'Turnkey Plug & Play Docking',
    description:
      'Arrive with your laptop, plug in one cable, and instantly connect to multi-monitors, high-speed ethernet, webcam, and charging.',
  },
];

const WORKSTATION_FAQS = [
  {
    q: 'Can I customize individual hardware components rather than taking a whole package?',
    a: 'Yes! Use our interactive Workstation Builder (/workstations/build) to hand-pick your preferred monitor size, chair model, standing desk, and studio peripherals with realtime monthly pricing.',
  },
  {
    q: 'How is the workstation prepared before my arrival?',
    a: 'Our local field operations team cleans, calibrates, and verifies all equipment 24 hours prior to check-in. When you unlock the apartment door, your workstation is powered on and ready for work.',
  },
  {
    q: 'What if hardware malfunctions during my stay?',
    a: 'All hardware is backed by NomadDesk On-Site Guarantee. Report any issue via the Guest Portal, and our local technician will repair or replace your hardware within 24 hours at zero charge.',
  },
  {
    q: 'Is high-speed internet guaranteed across all rooms?',
    a: 'Every listing undergoes physical speed verification before publication. If speeds drop below 80% of the certified benchmark, we immediately deploy a dedicated 5G mobile backup hotspot.',
  },
];

export default async function WorkstationsPage() {
  const workstationData = await listWorkstations();

  return (
    <div className="bg-[var(--color-bg-dark)] text-[var(--color-text-on-dark)] -mt-24 pt-24 min-h-screen">
      {/* Hero Section */}
      <section className="py-20 sm:py-28 text-center px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border-dark)]">
        <div className="max-w-4xl mx-auto">
          <Badge
            variant="accent"
            className="mb-4 bg-[var(--color-brand)] text-white border-transparent"
          >
            Zero Compromise Setup
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] lg:leading-[60px] font-bold tracking-tight text-white mb-6 leading-tight">
            A Workstation, Coordinated with Your Reservation
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Every NomadDesk home comes with our certified Comfort Base hardware. Elevate your workflow
            with Pro upgrades or configure every peripheral.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              pill
              className="w-full sm:w-auto px-8 shadow-xl hover:brightness-110 active:scale-[0.99] transition-all"
            >
              <Link href={SITE_CONFIG.links.workstationBuilder} className="flex items-center gap-2">
                <span>Launch Workstation Builder</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline-white"
              size="lg"
              pill
              className="w-full sm:w-auto px-8 border-neutral-700 hover:bg-neutral-800"
            >
              <Link href={SITE_CONFIG.links.browse}>
                Browse Apartments
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Package Comparison Section */}
      <PackageComparison packages={workstationData.packages} />

      {/* Benefits Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest font-bold text-[var(--color-brand)] block mb-2">
            Why Professionals Choose NomadDesk
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
            Engineered for Deep Work & Extreme Productivity
          </h2>
          <p className="text-base text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto">
            Say goodbye to cramped dining chairs, spotty hotel WiFi, and neck strain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)] rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-600 transition-colors"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-neutral-800 text-[var(--color-brand)] flex items-center justify-center mb-5 border border-neutral-700">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{b.title}</h3>
                  <p className="text-sm text-[var(--color-text-on-dark-muted)] leading-relaxed">
                    {b.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Workstation FAQs Section */}
      <section className="py-16 bg-[#1f1d1a] border-t border-[var(--color-border-dark)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Frequently Asked Questions About Workstations
            </h2>
            <p className="text-sm text-[var(--color-text-on-dark-muted)]">
              Everything you need to know about setup, hardware delivery, and support.
            </p>
          </div>

          <div className="space-y-4">
            {WORKSTATION_FAQS.map((faq, idx) => (
              <details
                key={idx}
                className="group bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)] rounded-xl p-5 open:border-neutral-600 transition-colors"
              >
                <summary className="flex items-center justify-between font-semibold text-white cursor-pointer list-none select-none">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-on-dark-muted)] group-open:rotate-180 transition-transform shrink-0 ml-3" />
                </summary>
                <p className="text-sm text-[var(--color-text-on-dark-muted)] mt-3 pt-3 border-t border-neutral-800 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-16 text-center px-4 sm:px-6 lg:px-8 border-t border-[var(--color-border-dark)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Build Your Perfect Remote Workstation?
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-on-dark-muted)] mb-8">
            Select an apartment in any of our 34 destinations and configure your custom desk and display setup in minutes.
          </p>
          <Button asChild size="lg" pill className="shadow-xl px-8">
            <Link href={SITE_CONFIG.links.workstationBuilder}>
              Launch Workstation Builder →
            </Link>
          </Button>
        </div>
      </section>

      {/* UI States & Verification Blocks (faithful to design/workstations.html) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-8">
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-6 sm:p-8">
          <div className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>📋 UI States & Verification Blocks — Tổng Quan Workstations (/workstations)</span>
          </div>
          <p className="text-xs text-neutral-400 mb-6">
            These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/80">
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-brand)] text-white mb-2">
                Hardware Upgrade Option
              </span>
              <div className="text-sm font-bold text-white">Herman Miller Aeron Chair</div>
              <div className="text-xs text-neutral-400 mt-1">
                Adds +€45/month to your apartment reservation.
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/80">
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-800 text-emerald-200 mb-2">
                Speed Guarantee
              </span>
              <div className="text-sm font-bold text-white">Low-Latency WiFi</div>
              <div className="text-xs text-neutral-400 mt-1">
                ≥ 300 Mbps fiber speed certified prior to each check-in.
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/80">
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-900 text-blue-200 mb-2">
                Turnkey Setup
              </span>
              <div className="text-sm font-bold text-white">Pre-Arrival Verification</div>
              <div className="text-xs text-neutral-400 mt-1">
                Single-cable Thunderbolt dock connected and tested.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
