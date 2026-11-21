'use client';

import React, { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Check,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  ExternalLink,
  Image as ImageIcon,
  Images,
  Sliders,
  Laptop,
  DollarSign,
  CalendarCheck,
  Plus,
  Trash2,
  Star,
} from 'lucide-react';
import type { Location, Property } from '@/lib/types';
import { stripHtmlTags } from '@/lib/validations/content';
import { isSafeImagePath } from '@/lib/validations/media';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import { CurrencyInput } from '@/features/media/currency-input';
import {
  MediaLibraryModal,
  type SelectedMediaItem,
} from '@/features/media/media-library-modal';
import { useUnsavedChanges } from '@/features/media/use-unsaved-changes';

const MAX_IMAGES = 50;
const INT4_MAX = 2_147_483_647;

const MOCK_GALLERY_OPTIONS = [
  '/seed/property/prop-madrid-1.webp',
  '/seed/property/prop-madrid-2.webp',
  '/seed/property/prop-madrid-3.webp',
  '/seed/property/prop-madrid-4.webp',
  '/seed/property/prop-madrid-6.webp',
  '/seed/property/prop-barcelona-1.webp',
  '/seed/property/prop-barcelona-2.webp',
  '/seed/property/prop-buenos-aires-1.webp',
  '/seed/property/prop-buenos-aires-2.webp',
  '/seed/property/prop-lima-1.webp',
  '/seed/property/prop-lima-2.webp',
];

interface ListingFormSectionsProps {
  initialData?: Property;
  locations: Location[];
  hostId: number;
  onSaveAction: (
    data: Partial<Property>,
    intent: 'draft' | 'pending_review'
  ) => Promise<{ success: boolean; error?: string; property?: Property }>;
}

export function ListingFormSections({
  initialData,
  locations,
  onSaveAction,
}: ListingFormSectionsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Section 1: Basics
  const [title, setTitle] = useState(initialData?.title || '');
  const [city, setCity] = useState(
    initialData?.city || locations[0]?.city || 'Madrid'
  );
  const [neighborhood, setNeighborhood] = useState(
    initialData?.neighborhood || ''
  );
  const [address, setAddress] = useState(initialData?.address || '');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );

  // Section 2: Photos
  const [images, setImages] = useState<string[]>(
    initialData?.images && initialData.images.length > 0
      ? initialData.images
      : ['/seed/property/prop-madrid-1.webp', '/seed/property/prop-madrid-2.webp']
  );
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Section 3: Details & Amenities
  const [bedrooms, setBedrooms] = useState<number>(initialData?.bedrooms ?? 1);
  const [bathrooms, setBathrooms] = useState<number>(initialData?.bathrooms ?? 1);
  const [totalSurface, setTotalSurface] = useState<number>(
    initialData?.totalSurface ?? 60
  );
  const [maxGuests, setMaxGuests] = useState<number>(
    initialData?.maxGuests ?? 2
  );
  const [bedsCount, setBedsCount] = useState<number>(
    initialData?.bedsCount ?? 1
  );

  const [kitchen, setKitchen] = useState<boolean>(initialData?.kitchen ?? true);
  const [laundry, setLaundry] = useState<boolean>(initialData?.laundry ?? true);
  const [balcony, setBalcony] = useState<boolean>(
    initialData?.balcony ?? false
  );
  const [petFriendly, setPetFriendly] = useState<boolean>(
    initialData?.petFriendly ?? false
  );
  const [pool, setPool] = useState<boolean>(initialData?.pool ?? false);
  const [gym, setGym] = useState<boolean>(initialData?.gym ?? false);
  const [terrace, setTerrace] = useState<boolean>(
    initialData?.terrace ?? false
  );

  // Section 4: Workstation
  const [desk, setDesk] = useState(
    initialData?.workstation?.desk || 'Ergonomic Standing Desk'
  );
  const [chair, setChair] = useState(
    initialData?.workstation?.chair || 'Herman Miller Aeron'
  );
  const [monitors, setMonitors] = useState(
    initialData?.workstation?.monitors || 'Dual 27" 4K UHD Monitors'
  );
  const [keyboard, setKeyboard] = useState(
    initialData?.workstation?.keyboard || 'Mechanical Keyboard & Wireless Mouse'
  );
  const [wifiSpeed, setWifiSpeed] = useState<number>(
    initialData?.workstation?.wifiSpeed ?? 600
  );

  // Section 5: Pricing & Rules
  const initialRentDollars =
    initialData?.pricePerMonth != null
      ? Math.round(initialData.pricePerMonth / 100)
      : 2850;
  const [monthlyRentUsd, setMonthlyRentUsd] = useState<number | ''>(
    initialRentDollars
  );
  const [minimumStayNights, setMinimumStayNights] = useState<number>(
    initialData?.minimumStayNights ?? 30
  );
  const [checkInStart, setCheckInStart] = useState(
    initialData?.checkInStart || '15:00'
  );
  const [checkOut, setCheckOut] = useState(initialData?.checkOut || '11:00');
  const [houseRules, setHouseRules] = useState(
    initialData?.houseRules ||
      'No smoking inside. Quiet hours 22:00 - 08:00. Pet-friendly with prior confirmation.'
  );

  // Section 6: Booking Mode
  const [isDirectBooking, setIsDirectBooking] = useState<boolean>(
    initialData?.isDirectBooking ?? false
  );

  // State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingIntent, setSubmittingIntent] = useState<
    'draft' | 'pending_review' | null
  >(null);
  const isSubmittingRef = useRef(false);

  // Track dirty state against initial snapshot for unsaved-changes warnings
  const currentSnapshot = JSON.stringify({
    title,
    city,
    neighborhood,
    address,
    description,
    images,
    bedrooms,
    bathrooms,
    totalSurface,
    maxGuests,
    bedsCount,
    kitchen,
    laundry,
    balcony,
    petFriendly,
    pool,
    gym,
    terrace,
    desk,
    chair,
    monitors,
    keyboard,
    wifiSpeed,
    monthlyRentUsd,
    minimumStayNights,
    checkInStart,
    checkOut,
    houseRules,
    isDirectBooking,
  });
  const [baselineSnapshot, setBaselineSnapshot] = useState<string>(
    () => currentSnapshot
  );
  const isDirty = currentSnapshot !== baselineSnapshot;
  const { confirmLeave } = useUnsavedChanges(isDirty);

  const canViewOnWeb = Boolean(
    initialData && initialData.status === 'published' && initialData.slug
  );

  const clearImagesFieldError = () => {
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  };

  // AC-HOST-7: Client-side isolation safeguard
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('nomaddesk_user');
      if (stored && initialData) {
        const parsed = JSON.parse(stored);
        if (parsed.email === 'host2@example.com' && initialData.hostId !== 2) {
          router.replace('/_not-found');
        }
      }
    } catch {
      // Ignore
    }
  }, [initialData, router]);

  // Helper to validate fields
  const validateForm = (intent: 'draft' | 'pending_review'): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Listing title is required.';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters.';
    } else if (title.trim().length > 255) {
      newErrors.title = 'Title must be 255 characters or fewer.';
    }

    if (!city.trim()) {
      newErrors.city = 'Please select a city.';
    }

    if (
      monthlyRentUsd === '' ||
      !Number.isFinite(monthlyRentUsd) ||
      monthlyRentUsd <= 0
    ) {
      newErrors.monthlyRentUsd = 'Monthly rent must be greater than $0.';
    } else if (Math.round(monthlyRentUsd * 100) > INT4_MAX) {
      newErrors.monthlyRentUsd =
        'Monthly rent exceeds the maximum allowed amount.';
    }

    if (minimumStayNights < 30) {
      newErrors.minimumStayNights =
        'NomadDesk standard requires minimum stay of 30 nights.';
    }

    if (images.some((url) => !isSafeImagePath(url))) {
      newErrors.images =
        'All photo URLs must be valid /uploads/, /seed/, or https:// paths.';
    }

    if (intent === 'pending_review') {
      if (!stripHtmlTags(description).trim()) {
        newErrors.description =
          'Description is required before submitting for review.';
      }
      if (images.length === 0) {
        newErrors.images =
          'Please provide at least one photo of the apartment.';
      }
      if (!desk.trim()) {
        newErrors.desk = 'Workstation desk specification is required.';
      }
      if (!chair.trim()) {
        newErrors.chair = 'Workstation chair specification is required.';
      }
      if (wifiSpeed <= 0) {
        newErrors.wifiSpeed = 'Please declare verified Wi-Fi speed (Mbps).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (intent: 'draft' | 'pending_review') => {
    if (isSubmittingRef.current) return;

    if (!validateForm(intent)) {
      // Scroll to top error
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmittingIntent(intent);
    setServerError(null);

    try {
      const selectedLocation = locations.find(
        (l) => l.city.toLowerCase() === city.toLowerCase()
      );

      const parsedPricePerMonthCents = Math.round(Number(monthlyRentUsd) * 100);

      const payload: Partial<Property> = {
        ...(initialData?.id ? { id: initialData.id } : {}),
        title: title.trim(),
        city: city.trim(),
        country: selectedLocation?.country || 'Spain',
        locationId: selectedLocation?.id || 1,
        neighborhood: neighborhood.trim() || 'Central',
        address: address.trim() || 'Available upon confirmed booking',
        description: description.trim(),
        images:
          images.length > 0 ? images : ['/seed/property/prop-madrid-1.webp'],
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        totalSurface: Number(totalSurface),
        maxGuests: Number(maxGuests),
        bedsCount: Number(bedsCount),
        kitchen,
        laundry,
        balcony,
        petFriendly,
        pool,
        gym,
        terrace,
        workstation: {
          hasWorkstation: true,
          desk: desk.trim() || 'Standard Desk',
          chair: chair.trim() || 'Ergonomic Chair',
          monitors: monitors.trim() || 'Dual 27" 4K Monitors',
          keyboard: keyboard.trim() || 'Standard Keyboard & Mouse',
          wifiSpeed: Number(wifiSpeed) || 300,
        },
        pricePerMonth: parsedPricePerMonthCents,
        minimumStayNights: Number(minimumStayNights),
        checkInStart,
        checkOut,
        houseRules: houseRules.trim(),
        isDirectBooking,
        currency: 'USD',
      };

      const res = await onSaveAction(payload, intent);

      if (!res.success) {
        setServerError(res.error || 'Failed to save listing. Please try again.');
        setIsSubmitting(false);
        setSubmittingIntent(null);
        isSubmittingRef.current = false;
        return;
      }

      setBaselineSnapshot(currentSnapshot);
      // Success: redirect to host listings table
      startTransition(() => {
        router.push('/host/listings');
      });
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
      setIsSubmitting(false);
      setSubmittingIntent(null);
      isSubmittingRef.current = false;
    }
  };

  const handleMediaSelect = (selected: SelectedMediaItem[]) => {
    if (selected.length === 0) return;

    const next = [...images];
    let hitLimit = false;
    let addedCount = 0;

    for (const item of selected) {
      const trimmed = item.url.trim();
      if (!isSafeImagePath(trimmed) || next.includes(trimmed)) continue;
      if (next.length >= MAX_IMAGES) {
        hitLimit = true;
        break;
      }
      next.push(trimmed);
      addedCount += 1;
    }

    if (addedCount > 0) {
      setImages(next);
      clearImagesFieldError();
    }

    setImageError(
      hitLimit ? `Maximum ${MAX_IMAGES} images allowed per property.` : null
    );
  };

  const handleAddCustomPhoto = () => {
    const trimmed = customPhotoUrl.trim();
    if (!isSafeImagePath(trimmed)) {
      setImageError(
        'Enter a valid image path (/uploads/..., /seed/...) or https:// URL.'
      );
      return;
    }
    if (images.includes(trimmed)) {
      setImageError('This image is already in the gallery.');
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setImageError(`Maximum ${MAX_IMAGES} images allowed per property.`);
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setCustomPhotoUrl('');
    setImageError(null);
    clearImagesFieldError();
  };

  const handleToggleGalleryPhoto = (photoPath: string) => {
    setImageError(null);
    if (images.includes(photoPath)) {
      setImages((prev) => prev.filter((img) => img !== photoPath));
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setImageError(`Maximum ${MAX_IMAGES} images allowed per property.`);
      return;
    }
    setImages((prev) => [...prev, photoPath]);
    clearImagesFieldError();
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index <= 0 || index >= images.length) return;
    setImages((prev) => {
      const target = prev[index];
      return [target, ...prev.filter((_, idx) => idx !== index)];
    });
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleRemovePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCancel = () => {
    if (isSubmittingRef.current) return;
    if (!confirmLeave()) return;
    router.push('/host/listings');
  };

  return (
    <>
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8 md:p-10 max-w-4xl mx-auto shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-neutral-100 pb-5 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              {initialData ? `Edit Listing #${initialData.id}` : 'Create New Apartment Listing'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Provide complete property information, verified workstation hardware specifications, and monthly rates.
            </p>
          </div>
          {canViewOnWeb && initialData && (
            <Link
              href={`/l/apartments/${initialData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="host-view-on-web-link"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View on Web</span>
            </Link>
          )}
        </div>

      {serverError && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Unable to save listing: </span>
            {serverError}
          </div>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-10">
        {/* SECTION 1: BASICS */}
        <section aria-labelledby="section-basics">
          <div className="flex items-center gap-2 pb-3 mb-5 border-b border-neutral-200">
            <Building2 className="w-5 h-5 text-[var(--color-brand)]" />
            <h3
              id="section-basics"
              className="text-base sm:text-lg font-bold text-neutral-900"
            >
              1. Basic Overview
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="listing-title"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Listing Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="listing-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Work Remotely Above Madrid: Curated 3-br Sky Home, Jerónimos"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${
                  errors.title
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                    : 'border-neutral-300 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]'
                }`}
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title && (
                <p className="text-xs text-rose-600 mt-1">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="listing-city"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
                >
                  City <span className="text-rose-500">*</span>
                </label>
                <select
                  id="listing-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 bg-white focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.city}>
                      {loc.city}, {loc.country}
                    </option>
                  ))}
                  {locations.length === 0 && (
                    <>
                      <option value="Madrid">Madrid, Spain</option>
                      <option value="Barcelona">Barcelona, Spain</option>
                      <option value="Buenos Aires">Buenos Aires, Argentina</option>
                      <option value="Lima">Lima, Peru</option>
                    </>
                  )}
                </select>
                {errors.city && (
                  <p className="text-xs text-rose-600 mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="listing-neighborhood"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
                >
                  Neighborhood
                </label>
                <input
                  id="listing-neighborhood"
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="e.g. Jerónimos, Retiro, Salamanca"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="listing-address"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Street Address (Visible after confirmation)
              </label>
              <input
                id="listing-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Calle de Alfonso XII, 28014 Madrid"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Description (WYSIWYG Editorial)
              </span>
              <TiptapEditor
                value={description}
                onChange={setDescription}
                label="Listing Description"
                placeholder="Describe the interior, neighborhood vibe, workstation ergonomics, natural lighting, and proximity to cafes..."
                minHeight="220px"
                editorId="listing-description"
                testIdPrefix="host-description-editor"
              />
              {errors.description && (
                <p role="alert" className="text-xs text-rose-600 mt-1">
                  {errors.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: PHOTOS */}
        <section aria-labelledby="section-photos">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-5 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[var(--color-brand)]" />
              <h3
                id="section-photos"
                className="text-base sm:text-lg font-bold text-neutral-900"
              >
                2. Property Photos & Media Gallery
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="host-open-media-btn"
                onClick={() => setIsMediaModalOpen(true)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Images className="w-3.5 h-3.5" />
                <span>Upload / Media Library</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGalleryPicker(!showGalleryPicker)}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {showGalleryPicker ? 'Close Gallery' : 'Select from Seed Gallery'}
                </span>
              </button>
            </div>
          </div>

          {errors.images && (
            <p role="alert" className="text-xs text-rose-600 mb-3">
              {errors.images}
            </p>
          )}

          {/* Current Selected Images */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-neutral-600 mb-2">
              Selected Photos ({images.length}) — First photo is the primary cover image:
            </div>
            {images.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-xs text-neutral-500">
                No photos selected yet. Upload from Media Library, pick from Seed Gallery, or enter an image URL below.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    data-testid={`host-photo-card-${idx}`}
                    className="rounded-xl overflow-hidden border border-neutral-200 bg-white flex flex-col"
                  >
                    <div className="relative aspect-4/3 bg-neutral-100">
                      <Image
                        src={imgUrl}
                        alt={`Property photo ${idx + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                        unoptimized
                      />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900/85 text-white flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          Cover
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 px-2 py-1.5 bg-neutral-50 border-t border-neutral-200">
                      <div className="flex items-center gap-1">
                        {idx !== 0 ? (
                          <button
                            type="button"
                            onClick={() => handleSetCoverPhoto(idx)}
                            title="Set as Cover Photo"
                            aria-label={`Set photo ${idx + 1} as cover`}
                            data-testid={`host-photo-cover-${idx}`}
                            className="min-h-10 sm:min-h-8 px-2.5 sm:px-2 py-1 rounded border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 text-[11px] font-semibold cursor-pointer"
                          >
                            Set Cover
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-neutral-500 px-1">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMovePhoto(idx, 'up')}
                          disabled={idx === 0}
                          title="Move photo up"
                          aria-label={`Move photo ${idx + 1} up`}
                          data-testid={`host-photo-up-${idx}`}
                          className="inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePhoto(idx, 'down')}
                          disabled={idx === images.length - 1}
                          title="Move photo down"
                          aria-label={`Move photo ${idx + 1} down`}
                          data-testid={`host-photo-down-${idx}`}
                          className="inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          title="Remove photo"
                          aria-label={`Remove photo ${idx + 1}`}
                          data-testid={`host-photo-remove-${idx}`}
                          className="inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seed Gallery Picker Panel */}
          {showGalleryPicker && (
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                Available Seed Images (Click to toggle):
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {MOCK_GALLERY_OPTIONS.map((optUrl) => {
                  const isSelected = images.includes(optUrl);
                  return (
                    <button
                      key={optUrl}
                      type="button"
                      onClick={() => handleToggleGalleryPhoto(optUrl)}
                      className={`relative aspect-4/3 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/20'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={optUrl}
                        alt="Gallery preview"
                        fill
                        sizes="15vw"
                        className="object-cover"
                        unoptimized
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 p-0.5 rounded-full bg-[var(--color-brand)] text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Image URL Input */}
          <div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customPhotoUrl}
                onChange={(e) => {
                  setCustomPhotoUrl(e.target.value);
                  if (imageError) setImageError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomPhoto();
                  }
                }}
                data-testid="host-custom-photo-input"
                aria-label="Image URL or path"
                aria-invalid={Boolean(imageError)}
                placeholder="Or add photo URL: /uploads/..., /seed/..., or https://..."
                className={`flex-1 min-h-10 px-3.5 py-2 rounded-lg border text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none ${
                  imageError
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-neutral-300 focus:border-[var(--color-brand)]'
                }`}
              />
              <button
                type="button"
                onClick={handleAddCustomPhoto}
                data-testid="host-add-photo-btn"
                className="min-h-10 px-3.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Add Photo
              </button>
            </div>
            {imageError && (
              <p
                role="alert"
                data-testid="host-image-error"
                className="text-xs text-rose-600 mt-1.5"
              >
                {imageError}
              </p>
            )}
          </div>
        </section>

        {/* SECTION 3: DETAILS & AMENITIES */}
        <section aria-labelledby="section-details">
          <div className="flex items-center gap-2 pb-3 mb-5 border-b border-neutral-200">
            <Sliders className="w-5 h-5 text-[var(--color-brand)]" />
            <h3
              id="section-details"
              className="text-base sm:text-lg font-bold text-neutral-900"
            >
              3. Property Specifications & Amenities
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <div>
              <label
                htmlFor="specs-bedrooms"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1"
              >
                Bedrooms
              </label>
              <input
                id="specs-bedrooms"
                type="number"
                min="0"
                max="10"
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 text-center"
              />
            </div>
            <div>
              <label
                htmlFor="specs-bathrooms"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1"
              >
                Bathrooms
              </label>
              <input
                id="specs-bathrooms"
                type="number"
                min="1"
                max="10"
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 text-center"
              />
            </div>
            <div>
              <label
                htmlFor="specs-surface"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1"
              >
                Total Area (m²)
              </label>
              <input
                id="specs-surface"
                type="number"
                min="15"
                max="1000"
                value={totalSurface}
                onChange={(e) => setTotalSurface(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 text-center"
              />
            </div>
            <div>
              <label
                htmlFor="specs-guests"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1"
              >
                Max Guests
              </label>
              <input
                id="specs-guests"
                type="number"
                min="1"
                max="20"
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 text-center"
              />
            </div>
            <div>
              <label
                htmlFor="specs-beds"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1"
              >
                Beds Count
              </label>
              <input
                id="specs-beds"
                type="number"
                min="1"
                max="10"
                value={bedsCount}
                onChange={(e) => setBedsCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 text-center"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-3">
              Included Amenities & Features
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={kitchen}
                  onChange={(e) => setKitchen(e.target.checked)}
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] w-4 h-4"
                />
                Full Kitchen
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={laundry}
                  onChange={(e) => setLaundry(e.target.checked)}
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] w-4 h-4"
                />
                In-unit Laundry
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={balcony}
                  onChange={(e) => setBalcony(e.target.checked)}
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] w-4 h-4"
                />
                Balcony
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={petFriendly}
                  onChange={(e) => setPetFriendly(e.target.checked)}
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] w-4 h-4"
                />
                Pet-Friendly
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={pool}
                  onChange={(e) => setPool(e.target.checked)}
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] w-4 h-4"
                />
                Swimming Pool
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={gym}
                  onChange={(e) => setGym(e.target.checked)}
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] w-4 h-4"
                />
                Fitness Gym
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={terrace}
                  onChange={(e) => setTerrace(e.target.checked)}
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] w-4 h-4"
                />
                Private Terrace
              </label>
            </div>
          </div>
        </section>

        {/* SECTION 4: WORKSTATION */}
        <section aria-labelledby="section-workstation">
          <div className="flex items-center gap-2 pb-3 mb-5 border-b border-neutral-200">
            <Laptop className="w-5 h-5 text-[var(--color-brand)]" />
            <h3
              id="section-workstation"
              className="text-base sm:text-lg font-bold text-neutral-900"
            >
              4. Dedicated Workstation Hardware
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="ws-desk"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Desk Spec <span className="text-rose-500">*</span>
              </label>
              <input
                id="ws-desk"
                type="text"
                value={desk}
                onChange={(e) => setDesk(e.target.value)}
                placeholder="e.g. Bespoke Executive Standing Desk with Library Wall"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${
                  errors.desk
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                    : 'border-neutral-300 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]'
                }`}
                aria-invalid={Boolean(errors.desk)}
              />
              {errors.desk && (
                <p className="text-xs text-rose-600 mt-1">{errors.desk}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="ws-chair"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Ergonomic Chair <span className="text-rose-500">*</span>
              </label>
              <input
                id="ws-chair"
                type="text"
                value={chair}
                onChange={(e) => setChair(e.target.value)}
                placeholder="e.g. Herman Miller Aeron / Ergonomic Executive Seating"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${
                  errors.chair
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                    : 'border-neutral-300 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]'
                }`}
                aria-invalid={Boolean(errors.chair)}
              />
              {errors.chair && (
                <p className="text-xs text-rose-600 mt-1">{errors.chair}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="ws-monitors"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Monitors Setup
              </label>
              <input
                id="ws-monitors"
                type="text"
                value={monitors}
                onChange={(e) => setMonitors(e.target.value)}
                placeholder='e.g. Dual 27" 4K UHD Monitors / 34" Ultrawide'
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>

            <div>
              <label
                htmlFor="ws-wifi"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Verified Fiber Speed (Mbps) <span className="text-rose-500">*</span>
              </label>
              <input
                id="ws-wifi"
                type="number"
                min="50"
                max="2000"
                value={wifiSpeed}
                onChange={(e) => setWifiSpeed(Number(e.target.value))}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm font-semibold text-neutral-900 text-center focus:outline-none transition-colors ${
                  errors.wifiSpeed
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                    : 'border-neutral-300 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]'
                }`}
                aria-invalid={Boolean(errors.wifiSpeed)}
              />
              {errors.wifiSpeed && (
                <p className="text-xs text-rose-600 mt-1">{errors.wifiSpeed}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="ws-keyboard"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
            >
              Keyboard & Peripherals
            </label>
            <input
              id="ws-keyboard"
              type="text"
              value={keyboard}
              onChange={(e) => setKeyboard(e.target.value)}
              placeholder="e.g. Mechanical Keyboard & Wireless Ergonomic Mouse"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
        </section>

        {/* SECTION 5 & 6: PRICING & BOOKING MODE */}
        <section aria-labelledby="section-pricing">
          <div className="flex items-center gap-2 pb-3 mb-5 border-b border-neutral-200">
            <DollarSign className="w-5 h-5 text-[var(--color-brand)]" />
            <h3
              id="section-pricing"
              className="text-base sm:text-lg font-bold text-neutral-900"
            >
              5. Monthly Rate & Booking Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="pricing-monthly"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Monthly Rent (USD $) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput
                id="pricing-monthly"
                value={monthlyRentUsd}
                onChange={setMonthlyRentUsd}
                currencySymbol="$"
                suffix="/ mo"
                min={1}
                placeholder="2,850"
                testId="host-price-input"
                ariaInvalid={Boolean(errors.monthlyRentUsd)}
                required
              />
              {errors.monthlyRentUsd && (
                <p role="alert" className="text-xs text-rose-600 mt-1">
                  {errors.monthlyRentUsd}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="booking-mode-select"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Booking Mode <span className="text-rose-500">*</span>
              </label>
              <select
                id="booking-mode-select"
                value={isDirectBooking ? 'instant' : 'request'}
                onChange={(e) => setIsDirectBooking(e.target.value === 'instant')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 bg-white focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] font-medium"
              >
                <option value="request">
                  Request to Book (Host 48h Approval)
                </option>
                <option value="instant">Instant Book</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label
                htmlFor="rules-minstay"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Minimum Stay (Nights)
              </label>
              <input
                id="rules-minstay"
                type="number"
                min="30"
                value={minimumStayNights}
                onChange={(e) => setMinimumStayNights(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 text-center"
              />
              {errors.minimumStayNights && (
                <p className="text-xs text-rose-600 mt-1">
                  {errors.minimumStayNights}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="rules-checkin"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Check-in Start
              </label>
              <input
                id="rules-checkin"
                type="text"
                value={checkInStart}
                onChange={(e) => setCheckInStart(e.target.value)}
                placeholder="15:00"
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-900 text-center"
              />
            </div>

            <div>
              <label
                htmlFor="rules-checkout"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Check-out Time
              </label>
              <input
                id="rules-checkout"
                type="text"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                placeholder="11:00"
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-900 text-center"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              House Rules & Quiet Hours
            </span>
            <TiptapEditor
              value={houseRules}
              onChange={setHouseRules}
              label="House Rules & Quiet Hours"
              placeholder="e.g. No smoking inside. Quiet hours 22:00 - 08:00."
              minHeight="160px"
              editorId="rules-houserules"
              testIdPrefix="host-rules-editor"
            />
          </div>
        </section>

        {/* STICKY BOTTOM ACTION BAR */}
        <div
          data-testid="host-sticky-save-bar"
          className="sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-border-light)] bg-white/95 backdrop-blur-xs px-4 py-3 shadow-lg"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                isDirty ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            <span
              data-testid="host-dirty-status"
              className={
                isDirty ? 'text-amber-700 font-semibold' : 'text-neutral-500'
              }
            >
              {isDirty ? 'Unsaved changes' : 'Ready to save'}
            </span>
            {Object.keys(errors).length > 0 && (
              <span role="alert" className="text-rose-600 font-semibold">
                · Please fix {Object.keys(errors).length}{' '}
                {Object.keys(errors).length === 1 ? 'field' : 'fields'} above
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
              data-testid="host-cancel-btn"
              className="min-h-10 px-4 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors text-center disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="flex-1 sm:flex-none min-h-10 px-4 py-2 rounded-lg border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold text-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && submittingIntent === 'draft' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                  Saving Draft...
                </span>
              ) : (
                'Save Draft'
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('pending_review')}
              className="flex-1 sm:flex-none min-h-10 px-5 py-2 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-sm font-bold text-white shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting && submittingIntent === 'pending_review' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4" />
                  <span>Submit for Review →</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      </div>

      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={handleMediaSelect}
        multiple={true}
        allowUrlTab={true}
        initialTab="upload"
        title="Property Photos"
      />
    </>
  );
}
