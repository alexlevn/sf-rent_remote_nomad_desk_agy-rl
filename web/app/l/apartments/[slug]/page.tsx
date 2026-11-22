import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPropertyBySlug, listProperties } from '@/lib/api/properties';
import { getHostProfile } from '@/lib/api/hosts';
import { listBlockedDates, listReservations } from '@/lib/api/reservations';
import { listWorkstations } from '@/lib/api/workstations';
import { hasHtmlTags, sanitizeHtml, stripHtmlTags } from '@/lib/validations/content';
import { getUtcOffsetDateString, slugifySegment } from '@/lib/format';
import { BOOKING_RULES } from '@/content/booking-rules';
import { FavoriteButton } from '@/components/ui/favorite-button';
import { ImageGallery } from '@/features/property-detail/image-gallery';
import { WorkstationSpecs } from '@/features/property-detail/workstation-specs';
import { AmenitiesList } from '@/features/property-detail/amenities-list';
import { HostInfoBlock } from '@/features/property-detail/host-info-block';
import { BookingWidget } from '@/features/property-detail/booking-widget';
import { SimilarProperties } from '@/features/property-detail/similar-properties';

const DEFAULT_MOVE_IN_OFFSET_DAYS = 90;
const FALLBACK_PRO_UPGRADE_CENTS = 15000;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    move_in?: string;
    move_out?: string;
    workstation?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    return {
      title: 'Apartment Not Found | NomadDesk',
    };
  }

  const description = stripHtmlTags(property.description).slice(0, 160);
  const canonicalPath = `/l/apartments/${property.slug}`;

  return {
    title: `${property.title} | NomadDesk`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${property.title} | NomadDesk`,
      description,
      url: canonicalPath,
      type: 'article',
    },
  };
}

export default async function ApartmentDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const [host, blockedDates, reservations, similarListings, workstationData] = await Promise.all([
    getHostProfile(property.hostId),
    listBlockedDates(property.id),
    listReservations({ propertyId: property.id }),
    listProperties({ city: property.city }),
    listWorkstations(),
  ]);

  const proPkg = workstationData.packages.find((p) => p.slug === 'pro-upgrade' || p.id === 'pro');
  const proUpgradePriceEUR = proPkg ? proPkg.pricePerMonth : FALLBACK_PRO_UPGRADE_CENTS;
  const minNights = Math.max(
    property.minimumStayNights || BOOKING_RULES.minimumStayNights,
    BOOKING_RULES.minimumStayNights
  );
  const defaultMoveIn = query.move_in || getUtcOffsetDateString(DEFAULT_MOVE_IN_OFFSET_DAYS);
  const defaultMoveOut =
    query.move_out || getUtcOffsetDateString(DEFAULT_MOVE_IN_OFFSET_DAYS + minNights);
  const initialWorkstation: 'comfort' | 'pro' =
    query.workstation === 'pro' || query.workstation === 'upgrade' ? 'pro' : 'comfort';

  const citySlug = slugifySegment(property.city);

  return (
    <div className="bg-[var(--color-bg-light)] min-h-screen pt-4 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="text-xs text-[var(--color-text-on-light-muted)] mb-4 flex items-center gap-1.5 flex-wrap"
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/a/furnished-apartments" className="hover:underline">
            {property.country}
          </Link>
          <span>/</span>
          <Link href={`/c/furnished-apartments-${citySlug}`} className="hover:underline">
            {property.city}
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">
            {property.neighborhood}
          </span>
        </nav>

        {/* Title & Verified Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] lg:leading-[38px] font-extrabold text-[var(--color-text-on-light)] leading-tight mb-2">
              {property.title}
            </h1>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[var(--color-text-on-light-muted)] flex-wrap">
              <span>
                📍 {property.address || property.neighborhood}, {property.city}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]">
                ✓ Verified Workstation
              </span>
              {(property.workstation?.wifiSpeed ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800">
                  ⚡ {property.workstation.wifiSpeed} Mbps Fiber
                </span>
              )}
              {property.isDirectBooking && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--color-brand)] text-white">
                  ⚡ Instant Book
                </span>
              )}
            </div>
          </div>

          <div>
            <FavoriteButton
              propertyId={property.id}
              propertyTitle={property.title}
              variant="pill"
            />
          </div>
        </div>

        {/* 5-Photo Gallery Grid & Modal (AC-DETAIL-1) */}
        <ImageGallery images={property.images} title={property.title} />

        {/* 2-Column Split: Content (65%) vs Sticky Booking Widget (35%) */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 w-full min-w-0">
            <WorkstationSpecs
              workstation={property.workstation}
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              totalSurface={property.totalSurface}
              maxGuests={property.maxGuests}
            />

            <div className="mb-8 bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-7 shadow-xs">
              <h2 className="text-xl font-bold text-[var(--color-text-on-light)] mb-4">
                About This Home
              </h2>
              {hasHtmlTags(property.description) ? (
                <div
                  className="rich-html-content max-w-none text-sm text-[var(--color-text-on-light-muted)] leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(property.description),
                  }}
                />
              ) : (
                <div className="prose max-w-none text-sm text-[var(--color-text-on-light-muted)] leading-relaxed whitespace-pre-line space-y-4">
                  {property.description}
                </div>
              )}
            </div>

            <AmenitiesList property={property} />

            <HostInfoBlock host={host} property={property} />

            {/* House Rules */}
            <div className="bg-[var(--color-bg-light-subtle)] border border-[var(--color-border-light)] rounded-2xl p-6 shadow-xs">
              <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-2">
                House Rules &amp; Policies
              </h3>
              {property.houseRules && hasHtmlTags(property.houseRules) ? (
                <div
                  className="rich-html-content text-xs sm:text-sm text-[var(--color-text-on-light-muted)] leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(property.houseRules),
                  }}
                />
              ) : (
                <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] leading-relaxed whitespace-pre-line">
                  {property.houseRules ||
                    'Quiet hours after 10 PM. No smoking or parties allowed. Pets require prior host approval.'}
                </p>
              )}
              <div className="flex gap-6 text-xs text-[var(--color-text-on-light-muted)] mt-4 pt-3 border-t border-[var(--color-border-light)] flex-wrap font-medium">
                <span>Check-in: {property.checkInStart || '15:00'}</span>
                <span>Check-out: {property.checkOut || '11:00'}</span>
                <span>Minimum stay: {minNights} nights</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[360px] shrink-0">
            <BookingWidget
              property={property}
              blockedDates={blockedDates}
              reservations={reservations}
              proUpgradePriceEUR={proUpgradePriceEUR}
              defaultMoveIn={defaultMoveIn}
              defaultMoveOut={defaultMoveOut}
              initialWorkstation={initialWorkstation}
            />
          </div>
        </div>

        <SimilarProperties
          properties={similarListings}
          currentPropertyId={property.id}
          city={property.city}
        />
      </div>
    </div>
  );
}
