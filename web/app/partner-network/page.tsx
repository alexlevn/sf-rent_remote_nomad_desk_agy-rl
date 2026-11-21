import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Partner Network for Hosts & Property Managers | NomadDesk',
  description:
    'Grow your portfolio with high-quality nomad tenants staying 30+ nights. Guaranteed upfront payments, lower turnover, and turnkey workstation infrastructure.',
};

interface HostFaqItem {
  id: string;
  question: string;
  answer: string;
}

const HOST_FAQS: HostFaqItem[] = [
  {
    id: 'commission',
    question: 'What commission does NomadDesk charge?',
    answer:
      'NomadDesk charges a transparent, flat 10% host platform fee on completed booking transactions. There are no monthly listing subscriptions, onboarding fees, or hidden payment processing charges.',
  },
  {
    id: 'response-window',
    question: 'How does the 48-hour booking response window work?',
    answer:
      'For properties set to "Request to Book", hosts have exactly 48 hours to accept or decline the reservation. During this window, the guest\'s payment is authorized and held in escrow. If no action is taken, the authorization releases automatically.',
  },
  {
    id: 'workstations',
    question: 'Who provides and installs the ergonomic workstations?',
    answer:
      'NomadDesk coordinates delivery and assembly of all workstation hardware (certified 4K displays, Herman Miller or medical-grade seating, motorized standing desks, and universal USB-C docks). You elevate your apartment\'s ADR without capital expenditure.',
  },
  {
    id: 'vetting',
    question: 'How are remote workers vetted before arrival?',
    answer:
      'Every guest undergoes identity verification, employment status screening, and background checks. Our community consists of senior software engineers, founders, designers, and tech consultants who require peaceful residential environments for focused work.',
  },
  {
    id: 'payouts',
    question: 'When and how do host payouts arrive?',
    answer:
      'Payouts are initiated via direct bank transfer or Stripe Connect 24 hours after guest check-in. For multi-month stays exceeding 30 nights, payouts disburse automatically on a recurring 30-day billing cycle.',
  },
];

export default function PartnerNetworkPage() {
  return (
    <div className="bg-[var(--color-bg-dark)] text-[var(--color-text-on-dark)] -mt-24 pt-32 pb-20">
      {/* 1. Hero Section */}
      <section className="py-16 sm:py-24 text-center px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <Badge variant="accent" pill className="mb-4">
              Curated Supply Marketplace
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
            Grow Your Portfolio with High-Quality Nomad Tenants
          </h1>

          <p className="text-base sm:text-lg text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto leading-relaxed">
            NomadDesk connects professional operators with vetted remote workers staying 30+ nights. Guaranteed payments, lower turnover, and turnkey workstation infrastructure.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/host/apply">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-full shadow-[var(--shadow-lg)]"
              >
                Apply to Become a Host Partner →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Value Props Section */}
      <section className="py-16 sm:py-20 bg-[var(--color-bg-dark-surface)] border-y border-[var(--color-border-dark)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Guaranteed Payments */}
            <div className="bg-neutral-900 border border-[var(--color-border-dark)] rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div>
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="text-lg font-bold text-white mb-2">Guaranteed Payments</h3>
                <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
                  Funds authorized upfront. Platform deducts a transparent 10% fee with direct monthly disbursements to your bank.
                </p>
              </div>
            </div>

            {/* Card 2: Vetted Remote Workers */}
            <div className="bg-neutral-900 border border-[var(--color-border-dark)] rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div>
                <div className="text-3xl mb-3">💼</div>
                <h3 className="text-lg font-bold text-white mb-2">Vetted Remote Workers</h3>
                <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
                  High-income tech professionals, consultants, and remote founders treating homes with respect and care.
                </p>
              </div>
            </div>

            {/* Card 3: Minimum 30-Night Stays */}
            <div className="bg-neutral-900 border border-[var(--color-border-dark)] rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div>
                <div className="text-3xl mb-3">🗓️</div>
                <h3 className="text-lg font-bold text-white mb-2">Minimum 30-Night Stays</h3>
                <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
                  Say goodbye to daily check-in chaos and party guests. Enjoy steady monthly occupancy with zero turnover friction.
                </p>
              </div>
            </div>

            {/* Card 4: Turnkey Workstations */}
            <div className="bg-neutral-900 border border-[var(--color-border-dark)] rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div>
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-lg font-bold text-white mb-2">Turnkey Workstations</h3>
                <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
                  We supply and install ergonomic monitors and chairs, elevating your ADR without any capital expense.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works (4 Steps) */}
      <section className="py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest font-bold text-[var(--color-brand)] block mb-2">
            Seamless Onboarding
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            4 Steps to Hosting on NomadDesk
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-on-dark-muted)] max-w-2xl mx-auto">
            From application submission to receiving vetted bookings, our dedicated operations team supports you at every milestone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)] rounded-2xl p-6 relative">
            <div className="text-[var(--color-brand)] font-bold text-2xl mb-2">01. Apply</div>
            <h4 className="text-white font-semibold text-sm mb-2">Submit Portfolio</h4>
            <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
              Submit your portfolio details, unit counts, and operating cities for curation review.
            </p>
          </div>

          <div className="bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)] rounded-2xl p-6 relative">
            <div className="text-[var(--color-brand)] font-bold text-2xl mb-2">02. Inspection</div>
            <h4 className="text-white font-semibold text-sm mb-2">Speed &amp; Ergonomics</h4>
            <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
              NomadDesk verifies internet speed reliability (≥ 300 Mbps) and workstation ergonomic setup.
            </p>
          </div>

          <div className="bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)] rounded-2xl p-6 relative">
            <div className="text-[var(--color-brand)] font-bold text-2xl mb-2">03. Publish</div>
            <h4 className="text-white font-semibold text-sm mb-2">Go Live</h4>
            <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
              List approved apartments with Instant Book or 48-Hour Request options on our global marketplace.
            </p>
          </div>

          <div className="bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)] rounded-2xl p-6 relative">
            <div className="text-[var(--color-brand)] font-bold text-2xl mb-2">04. Get Paid</div>
            <h4 className="text-white font-semibold text-sm mb-2">Automated Payouts</h4>
            <p className="text-xs text-[var(--color-text-on-dark-muted)] leading-relaxed">
              Receive bookings and enjoy automated monthly payout tracking directly in your host portal.
            </p>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/host/apply">
            <Button
              variant="primary"
              size="lg"
              className="px-8 py-4 text-sm font-semibold rounded-full shadow-[var(--shadow-lg)]"
            >
              Submit Host Application Now →
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. Host FAQ Section */}
      <section className="py-20 bg-[var(--color-bg-dark-surface)] border-t border-[var(--color-border-dark)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="neutral" pill className="mb-3">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
              Everything You Need to Know About Hosting
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-dark-muted)]">
              Clear rules, straightforward terms, and transparent platform economics.
            </p>
          </div>

          <div className="space-y-4">
            {HOST_FAQS.map((faq) => (
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
              <span>24 to 48 business hours curation window with instant re-submission on feedback.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
