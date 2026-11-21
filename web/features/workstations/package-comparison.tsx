import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/content/site';
import type { WorkstationPackage } from '@/lib/types';

interface PackageComparisonProps {
  packages?: WorkstationPackage[];
}

export function PackageComparison({ packages = [] }: PackageComparisonProps) {
  const comfortPkg = packages.find((p) => p.slug === 'comfort-base' || p.id === 'comfort') || {
    id: 'comfort',
    name: 'Comfort Base',
    slug: 'comfort-base',
    pricePerMonth: 0,
    isIncluded: true,
    description: 'Certified ergonomic desk, high-back mesh chair, and high-speed fiber internet.',
    features: [
      'Single 27" 4K UHD Ultra-Clear Display',
      'Ergonomic High-Back Breathable Mesh Chair',
      'Solid Oak Work Desk (120 x 60 cm)',
      'Full-Sized Keyboard & Wireless Precision Mouse',
      'Guaranteed Fiber Optic Internet (≥ 300 Mbps)',
    ],
  };

  const proPkg = packages.find((p) => p.slug === 'pro-upgrade' || p.id === 'pro') || {
    id: 'pro',
    name: 'Pro Upgrade',
    slug: 'pro-upgrade',
    pricePerMonth: 15000,
    isIncluded: false,
    description: 'Motorized standing desk, Herman Miller Aeron chair, and 4K Ultrawide monitor.',
    features: [
      'Dual 27" 4K UHD Monitors or 34" Curved Ultrawide',
      'Herman Miller Aeron or Steelcase Gesture Chair',
      'Dual-Motor Electric Height-Adjustable Standing Desk',
      'Logitech MX Master 3S + Mechanical Wireless Keyboard',
      '4K Pro Streaming Webcam + Integrated Ring Light',
      'CalDigit Thunderbolt 4 Docking Station',
    ],
  };

  const proPriceEUR = Math.round(proPkg.pricePerMonth / 100);

  return (
    <section className="py-16 bg-[#1f1d1a] border-y border-[var(--color-border-dark)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="accent" className="mb-3">
            Two Tier Hardware Packages
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Compare Workstation Packages
          </h2>
          <p className="text-base text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto">
            Choose standard included comfort or elevate your setup with enterprise-grade ergonomic and display upgrades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Comfort Base Card */}
          <div className="bg-[var(--color-bg-dark-surface)] border border-[var(--color-neutral-700)] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider bg-[#333333] text-[var(--color-text-on-dark)] border border-neutral-600 mb-4">
                STANDARD INCLUDED
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">{comfortPkg.name}</h3>
              <p className="text-sm text-[var(--color-text-on-dark-muted)] mb-6 min-h-[40px]">
                {comfortPkg.description}
              </p>

              <div className="text-3xl sm:text-4xl font-bold text-white mb-6 flex items-baseline gap-1">
                <span>€0</span>
                <span className="text-sm font-normal text-[var(--color-text-on-dark-muted)]">
                  / month
                </span>
              </div>

              <ul className="space-y-3.5 mb-8 text-sm text-[#d1c8be]">
                {comfortPkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              asChild
              variant="outline-white"
              size="lg"
              className="w-full justify-center border-neutral-600 text-white hover:bg-neutral-800"
            >
              <Link href={SITE_CONFIG.links.browse}>
                Browse Apartments
              </Link>
            </Button>
          </div>

          {/* Pro Upgrade Card */}
          <div className="bg-[var(--color-bg-dark-surface)] border-2 border-[var(--color-brand)] rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl">
            <div className="absolute -top-3 right-6">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[var(--color-brand)] text-white shadow-md">
                Popular for Tech & Creatives
              </span>
            </div>

            <div>
              <Badge variant="accent" className="mb-4">
                EXECUTIVE UPGRADE
              </Badge>
              <h3 className="text-2xl font-bold text-white mb-2">{proPkg.name}</h3>
              <p className="text-sm text-[var(--color-text-on-dark-muted)] mb-6 min-h-[40px]">
                {proPkg.description}
              </p>

              <div className="text-3xl sm:text-4xl font-bold text-[var(--color-brand)] mb-6 flex items-baseline gap-1">
                <span>€{proPriceEUR}</span>
                <span className="text-sm font-normal text-[var(--color-text-on-dark-muted)]">
                  / month
                </span>
              </div>

              <ul className="space-y-3.5 mb-8 text-sm text-[#d1c8be]">
                {proPkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              asChild
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-lg hover:brightness-110"
            >
              <Link href={SITE_CONFIG.links.workstationBuilder}>
                Configure in Builder →
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
