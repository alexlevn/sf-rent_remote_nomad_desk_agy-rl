import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTravelGuideBySlug } from '@/lib/api/guides';
import { listProperties } from '@/lib/api/properties';
import { hasHtmlTags, sanitizeHtml } from '@/lib/validations/content';
import { getTravelGuideHref, normalizeImageSrc } from '@/lib/format';
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

  const canonicalPath = getTravelGuideHref(guide);
  const title = guide.seoTitle?.trim() || `${guide.title} | NomadDesk Travel Guide`;
  const description = guide.seoDescription?.trim() || guide.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      images: guide.image ? [{ url: normalizeImageSrc(guide.image, '/seed/guide/362.webp') }] : undefined,
    },
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
  let suggestedCity = guide.city;
  if (properties.length === 0) {
    properties = await listProperties({ city: 'madrid' });
    suggestedCity = 'Madrid';
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
        <SuggestedApartments city={suggestedCity} properties={properties} />
      }
    >
      {/* Rich Editorial Body */}
      {hasHtmlTags(guide.content) ? (
        <div
          className="rich-html-content prose prose-neutral max-w-none text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)] space-y-4"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(guide.content),
          }}
        />
      ) : (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-on-light)] mt-6 mb-4">
            Neighborhood Dynamics &amp; Internet Reliability
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)] mb-5">
            When moving to {guide.city} for a month or longer, internet speed and proximity to ergonomic workstations are vital. Traditional short-term rental hosts frequently overestimate their WiFi capabilities, leaving remote employees frustrated during high-stakes video meetings.
          </p>

          {/* NomadDesk Verified Standard Callout */}
          <div className="bg-[var(--color-bg-light-subtle)] border-l-4 border-[var(--color-brand)] p-4 sm:p-5 rounded-r-xl my-6">
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
          <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)]">
            {guide.content}
          </p>
        </div>
      )}
    </ArticleLayout>
  );
}
