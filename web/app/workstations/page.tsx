import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wifi,
  Armchair,
  Monitor,
  Zap,
  ArrowRight,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listWorkstations } from '@/lib/api/workstations';
import { PackageComparison } from '@/features/workstations/package-comparison';
import { SITE_CONFIG } from '@/content/site';
import {
  WORKSTATIONS_PAGE_CONTENT,
  type WorkstationBenefitIcon,
} from '@/content/pages/workstations';

export const metadata: Metadata = {
  title: WORKSTATIONS_PAGE_CONTENT.metadata.title,
  description: WORKSTATIONS_PAGE_CONTENT.metadata.description,
  alternates: {
    canonical: '/workstations',
  },
  openGraph: {
    title: WORKSTATIONS_PAGE_CONTENT.metadata.title,
    description: WORKSTATIONS_PAGE_CONTENT.metadata.description,
    type: 'website',
  },
};

const BENEFIT_ICONS: Record<WorkstationBenefitIcon, LucideIcon> = {
  wifi: Wifi,
  armchair: Armchair,
  monitor: Monitor,
  zap: Zap,
};

export default async function WorkstationsPage() {
  const workstationData = await listWorkstations();
  const { hero, benefitsSection, benefits, faqsSection, faqs, cta } =
    WORKSTATIONS_PAGE_CONTENT;

  return (
    <div className="bg-[var(--color-bg-dark)] text-[var(--color-text-on-dark)] -mt-24 pt-24 min-h-screen">
      {/* Hero Section */}
      <section className="py-20 sm:py-28 text-center px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border-dark)]">
        <div className="max-w-4xl mx-auto">
          <Badge
            variant="accent"
            className="mb-4 bg-[var(--color-brand)] text-white border-transparent"
          >
            {hero.badge}
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] lg:leading-[60px] font-bold tracking-tight text-white mb-6 leading-tight">
            {hero.title}
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            {hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              pill
              className="w-full sm:w-auto px-8 shadow-xl hover:brightness-110 active:scale-[0.99] transition-all"
            >
              <Link href={SITE_CONFIG.links.workstationBuilder} className="flex items-center gap-2">
                <span>{hero.primaryCtaLabel}</span>
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
                {hero.secondaryCtaLabel}
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
            {benefitsSection.eyebrow}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
            {benefitsSection.title}
          </h2>
          <p className="text-base text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto">
            {benefitsSection.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b) => {
            const Icon = BENEFIT_ICONS[b.icon];
            return (
              <div
                key={b.id}
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
      <section className="py-16 bg-[var(--color-bg-dark-elevated)] border-t border-[var(--color-border-dark)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {faqsSection.title}
            </h2>
            <p className="text-sm text-[var(--color-text-on-dark-muted)]">
              {faqsSection.subtitle}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.id}
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
            {cta.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-on-dark-muted)] mb-8">
            {cta.subtitle}
          </p>
          <Button asChild size="lg" pill className="shadow-xl px-8">
            <Link href={SITE_CONFIG.links.workstationBuilder}>
              {cta.buttonLabel}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
