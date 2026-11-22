import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/content/site';
import type { WorkstationPackage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PackageComparisonProps {
  packages?: WorkstationPackage[];
}

function formatEurWhole(cents: number): string {
  const eur = cents / 100;
  return Number.isInteger(eur) ? `€${eur}` : `€${eur.toFixed(2)}`;
}

export function PackageComparison({ packages = [] }: PackageComparisonProps) {
  const activePackages = [...packages]
    .filter((pkg) => pkg.isActive !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <section className="py-16 bg-[var(--color-bg-dark-elevated)] border-y border-[var(--color-border-dark)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="accent" className="mb-3">
            Hardware Packages
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Compare Workstation Packages
          </h2>
          <p className="text-base text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto">
            Choose standard included comfort or elevate your setup with enterprise-grade ergonomic
            and display upgrades.
          </p>
        </div>

        {activePackages.length === 0 ? (
          <div className="bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)] rounded-2xl p-10 text-center text-sm text-[var(--color-text-on-dark-muted)]">
            No workstation packages are currently published.
          </div>
        ) : (
          <div
            className={cn(
              'grid grid-cols-1 gap-8 items-stretch',
              activePackages.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2',
            )}
          >
            {activePackages.map((pkg) => {
              const isHighlighted = !pkg.isIncluded && pkg.pricePerMonth > 0;
              return (
                <div
                  key={pkg.id}
                  className={
                    isHighlighted
                      ? 'bg-[var(--color-bg-dark-surface)] border-2 border-[var(--color-brand)] rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl'
                      : 'bg-[var(--color-bg-dark-surface)] border border-[var(--color-neutral-700)] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg'
                  }
                >
                  {isHighlighted && (
                    <div className="absolute -top-3 right-6">
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[var(--color-brand)] text-white shadow-md">
                        Popular for Tech &amp; Creatives
                      </span>
                    </div>
                  )}

                  <div>
                    {isHighlighted ? (
                      <Badge variant="accent" className="mb-4">
                        EXECUTIVE UPGRADE
                      </Badge>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider bg-[var(--color-border-dark)] text-[var(--color-text-on-dark)] border border-neutral-600 mb-4">
                        STANDARD INCLUDED
                      </span>
                    )}

                    <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                    <p className="text-sm text-[var(--color-text-on-dark-muted)] mb-6 min-h-[40px]">
                      {pkg.description}
                    </p>

                    <div
                      className={cn(
                        'text-3xl sm:text-4xl font-bold mb-6 flex items-baseline gap-1',
                        isHighlighted ? 'text-[var(--color-brand)]' : 'text-white',
                      )}
                    >
                      <span>{formatEurWhole(pkg.pricePerMonth)}</span>
                      <span className="text-sm font-normal text-[var(--color-text-on-dark-muted)]">
                        / month
                      </span>
                    </div>

                    <ul className="space-y-3.5 mb-8 text-sm text-[var(--color-text-on-dark-subtle)]">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check
                            className={cn(
                              'w-4 h-4 shrink-0 mt-0.5',
                              isHighlighted ? 'text-[var(--color-brand)]' : 'text-emerald-400',
                            )}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isHighlighted ? (
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
                  ) : (
                    <Button
                      asChild
                      variant="outline-white"
                      size="lg"
                      className="w-full justify-center border-neutral-600 text-white hover:bg-neutral-800"
                    >
                      <Link href={SITE_CONFIG.links.browse}>Browse Apartments</Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
