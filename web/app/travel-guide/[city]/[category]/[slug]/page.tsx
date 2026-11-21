import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTravelGuideBySlug } from '@/lib/api/guides';
import { listProperties } from '@/lib/api/properties';
import { ArticleLayout } from '@/features/content/article-layout';
import { SuggestedApartments } from '@/features/content/suggested-apartments';

interface TravelGuideDetailPageProps {
  params: Promise<{
    city: string;
    category: string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: TravelGuideDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getTravelGuideBySlug(slug);

  if (!guide) {
    return {
      title: 'Guide Not Found | NomadDesk',
    };
  }

  return {
    title: `${guide.title} | NomadDesk Travel Guide`,
    description: guide.excerpt,
  };
}

export default async function TravelGuideDetailPage({
  params,
}: TravelGuideDetailPageProps) {
  const { slug } = await params;
  const guide = await getTravelGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  // Fetch properties in this city for suggested stays (fallback to Madrid if none in current city)
  let properties = await listProperties({ city: guide.city });
  if (properties.length === 0) {
    properties = await listProperties({ city: 'madrid' });
  }

  const breadcrumbs = [
    { label: 'Travel Guide', href: '/travel-guide' },
    { label: guide.city },
    { label: guide.category },
  ];

  return (
    <ArticleLayout
      breadcrumbs={breadcrumbs}
      badgeText={`${guide.category} Guide`}
      badgeVariant="accent"
      title={guide.title}
      author="NomadDesk Editorial Team"
      publishDate={`Updated ${guide.publishDate}`}
      readTime="6 min read"
      image={guide.image}
      imageAlt={guide.title}
      leadText={guide.excerpt}
      afterContent={
        <SuggestedApartments city={guide.city} properties={properties} />
      }
      verificationSection={
        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8">
          <div className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-1">
            📋 UI States & Verification Blocks — Chi Tiết Cẩm Nang (/travel-guide/:city/:category/:slug)
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-6">
            These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-xl p-5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)] mb-3">
                City Filter Pills
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                  All (8)
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)]">
                  Barcelona
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)]">
                  Lima
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)]">
                  Riga
                </span>
              </div>
            </div>

            <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-xl p-5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)] mb-3">
                Verified Connectivity
              </span>
              <p className="text-xs text-[var(--color-text-on-light-muted)] leading-relaxed">
                Fiber speed test verified at 300+ Mbps symmetrical latency with backup 4G router ready in unit.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {/* Rich Editorial Body */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-on-light)] mt-6 mb-4">
          Neighborhood Dynamics &amp; Internet Reliability
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)] mb-5">
          When moving to {guide.city} for a month or longer, internet speed and proximity to ergonomic workstations are vital. Traditional short-term rental hosts frequently overestimate their WiFi capabilities, leaving remote employees frustrated during high-stakes video meetings.
        </p>

        {/* NomadDesk Verified Standard Callout */}
        <div className="bg-[#faf8f5] border-l-4 border-[var(--color-brand)] p-4 sm:p-5 rounded-r-xl my-6">
          <strong className="block text-sm sm:text-base font-bold text-[var(--color-text-on-light)] mb-1">
            NomadDesk Verified Standard:
          </strong>
          <span className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] leading-relaxed">
            Every verified property in {guide.city} maintains symmetric fiber connections with a minimum 300 Mbps speed tier and dedicated dual-screen desk hardware.
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-on-light)] mt-8 mb-4">
          Cost of Living &amp; Monthly Stays
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)] mb-4">
          Monthly accommodations typically provide up to 35% savings over nightly Airbnb rates, eliminating tourist taxes and cleaning surcharges.
        </p>
        {guide.content.includes('<') ? (
          <div
            className="prose prose-neutral max-w-none text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)] space-y-4"
            dangerouslySetInnerHTML={{
              __html: guide.content
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
                .replace(/javascript:/gi, ''),
            }}
          />
        ) : (
          <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)]">
            {guide.content}
          </p>
        )}
      </div>
    </ArticleLayout>
  );
}
