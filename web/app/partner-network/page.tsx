import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PARTNER_NETWORK_CONTENT } from '@/content/pages/partner-network';

export const metadata: Metadata = {
  title: PARTNER_NETWORK_CONTENT.metadata.title,
  description: PARTNER_NETWORK_CONTENT.metadata.description,
};

export default function PartnerNetworkPage() {
  const {
    hero,
    valueProps,
    stepsSection,
    steps,
    faqsSection,
    faqs,
    reviewSlaText,
  } = PARTNER_NETWORK_CONTENT;

  return (
    <div className="bg-[var(--color-bg-dark)] text-[var(--color-text-on-dark)] -mt-24 pt-32 pb-20">
      {/* 1. Hero Section */}
      <section className="py-16 sm:py-24 text-center px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <Badge variant="accent" pill className="mb-4">
              {hero.badge}
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] lg:leading-[58px] font-bold text-white tracking-tight leading-tight">
            {hero.title}
          </h1>

          <p className="text-base sm:text-lg text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto leading-relaxed">
            {hero.subtitle}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/host/apply">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-full shadow-[var(--shadow-lg)]"
              >
                {hero.ctaLabel}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Value Props Section */}
      <section className="py-16 sm:py-20 bg-[var(--color-bg-dark-surface)] border-y border-[var(--color-border-dark)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map((prop) => (
              <div
                key={prop.id}
                className="bg-neutral-900 border border-[var(--color-border-dark)] rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors"
              >
                <div>
                  <div className="text-3xl mb-3">{prop.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{prop.title}</h3>
                  <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
                    {prop.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. How It Works (4 Steps) */}
      <section className="py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest font-bold text-[var(--color-brand)] block mb-2">
            {stepsSection.eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[48px] lg:leading-[48px] font-bold tracking-tight text-white mb-4">
            {stepsSection.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto">
            {stepsSection.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className="bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)] rounded-2xl p-6 relative"
            >
              <div className="text-[var(--color-brand)] font-bold text-2xl mb-2">
                {step.numberLabel}
              </div>
              <h4 className="text-white font-semibold text-sm mb-2">{step.title}</h4>
              <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/host/apply">
            <Button
              variant="primary"
              size="lg"
              className="px-8 py-4 text-sm font-semibold rounded-full shadow-[var(--shadow-lg)]"
            >
              {stepsSection.ctaLabel}
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. Host FAQ Section */}
      <section className="py-20 bg-[var(--color-bg-dark-surface)] border-t border-[var(--color-border-dark)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="neutral" pill className="mb-3">
              {faqsSection.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
              {faqsSection.title}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-dark-muted)]">
              {faqsSection.subtitle}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="group bg-neutral-900 border border-[var(--color-border-dark)] rounded-2xl p-5 open:border-neutral-700 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-white group-open:text-[var(--color-brand)] transition-colors">
                  <span>{faq.question}</span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform duration-200 shrink-0 ml-4" />
                </summary>
                <div className="mt-3 pt-3 border-t border-neutral-800 text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 5. UI States & Verification Block */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mt-16">
        <div className="bg-neutral-900/90 rounded-2xl border border-[var(--color-border-dark)] p-5 text-xs text-neutral-300">
          <div className="font-bold text-white uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>📋 UI States &amp; Partner Verification Standard</span>
            <Badge variant="accent" pill>
              Screen #19 / #20
            </Badge>
          </div>
          <p className="text-[var(--color-text-on-dark-muted)] mb-3">
            The partner network directly connects to the Host Application intake flow (<Link href="/host/apply" className="text-[var(--color-brand)] hover:underline">/host/apply</Link>).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            <div className="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700">
              <span className="font-semibold text-white block mb-0.5">AC-HOST-1</span>
              <span>Submitting application transitions account to &quot;Application under review&quot; pending state.</span>
            </div>
            <div className="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700">
              <span className="font-semibold text-white block mb-0.5">AC-HOST-2</span>
              <span>Unapproved guest accounts accessing host management routes are redirected to application status.</span>
            </div>
            <div className="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700">
              <span className="font-semibold text-white block mb-0.5">Review SLA</span>
              <span>{reviewSlaText}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
