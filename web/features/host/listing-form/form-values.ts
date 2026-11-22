import type { Location, Property } from '@/lib/types';
import { BOOKING_RULES } from '@/content/booking-rules';
import { INT4_MAX } from '@/lib/format';
import { stripHtmlTags } from '@/lib/validations/content';
import { isSafeImagePath } from '@/lib/validations/media';

export type ListingSaveIntent = 'draft' | 'pending_review' | 'keep';

export interface HostListingFormValues {
  title: string;
  city: string;
  neighborhood: string;
  address: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  totalSurface: number;
  maxGuests: number;
  bedsCount: number;
  kitchen: boolean;
  laundry: boolean;
  balcony: boolean;
  petFriendly: boolean;
  pool: boolean;
  gym: boolean;
  terrace: boolean;
  desk: string;
  chair: string;
  monitors: string;
  keyboard: string;
  wifiSpeed: number;
  monthlyRentUsd: number | '';
  minimumStayNights: number;
  checkInStart: string;
  checkOut: string;
  houseRules: string;
  isDirectBooking: boolean;
}

export type HostListingFormErrors = Record<string, string>;

export type SetHostListingField = <K extends keyof HostListingFormValues>(
  key: K,
  value: HostListingFormValues[K]
) => void;

export interface HostListingSectionProps {
  values: HostListingFormValues;
  errors: HostListingFormErrors;
  setField: SetHostListingField;
}

export function buildInitialListingValues(
  initialData: Property | undefined,
  locations: Location[]
): HostListingFormValues {
  const ws = initialData?.workstation;
  return {
    title: initialData?.title || '',
    city: initialData?.city || locations[0]?.city || 'Madrid',
    neighborhood: initialData?.neighborhood || '',
    address: initialData?.address || '',
    description: initialData?.description || '',
    bedrooms: initialData?.bedrooms ?? 1,
    bathrooms: initialData?.bathrooms ?? 1,
    totalSurface: initialData?.totalSurface ?? 60,
    maxGuests: initialData?.maxGuests ?? 2,
    bedsCount: initialData?.bedsCount ?? 1,
    kitchen: initialData?.kitchen ?? true,
    laundry: initialData?.laundry ?? true,
    balcony: initialData?.balcony ?? false,
    petFriendly: initialData?.petFriendly ?? false,
    pool: initialData?.pool ?? false,
    gym: initialData?.gym ?? false,
    terrace: initialData?.terrace ?? false,
    desk: ws?.desk || 'Ergonomic Standing Desk',
    chair: ws?.chair || 'Herman Miller Aeron',
    monitors: ws?.monitors || 'Dual 27" 4K UHD Monitors',
    keyboard: ws?.keyboard || 'Mechanical Keyboard & Wireless Mouse',
    wifiSpeed: ws?.wifiSpeed ?? 600,
    monthlyRentUsd: initialData?.pricePerMonth != null ? Math.round(initialData.pricePerMonth / 100) : 2850,
    minimumStayNights: initialData?.minimumStayNights ?? 30,
    checkInStart: initialData?.checkInStart || '15:00',
    checkOut: initialData?.checkOut || '11:00',
    houseRules:
      initialData?.houseRules ||
      'No smoking inside. Quiet hours 22:00 - 08:00. Pet-friendly with prior confirmation.',
    isDirectBooking: initialData?.isDirectBooking ?? false,
  };
}

export function validateListingForm(
  values: HostListingFormValues,
  images: string[],
  intent: ListingSaveIntent
): HostListingFormErrors {
  const errors: HostListingFormErrors = {};
  const title = values.title.trim();

  if (!title) {
    errors.title = 'Listing title is required.';
  } else if (title.length < 5) {
    errors.title = 'Title must be at least 5 characters.';
  } else if (title.length > 255) {
    errors.title = 'Title must be 255 characters or fewer.';
  }

  if (!values.city.trim()) {
    errors.city = 'Please select a city.';
  }

  const rent = values.monthlyRentUsd;
  if (rent === '' || !Number.isFinite(rent) || rent <= 0) {
    errors.monthlyRentUsd = 'Monthly rent must be greater than $0.';
  } else if (Math.round(rent * 100) > INT4_MAX) {
    errors.monthlyRentUsd = 'Monthly rent exceeds the maximum allowed amount.';
  }

  if (values.minimumStayNights < BOOKING_RULES.minimumStayNights) {
    errors.minimumStayNights = `NomadDesk standard requires minimum stay of ${BOOKING_RULES.minimumStayNights} nights.`;
  }

  if (images.some((url) => !isSafeImagePath(url))) {
    errors.images = 'All photo URLs must be valid /uploads/, /seed/, or https:// paths.';
  }

  // Live listings and review submissions need the full set of public-facing fields
  if (intent === 'pending_review' || intent === 'keep') {
    if (!stripHtmlTags(values.description).trim()) {
      errors.description = 'Description is required before submitting or saving a live listing.';
    }
    if (images.length === 0) {
      errors.images = 'Please provide at least one photo of the apartment.';
    }
    if (!values.desk.trim()) errors.desk = 'Workstation desk specification is required.';
    if (!values.chair.trim()) errors.chair = 'Workstation chair specification is required.';
    if (values.wifiSpeed <= 0) errors.wifiSpeed = 'Please declare verified Wi-Fi speed (Mbps).';
  }

  return errors;
}

export function buildListingPayload(
  values: HostListingFormValues,
  images: string[],
  locations: Location[],
  initialData?: Property
): Partial<Property> {
  const selectedLocation = locations.find((l) => l.city.toLowerCase() === values.city.toLowerCase());
  const desk = values.desk.trim();
  const chair = values.chair.trim();
  const monitors = values.monitors.trim();

  return {
    ...(initialData?.id ? { id: initialData.id } : {}),
    title: values.title.trim(),
    city: values.city.trim(),
    country: selectedLocation?.country || initialData?.country || '',
    ...(selectedLocation?.id ? { locationId: selectedLocation.id } : {}),
    neighborhood: values.neighborhood.trim(),
    address: values.address.trim(),
    description: values.description.trim(),
    images,
    bedrooms: Number(values.bedrooms),
    bathrooms: Number(values.bathrooms),
    totalSurface: Number(values.totalSurface),
    maxGuests: Number(values.maxGuests),
    bedsCount: Number(values.bedsCount),
    kitchen: values.kitchen,
    laundry: values.laundry,
    balcony: values.balcony,
    petFriendly: values.petFriendly,
    pool: values.pool,
    gym: values.gym,
    terrace: values.terrace,
    workstation: {
      hasWorkstation: Boolean(desk || chair || monitors),
      desk,
      chair,
      monitors,
      keyboard: values.keyboard.trim(),
      wifiSpeed: Number(values.wifiSpeed) || 0,
    },
    pricePerMonth: Math.round(Number(values.monthlyRentUsd) * 100),
    minimumStayNights: Number(values.minimumStayNights),
    checkInStart: values.checkInStart,
    checkOut: values.checkOut,
    houseRules: values.houseRules.trim(),
    isDirectBooking: values.isDirectBooking,
    currency: 'USD',
  };
}
