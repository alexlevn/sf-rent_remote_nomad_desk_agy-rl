'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building2,
  CalendarCheck,
  DollarSign,
  Image as ImageIcon,
  Laptop,
  Loader2,
  Plus,
  Save,
  Sliders,
  Star,
  Trash2,
} from 'lucide-react';
import type { HostProfile, Location, Property, PropertyStatus } from '@/lib/types';
import {
  createAdminPropertyAction,
  updateAdminPropertyAction,
} from '@/app/admin/admin-actions';
import { TiptapEditor } from '@/features/admin/tiptap-editor';

const SEED_GALLERY_OPTIONS = [
  '/seed/property/prop-madrid-1.webp',
  '/seed/property/prop-madrid-2.webp',
  '/seed/property/prop-madrid-3.webp',
  '/seed/property/prop-madrid-4.webp',
  '/seed/property/prop-barcelona-1.webp',
  '/seed/property/prop-barcelona-2.webp',
  '/seed/property/prop-buenos-aires-1.webp',
  '/seed/property/prop-lima-1.webp',
];

const MAX_IMAGES = 50;
const INT4_MAX = 2_147_483_647;

function isSafeImagePath(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/|\/)/i.test(trimmed);
}

interface AdminPropertyFormProps {
  initialData?: Property;
  hosts: HostProfile[];
  locations: Location[];
}

export function AdminPropertyForm({
  initialData,
  hosts,
  locations,
}: AdminPropertyFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(initialData);

  const defaultHostId = (() => {
    if (initialData?.hostId) return String(initialData.hostId);
    const approvedHost = hosts.find((h) => h.status === 'approved');
    if (approvedHost) return String(approvedHost.id);
    return hosts[0] ? String(hosts[0].id) : '';
  })();

  const defaultLocation = (() => {
    if (initialData?.locationId) {
      const byId = locations.find((l) => l.id === initialData.locationId);
      if (byId) return byId;
    }
    if (initialData?.city) {
      const byCity = locations.find(
        (l) => l.city.toLowerCase() === initialData.city.toLowerCase()
      );
      if (byCity) return byCity;
      // Preserve unmatched city in edit mode instead of silently overwriting with locations[0]
      return null;
    }
    return locations[0] ?? null;
  })();

  // Ownership, status & booking mode
  const [hostId, setHostId] = useState<string>(defaultHostId);
  const [status, setStatus] = useState<PropertyStatus>(
    initialData?.status ?? 'published'
  );
  const [isDirectBooking, setIsDirectBooking] = useState<boolean>(
    initialData?.isDirectBooking ?? true
  );

  // Basics & location
  const [title, setTitle] = useState<string>(initialData?.title ?? '');
  const [slug, setSlug] = useState<string>(initialData?.slug ?? '');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    defaultLocation ? String(defaultLocation.id) : ''
  );
  const [neighborhood, setNeighborhood] = useState<string>(
    initialData?.neighborhood ?? ''
  );
  const [address, setAddress] = useState<string>(initialData?.address ?? '');

  // Pricing & stay rules
  const [monthlyRentUsd, setMonthlyRentUsd] = useState<string>(
    initialData?.pricePerMonth != null
      ? String(Math.round(initialData.pricePerMonth / 100))
      : '2800'
  );
  const [minimumStayNights, setMinimumStayNights] = useState<string>(
    String(initialData?.minimumStayNights ?? 30)
  );
  const [checkInStart, setCheckInStart] = useState<string>(
    initialData?.checkInStart ?? '15:00'
  );
  const [checkOut, setCheckOut] = useState<string>(
    initialData?.checkOut ?? '11:00'
  );

  // Specs & amenities
  const [bedrooms, setBedrooms] = useState<string>(
    String(initialData?.bedrooms ?? 1)
  );
  const [bathrooms, setBathrooms] = useState<string>(
    String(initialData?.bathrooms ?? 1)
  );
  const [bedsCount, setBedsCount] = useState<string>(
    String(initialData?.bedsCount ?? 1)
  );
  const [totalSurface, setTotalSurface] = useState<string>(
    String(initialData?.totalSurface ?? 65)
  );
  const [maxGuests, setMaxGuests] = useState<string>(
    String(initialData?.maxGuests ?? 2)
  );

  const [kitchen, setKitchen] = useState<boolean>(initialData?.kitchen ?? true);
  const [laundry, setLaundry] = useState<boolean>(initialData?.laundry ?? true);
  const [balcony, setBalcony] = useState<boolean>(initialData?.balcony ?? false);
  const [petFriendly, setPetFriendly] = useState<boolean>(
    initialData?.petFriendly ?? false
  );
  const [pool, setPool] = useState<boolean>(initialData?.pool ?? false);
  const [gym, setGym] = useState<boolean>(initialData?.gym ?? false);
  const [terrace, setTerrace] = useState<boolean>(initialData?.terrace ?? false);

  // Workstation specs
  const [hasWorkstation, setHasWorkstation] = useState<boolean>(
    initialData?.workstation?.hasWorkstation ?? true
  );
  const [desk, setDesk] = useState<string>(
    initialData?.workstation?.desk ?? 'Ergonomic Standing Desk'
  );
  const [chair, setChair] = useState<string>(
    initialData?.workstation?.chair ?? 'Herman Miller Aeron'
  );
  const [monitors, setMonitors] = useState<string>(
    initialData?.workstation?.monitors ?? '27" 4K UHD Monitor'
  );
  const [keyboard, setKeyboard] = useState<string>(
    initialData?.workstation?.keyboard ?? 'Mechanical Keyboard & Wireless Mouse'
  );
  const [wifiSpeed, setWifiSpeed] = useState<string>(
    String(initialData?.workstation?.wifiSpeed ?? 600)
  );

  // Photos manager
  const [images, setImages] = useState<string[]>(
    initialData?.images && initialData.images.length > 0
      ? initialData.images
      : ['/seed/property/prop-madrid-1.webp']
  );
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [showSeedPicker, setShowSeedPicker] = useState<boolean>(false);

  // Rich content (Tiptap)
  const [description, setDescription] = useState<string>(
    initialData?.description ?? ''
  );
  const [houseRules, setHouseRules] = useState<string>(
    initialData?.houseRules ??
      '<p>No smoking inside. Quiet hours 22:00 - 08:00.</p>'
  );

  // Form submission & validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  const handleAddImage = () => {
    const trimmed = newImageUrl.trim();
    if (!isSafeImagePath(trimmed)) {
      setImageError(
        'Enter a valid image path (/seed/..., /uploads/...) or https:// URL.'
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
    setNewImageUrl('');
    setImageError(null);
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  };

  const handleToggleSeedImage = (url: string) => {
    setImageError(null);
    setImages((prev) => {
      if (prev.includes(url)) {
        return prev.filter((item) => item !== url);
      }
      if (prev.length >= MAX_IMAGES) return prev;
      return [...prev, url];
    });
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
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

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    const parsedHostId = Number(hostId);
    if (!Number.isInteger(parsedHostId) || parsedHostId <= 0) {
      nextErrors.hostId = 'Please select an owning host.';
    }

    if (!title.trim()) {
      nextErrors.title = 'Property title is required.';
    } else if (title.trim().length > 255) {
      nextErrors.title = 'Title must be 255 characters or fewer.';
    }

    if (slug.trim() && !/^[a-z0-9-]+$/i.test(slug.trim())) {
      nextErrors.slug = 'Slug may only contain letters, numbers, and hyphens.';
    }

    const chosenLocation = locations.find(
      (l) => String(l.id) === selectedLocationId
    );
    if (!chosenLocation && !initialData?.city) {
      nextErrors.city = 'Please select a destination city.';
    }

    const rentNum = Number(monthlyRentUsd);
    if (!Number.isFinite(rentNum) || rentNum <= 0) {
      nextErrors.monthlyRentUsd = 'Monthly rent must be greater than $0.';
    } else if (Math.round(rentNum * 100) > INT4_MAX) {
      nextErrors.monthlyRentUsd = 'Monthly rent exceeds the maximum allowed amount.';
    }

    const minStayNum = Number(minimumStayNights);
    if (!Number.isInteger(minStayNum) || minStayNum < 30 || minStayNum > 3650) {
      nextErrors.minimumStayNights =
        'Minimum stay must be an integer between 30 and 3650 nights.';
    }

    const bedroomsNum = Number(bedrooms);
    if (!Number.isInteger(bedroomsNum) || bedroomsNum < 0 || bedroomsNum > 50) {
      nextErrors.bedrooms = 'Bedrooms must be between 0 and 50.';
    }

    const bathroomsNum = Number(bathrooms);
    if (
      !Number.isInteger(bathroomsNum) ||
      bathroomsNum < 0 ||
      bathroomsNum > 50
    ) {
      nextErrors.bathrooms = 'Bathrooms must be between 0 and 50.';
    }

    const bedsNum = Number(bedsCount);
    if (!Number.isInteger(bedsNum) || bedsNum < 0 || bedsNum > 50) {
      nextErrors.bedsCount = 'Beds count must be between 0 and 50.';
    }

    const surfaceNum = Number(totalSurface);
    if (
      !Number.isInteger(surfaceNum) ||
      surfaceNum < 0 ||
      surfaceNum > 100000
    ) {
      nextErrors.totalSurface = 'Total surface must be between 0 and 100,000 m².';
    }

    const guestsNum = Number(maxGuests);
    if (!Number.isInteger(guestsNum) || guestsNum < 1 || guestsNum > 50) {
      nextErrors.maxGuests = 'Max guests must be between 1 and 50.';
    }

    const wifiNum = Number(wifiSpeed);
    if (!Number.isInteger(wifiNum) || wifiNum < 0 || wifiNum > 100000) {
      nextErrors.wifiSpeed = 'Wi-Fi speed must be between 0 and 100,000 Mbps.';
    }

    if (images.length === 0) {
      nextErrors.images = 'Add at least one property photo.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setServerError(null);

    if (!validate()) {
      return;
    }

    const chosenLocation = locations.find(
      (l) => String(l.id) === selectedLocationId
    );
    const parsedHostId = Number(hostId);
    const trimmedSlug = slug.trim().toLowerCase();

    const payload: Partial<Property> & { hostId: number } = {
      hostId: parsedHostId,
      title: title.trim(),
      ...(trimmedSlug ? { slug: trimmedSlug } : {}),
      locationId: chosenLocation?.id ?? initialData?.locationId,
      city: chosenLocation?.city ?? initialData?.city ?? 'Madrid',
      country: chosenLocation?.country ?? initialData?.country ?? 'Spain',
      neighborhood: neighborhood.trim(),
      address: address.trim(),
      pricePerMonth: Math.round(Number(monthlyRentUsd) * 100),
      currency: initialData?.currency ?? 'USD',
      minimumStayNights: Number(minimumStayNights),
      checkInStart: checkInStart.trim() || '15:00',
      checkOut: checkOut.trim() || '11:00',
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      bedsCount: Number(bedsCount),
      totalSurface: Number(totalSurface),
      maxGuests: Number(maxGuests),
      kitchen,
      laundry,
      balcony,
      petFriendly,
      pool,
      gym,
      terrace,
      workstation: {
        hasWorkstation,
        desk: desk.trim(),
        chair: chair.trim(),
        monitors: monitors.trim(),
        keyboard: keyboard.trim(),
        wifiSpeed: Number(wifiSpeed),
      },
      images,
      isDirectBooking,
      status,
      description,
      houseRules,
    };

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (isEditMode && initialData) {
        const updated = await updateAdminPropertyAction(initialData.id, payload);
        if (!updated) {
          throw new Error('Property not found or could not be updated.');
        }
      } else {
        await createAdminPropertyAction(payload);
      }

      router.push('/admin/properties');
      router.refresh();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'Failed to save property.'
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full text-sm py-2 px-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/25';
  const labelClass =
    'block text-xs font-semibold text-[var(--color-text-on-light)] mb-1';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/properties"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Property Inventory
        </Link>

        {isEditMode && initialData && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)]">
            <span className="font-mono">{initialData.reference}</span>
            <span>·</span>
            <span>ID #{initialData.id}</span>
          </div>
        )}
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div
          role="alert"
          data-testid="property-form-error"
          className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to save property</p>
            <p className="text-xs mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {/* Section 1: Ownership, Status & Basic Info */}
      <section className="bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl p-6 space-y-5 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <Building2 className="w-4 h-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
            1. Ownership, Status & Location
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Host Owner */}
          <div>
            <label htmlFor="property-host" className={labelClass}>
              Owning Host <span className="text-red-500">*</span>
            </label>
            <select
              id="property-host"
              data-testid="property-host-select"
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select a host...</option>
              {hosts.map((h) => (
                <option key={h.id} value={String(h.id)}>
                  {h.displayName} (Host #{h.id} · {h.status})
                </option>
              ))}
            </select>
            {errors.hostId && (
              <p className="text-xs text-red-600 mt-1">{errors.hostId}</p>
            )}
          </div>

          {/* Listing Status */}
          <div>
            <label htmlFor="property-status" className={labelClass}>
              Publication Status
            </label>
            <select
              id="property-status"
              data-testid="property-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as PropertyStatus)}
              className={inputClass}
            >
              <option value="published">Published (Visible publicly)</option>
              <option value="pending_review">Pending Review</option>
              <option value="hidden">Hidden (Removed from search)</option>
              <option value="draft">Draft</option>
              {initialData?.status === 'rejected' && (
                <option value="rejected">Rejected</option>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label htmlFor="property-title" className={labelClass}>
              Property Title <span className="text-red-500">*</span>
            </label>
            <input
              id="property-title"
              data-testid="property-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunlit 2BR Penthouse with Dual-Monitor Desk"
              className={inputClass}
              required
            />
            {errors.title && (
              <p className="text-xs text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="property-slug" className={labelClass}>
              URL Slug{' '}
              <span className="font-normal text-[var(--color-text-on-light-muted)]">
                (auto-generated if blank)
              </span>
            </label>
            <input
              id="property-slug"
              data-testid="property-slug-input"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. sunlit-2br-penthouse-madrid"
              className={inputClass}
            />
            {errors.slug && (
              <p className="text-xs text-red-600 mt-1">{errors.slug}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* City (from locations) */}
          <div>
            <label htmlFor="property-city" className={labelClass}>
              Destination City <span className="text-red-500">*</span>
            </label>
            <select
              id="property-city"
              data-testid="property-city-select"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">
                {initialData?.city && !defaultLocation
                  ? `${initialData.city}${initialData.country ? `, ${initialData.country}` : ''} (Current)`
                  : 'Select a city...'}
              </option>
              {locations.map((loc) => (
                <option key={loc.id} value={String(loc.id)}>
                  {loc.city}, {loc.country}
                  {!loc.isActive ? ' (Inactive)' : ''}
                </option>
              ))}
            </select>
            {errors.city && (
              <p className="text-xs text-red-600 mt-1">{errors.city}</p>
            )}
          </div>

          {/* Neighborhood */}
          <div>
            <label htmlFor="property-neighborhood" className={labelClass}>
              Neighborhood
            </label>
            <input
              id="property-neighborhood"
              data-testid="property-neighborhood-input"
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="e.g. Salamanca, Eixample, Palermo"
              className={inputClass}
            />
          </div>

          {/* Address */}
          <div>
            <label htmlFor="property-address" className={labelClass}>
              Street Address
            </label>
            <input
              id="property-address"
              data-testid="property-address-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Calle de Serrano 42"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Section 2: Pricing, Stay Rules & Booking Mode */}
      <section className="bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl p-6 space-y-5 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <DollarSign className="w-4 h-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
            2. Pricing, Minimum Stay & Booking Mode
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="property-price" className={labelClass}>
              Monthly Rent (USD) <span className="text-red-500">*</span>
            </label>
            <input
              id="property-price"
              data-testid="property-price-input"
              type="number"
              min={1}
              step={1}
              value={monthlyRentUsd}
              onChange={(e) => setMonthlyRentUsd(e.target.value)}
              className={inputClass}
              required
            />
            {errors.monthlyRentUsd && (
              <p className="text-xs text-red-600 mt-1">
                {errors.monthlyRentUsd}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="property-min-stay" className={labelClass}>
              Minimum Stay (Nights ≥ 30) <span className="text-red-500">*</span>
            </label>
            <input
              id="property-min-stay"
              data-testid="property-min-stay-input"
              type="number"
              min={30}
              max={3650}
              step={1}
              value={minimumStayNights}
              onChange={(e) => setMinimumStayNights(e.target.value)}
              className={inputClass}
              required
            />
            {errors.minimumStayNights && (
              <p className="text-xs text-red-600 mt-1">
                {errors.minimumStayNights}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="property-checkin" className={labelClass}>
              Check-in Start
            </label>
            <input
              id="property-checkin"
              type="text"
              value={checkInStart}
              onChange={(e) => setCheckInStart(e.target.value)}
              placeholder="15:00"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="property-checkout" className={labelClass}>
              Check-out Time
            </label>
            <input
              id="property-checkout"
              type="text"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              placeholder="11:00"
              className={inputClass}
            />
          </div>
        </div>

        {/* Booking Mode */}
        <div className="space-y-2">
          <span className={labelClass}>Booking Mode</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsDirectBooking(true)}
              data-testid="booking-mode-instant"
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                isDirectBooking
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                  : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
              }`}
            >
              <CalendarCheck
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isDirectBooking ? 'text-[var(--color-brand)]' : 'text-neutral-400'
                }`}
              />
              <div>
                <div className="text-sm font-semibold text-[var(--color-text-on-light)]">
                  Instant Booking
                </div>
                <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                  Guests confirm immediately upon checkout without waiting for host approval.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsDirectBooking(false)}
              data-testid="booking-mode-request"
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                !isDirectBooking
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                  : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
              }`}
            >
              <CalendarCheck
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  !isDirectBooking ? 'text-[var(--color-brand)]' : 'text-neutral-400'
                }`}
              />
              <div>
                <div className="text-sm font-semibold text-[var(--color-text-on-light)]">
                  Request to Book
                </div>
                <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                  Host has 48 hours to review and accept or decline each reservation request.
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Capacity, Dimensions & Amenities */}
      <section className="bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl p-6 space-y-5 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <Sliders className="w-4 h-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
            3. Property Specs & Amenities
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="property-bedrooms" className={labelClass}>
              Bedrooms
            </label>
            <input
              id="property-bedrooms"
              type="number"
              min={0}
              max={50}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className={inputClass}
            />
            {errors.bedrooms && (
              <p className="text-xs text-red-600 mt-1">{errors.bedrooms}</p>
            )}
          </div>

          <div>
            <label htmlFor="property-bathrooms" className={labelClass}>
              Bathrooms
            </label>
            <input
              id="property-bathrooms"
              type="number"
              min={0}
              max={50}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              className={inputClass}
            />
            {errors.bathrooms && (
              <p className="text-xs text-red-600 mt-1">{errors.bathrooms}</p>
            )}
          </div>

          <div>
            <label htmlFor="property-beds" className={labelClass}>
              Beds
            </label>
            <input
              id="property-beds"
              type="number"
              min={0}
              max={50}
              value={bedsCount}
              onChange={(e) => setBedsCount(e.target.value)}
              className={inputClass}
            />
            {errors.bedsCount && (
              <p className="text-xs text-red-600 mt-1">{errors.bedsCount}</p>
            )}
          </div>

          <div>
            <label htmlFor="property-surface" className={labelClass}>
              Surface (m²)
            </label>
            <input
              id="property-surface"
              type="number"
              min={0}
              max={100000}
              value={totalSurface}
              onChange={(e) => setTotalSurface(e.target.value)}
              className={inputClass}
            />
            {errors.totalSurface && (
              <p className="text-xs text-red-600 mt-1">{errors.totalSurface}</p>
            )}
          </div>

          <div>
            <label htmlFor="property-max-guests" className={labelClass}>
              Max Guests
            </label>
            <input
              id="property-max-guests"
              type="number"
              min={1}
              max={50}
              value={maxGuests}
              onChange={(e) => setMaxGuests(e.target.value)}
              className={inputClass}
            />
            {errors.maxGuests && (
              <p className="text-xs text-red-600 mt-1">{errors.maxGuests}</p>
            )}
          </div>
        </div>

        {/* Amenities Checkboxes */}
        <div>
          <span className={labelClass}>Included Amenities</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-1.5">
            {(
              [
                ['Kitchen', kitchen, setKitchen],
                ['Laundry', laundry, setLaundry],
                ['Balcony', balcony, setBalcony],
                ['Pet Friendly', petFriendly, setPetFriendly],
                ['Pool', pool, setPool],
                ['Gym', gym, setGym],
                ['Terrace', terrace, setTerrace],
              ] as const
            ).map(([label, checked, setter]) => (
              <label
                key={label}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  checked
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                    : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-[var(--color-text-on-light)] hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setter(e.target.checked)}
                  className="accent-[var(--color-brand)]"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Remote Workstation Specifications */}
      <section className="bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl p-6 space-y-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-[var(--color-brand)]" />
            <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
              4. Remote Workstation Specs
            </h2>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-on-light)] cursor-pointer">
            <input
              type="checkbox"
              checked={hasWorkstation}
              onChange={(e) => setHasWorkstation(e.target.checked)}
              className="accent-[var(--color-brand)]"
            />
            <span>Includes Dedicated Workstation</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="ws-desk" className={labelClass}>
              Desk
            </label>
            <input
              id="ws-desk"
              type="text"
              value={desk}
              onChange={(e) => setDesk(e.target.value)}
              placeholder="e.g. Ergonomic Standing Desk"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="ws-chair" className={labelClass}>
              Chair
            </label>
            <input
              id="ws-chair"
              type="text"
              value={chair}
              onChange={(e) => setChair(e.target.value)}
              placeholder="e.g. Herman Miller Aeron"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="ws-monitors" className={labelClass}>
              Monitor(s)
            </label>
            <input
              id="ws-monitors"
              type="text"
              value={monitors}
              onChange={(e) => setMonitors(e.target.value)}
              placeholder='e.g. Dual 27" 4K UHD Monitors'
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="ws-keyboard" className={labelClass}>
              Keyboard & Peripherals
            </label>
            <input
              id="ws-keyboard"
              type="text"
              value={keyboard}
              onChange={(e) => setKeyboard(e.target.value)}
              placeholder="e.g. Mechanical Keyboard & Wireless Mouse"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="ws-wifi" className={labelClass}>
              Verified Wi-Fi Speed (Mbps)
            </label>
            <input
              id="ws-wifi"
              type="number"
              min={0}
              max={100000}
              value={wifiSpeed}
              onChange={(e) => setWifiSpeed(e.target.value)}
              className={inputClass}
            />
            {errors.wifiSpeed && (
              <p className="text-xs text-red-600 mt-1">{errors.wifiSpeed}</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 5: Property Photos & Cover Ordering */}
      <section className="bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl p-6 space-y-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[var(--color-brand)]" />
            <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
              5. Property Photos ({images.length})
            </h2>
          </div>
          <span className="text-xs text-[var(--color-text-on-light-muted)]">
            First photo is used as the listing cover image. Use arrows to reorder.
          </span>
        </div>

        {/* Add Image URL / Path Input */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              data-testid="property-image-url-input"
              value={newImageUrl}
              onChange={(e) => {
                setNewImageUrl(e.target.value);
                if (imageError) setImageError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddImage();
                }
              }}
              placeholder="/seed/property/prop-madrid-2.webp or https://..."
              aria-label="Image URL or path"
              className="flex-1 min-w-56 text-sm py-2 px-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/25"
            />
            <button
              type="button"
              onClick={handleAddImage}
              data-testid="property-add-image-btn"
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5 text-xs px-3.5 py-2"
            >
              <Plus className="w-4 h-4" />
              Add Photo
            </button>
            <button
              type="button"
              onClick={() => setShowSeedPicker((prev) => !prev)}
              className="btn btn-outline btn-sm text-xs px-3 py-2"
            >
              {showSeedPicker ? 'Hide Seed Gallery' : 'Pick from Seed Gallery'}
            </button>
          </div>

          {imageError && (
            <p className="text-xs text-red-600" role="alert">
              {imageError}
            </p>
          )}
          {errors.images && (
            <p className="text-xs text-red-600" role="alert">
              {errors.images}
            </p>
          )}
        </div>

        {/* Optional Seed Gallery Picker */}
        {showSeedPicker && (
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
            <p className="text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-2.5">
              Click to add or remove seed photos:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SEED_GALLERY_OPTIONS.map((url) => {
                const selected = images.includes(url);
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => handleToggleSeedImage(url)}
                    className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      selected
                        ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/25'
                        : 'border-transparent hover:border-neutral-300'
                    }`}
                  >
                    <Image
                      src={url}
                      alt={url}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {selected && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[var(--color-brand)] text-white text-[10px] font-bold">
                        Added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ordered Photo List */}
        {images.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-[var(--color-border-light)] text-xs text-[var(--color-text-on-light-muted)]">
            No photos added yet. Add at least one photo URL or path above.
          </div>
        ) : (
          <ul className="space-y-2.5" data-testid="property-images-list">
            {images.map((img, idx) => (
              <li
                key={`${img}-${idx}`}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-neutral-50/70 dark:bg-neutral-800/40"
              >
                <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                  <Image
                    src={img}
                    alt={`Property photo ${idx + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-on-light)]">
                      Photo #{idx + 1}
                    </span>
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Cover
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-[var(--color-text-on-light-muted)] truncate">
                    {img}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveImage(idx, 'up')}
                    disabled={idx === 0}
                    title="Move up"
                    aria-label={`Move photo ${idx + 1} up`}
                    className="p-1.5 rounded-lg border border-[var(--color-border-light)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] hover:bg-neutral-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveImage(idx, 'down')}
                    disabled={idx === images.length - 1}
                    title="Move down"
                    aria-label={`Move photo ${idx + 1} down`}
                    className="p-1.5 rounded-lg border border-[var(--color-border-light)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] hover:bg-neutral-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    title="Remove photo"
                    aria-label={`Remove photo ${idx + 1}`}
                    className="p-1.5 rounded-lg border border-red-200 bg-white dark:bg-neutral-800 text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section 6: Rich Description & House Rules (Tiptap) */}
      <section className="bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl p-6 space-y-6 shadow-2xs">
        <div className="pb-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
            6. Description & House Rules
          </h2>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
            Supports rich formatting, lists, tables, links, and sanitized HTML.
          </p>
        </div>

        <div className="space-y-2">
          <span className={labelClass}>Property Description</span>
          <TiptapEditor
            value={description}
            onChange={setDescription}
            label="Property Description"
            placeholder="Describe the apartment layout, natural light, neighborhood highlights, and workspace..."
            minHeight="220px"
            testIdPrefix="property-description-editor"
          />
        </div>

        <div className="space-y-2">
          <span className={labelClass}>House Rules</span>
          <TiptapEditor
            value={houseRules}
            onChange={setHouseRules}
            label="House Rules & Check-in Notes"
            placeholder="Specify smoking rules, quiet hours, pet policy, and key handover notes..."
            minHeight="160px"
            testIdPrefix="property-rules-editor"
          />
        </div>
      </section>

      {/* Submit Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Link
          href="/admin/properties"
          className="btn btn-outline text-sm px-5 py-2.5"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="property-submit-btn"
          className="btn btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isEditMode ? 'Saving Changes...' : 'Creating Property...'}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditMode ? 'Save Changes' : 'Create Property'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
