import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heart } from 'lucide-react';
import {
  getPropertyBySlug,
  listProperties,
} from '@/lib/api/properties';
import { getHostProfile } from '@/lib/api/hosts';
import {
  listBlockedDates,
  listReservations,
} from '@/lib/api/reservations';
import { ImageGallery } from '@/features/property-detail/image-gallery';
import { WorkstationSpecs } from '@/features/property-detail/workstation-specs';
import { AmenitiesList } from '@/features/property-detail/amenities-list';
import { HostInfoBlock } from '@/features/property-detail/host-info-block';
import { BookingWidget } from '@/features/property-detail/booking-widget';
import { SimilarProperties } from '@/features/property-detail/similar-properties';
import { UIStateShowcase } from '@/features/property-detail/ui-state-showcase';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    return {
      title: 'Apartment Not Found | NomadDesk',
    };
  }

  return {
    title: `${property.title} | NomadDesk`,
    description: property.description.slice(0, 160),
  };
}

export default async function ApartmentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  // Fetch host details, blocked dates, reservations, and similar listings in parallel
  const [host, blockedDates, reservations, similarListings] = await Promise.all([
    getHostProfile(property.hostId),
    listBlockedDates(property.id),
    listReservations({ propertyId: property.id }),
    listProperties({ city: property.city }),
  ]);

  return (
    <div className="bg-[var(--color-bg-light)] min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <Link
            href={`/c/furnished-apartments-${property.city.toLowerCase()}`}
            className="hover:underline"
          >
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
            <h1 className="text-2xl sm:text-3xl lg:text-3.5xl font-extrabold text-[var(--color-text-on-light)] leading-tight mb-2">
              {property.title}
            </h1>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[var(--color-text-on-light-muted)] flex-wrap">
              <span>📍 {property.address || property.neighborhood}, {property.city}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                ✓ Verified Workstation
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800">
                ⚡ {property.workstation?.wifiSpeed || 600} Mbps Fiber
              </span>
              {property.isDirectBooking && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--color-brand)] text-white">
                  ⚡ Instant Book
                </span>
              )}
            </div>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-outline btn-sm inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] hover:bg-neutral-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500 transition-colors" />
              <span>Save to Favorites</span>
            </button>
          </div>
        </div>

        {/* 5-Photo Gallery Grid & Modal (AC-DETAIL-1) */}
        <ImageGallery images={property.images} title={property.title} />

        {/* 2-Column Split: Content (65%) vs Sticky Booking Widget (35%) */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Left Content Column (65%, ~816px on 1440px) */}
          <div className="flex-1 w-full min-w-0">
            {/* Specs Bar & Workstation Box (AC-DETAIL-1) */}
            <WorkstationSpecs
              workstation={property.workstation}
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              totalSurface={property.totalSurface}
              maxGuests={property.maxGuests}
            />

            {/* About This Home Section */}
            <div className="mb-8 bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-7 shadow-xs">
              <h2 className="text-xl font-bold text-[var(--color-text-on-light)] mb-4">
                About This Home
              </h2>
              <div className="prose max-w-none text-sm text-[var(--color-text-on-light-muted)] leading-relaxed whitespace-pre-line space-y-4">
                {property.description}
              </div>
            </div>

            {/* Amenities Grid */}
            <AmenitiesList property={property} />

            {/* Host Information Block (AC-DETAIL-4) */}
            <HostInfoBlock host={host} property={property} />

            {/* House Rules */}
            <div className="bg-[#faf8f5] border border-[var(--color-border-light)] rounded-2xl p-6 shadow-xs">
              <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-2">
                House Rules & Policies
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] leading-relaxed">
                {property.houseRules ||
                  'Quiet hours after 10 PM. No smoking or parties allowed. Pets require prior host approval.'}
              </p>
              <div className="flex gap-6 text-xs text-[var(--color-text-on-light-muted)] mt-4 pt-3 border-t border-[var(--color-border-light)] flex-wrap font-medium">
                <span>Check-in: {property.checkInStart || '15:00'}</span>
                <span>Check-out: {property.checkOut || '11:00'}</span>
                <span>Minimum stay: {property.minimumStayNights || 30} nights</span>
              </div>
            </div>
          </div>

          {/* Right Sticky Booking Column (35%, ~360px on 1440px desktop) */}
          <div className="w-full lg:w-[360px] shrink-0">
            <BookingWidget
              property={property}
              blockedDates={blockedDates}
              reservations={reservations}
            />
          </div>
        </div>

        {/* Similar Properties */}
        <SimilarProperties
          properties={similarListings}
          currentPropertyId={property.id}
          city={property.city}
        />

        {/* UI States & Verification Showcase Blocks */}
        <UIStateShowcase />
      </div>
    </div>
  );
}
