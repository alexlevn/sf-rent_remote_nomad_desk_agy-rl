'use client';

import React from 'react';
import Link from 'next/link';
import { SITE_CONFIG } from '@/content/site';
import { useCurrency } from '@/context/currency-context';

export const Footer: React.FC = () => {
  const { currency, setCurrency, currencies } = useCurrency();

  return (
    <footer className="w-full bg-[var(--color-bg-dark)] text-[var(--color-text-on-dark)] border-t border-[var(--color-border-dark)] pt-16 pb-10 mt-auto">
      <div className="w-full max-w-7xl mx-auto px-6">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand & Description Column (Spans 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-bold text-xl tracking-tight text-white"
            >
              <span>{SITE_CONFIG.name}</span>
              <span className="text-[10px] bg-[var(--color-brand)] text-white font-bold px-1.5 py-0.5 rounded-full">
                {SITE_CONFIG.brandBadge}
              </span>
            </Link>

            <p className="text-sm text-[var(--color-text-on-dark-muted)] max-w-sm leading-relaxed">
              {SITE_CONFIG.tagline}
            </p>

            {/* Currency Selector Badges */}
            <div className="pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-dark-muted)] block mb-2">
                Currency
              </span>
              <div className="flex flex-wrap gap-2">
                {currencies.map((curr) => {
                  const isActive = currency === curr.code;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => setCurrency(curr.code)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--color-bg-dark-surface)] text-[var(--color-text-on-dark)] border-neutral-500 shadow-sm ring-1 ring-white/20'
                          : 'bg-[var(--color-bg-dark-surface)] text-[var(--color-text-on-dark-muted)] border-[var(--color-border-dark)] hover:text-white hover:border-neutral-600'
                      }`}
                    >
                      {curr.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dynamic Sections from SITE_CONFIG */}
          {SITE_CONFIG.footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-dark-muted)]">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => {
                  let linkColorClass =
                    'text-[var(--color-text-on-dark-muted)] hover:text-white';
                  if (link.highlight === 'brand') {
                    linkColorClass =
                      'text-[var(--color-brand)] hover:brightness-110 font-medium';
                  } else if (link.highlight === 'admin') {
                    linkColorClass = 'text-[#38bdf8] hover:text-[#7dd3fc] font-medium';
                  }

                  return (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className={`text-sm transition-colors ${linkColorClass}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-6 border-t border-[var(--color-border-dark)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-on-dark-muted)]">
          <p>{SITE_CONFIG.copyright}</p>
          <div className="flex flex-wrap items-center gap-6">
            {SITE_CONFIG.legalLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
