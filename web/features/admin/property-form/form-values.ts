import type { HostProfile, Location, Property, PropertyStatus } from '@/lib/types';
import { BOOKING_RULES } from '@/content/booking-rules';
import { INT4_MAX } from '@/lib/format';

export interface AdminPropertyFormValues {
  hostId: string;
  status: PropertyStatus;
  isDirectBooking: boolean;
  title: string;
  slug: string;
  selectedLocationId: string;
  neighborhood: string;
  address: string;
  monthlyRentUsd: number | '';
  minimumStayNights: string;
  checkInStart: string;
  checkOut: string;
  bedrooms: string;
  bathrooms: string;
  bedsCount: string;
  totalSurface: string;
  maxGuests: string;
  kitchen: boolean;
  laundry: boolean;
  balcony: boolean;
  petFriendly: boolean;
  pool: boolean;
  gym: boolean;
  terrace: boolean;
  hasWorkstation: boolean;
  desk: string;
  chair: string;
  monitors: string;
  keyboard: string;
  wifiSpeed: string;
  description: string;
  houseRules: string;
}

export type AdminPropertyFormErrors = Record<string, string>;

export type SetAdminPropertyField = <K extends keyof AdminPropertyFormValues>(
  key: K,
  value: AdminPropertyFormValues[K]
) => void;

export interface AdminPropertySectionProps {
  values: AdminPropertyFormValues;
  errors: AdminPropertyFormErrors;
  setField: SetAdminPropertyField;
}

export const DEFAULT_PROPERTY_IMAGE = '/seed/property/prop-madrid-1.webp';

export function resolveDefaultHostId(initialData: Property | undefined, hosts: HostProfile[]): string {
  if (initialData?.hostId) return String(initialData.hostId);
  const approvedHost = hosts.find((h) => h.status === 'approved');
  if (approvedHost) return String(approvedHost.id);
  return hosts[0] ? String(hosts[0].id) : '';
}

export function resolveDefaultLocation(
  initialData: Property | undefined,
  locations: Location[]
): Location | null {
  if (initialData?.locationId) {
    const byId = locations.find((l) => l.id === initialData.locationId);
    if (byId) return byId;
  }
  if (initialData?.city) {
    const byCity = locations.find((l) => l.city.toLowerCase() === initialData.city.toLowerCase());
    if (byCity) return byCity;
    // Preserve unmatched city in edit mode instead of silently overwriting with locations[0]
    return null;
  }
  return locations[0] ?? null;
}

export function buildInitialValues(
  initialData: Property | undefined,
  defaultHostId: string,
  defaultLocation: Location | null
): AdminPropertyFormValues {
  const ws = initialData?.workstation;
  return {
    hostId: defaultHostId,
    status: initialData?.status ?? 'published',
    isDirectBooking: initialData?.isDirectBooking ?? true,
    title: initialData?.title ?? '',
    slug: initialData?.slug ?? '',
    selectedLocationId: defaultLocation ? String(defaultLocation.id) : '',
    neighborhood: initialData?.neighborhood ?? '',
    address: initialData?.address ?? '',
    monthlyRentUsd:
      initialData?.pricePerMonth != null ? Math.round(initialData.pricePerMonth / 100) : 2800,
    minimumStayNights: String(initialData?.minimumStayNights ?? BOOKING_RULES.minimumStayNights),
    checkInStart: initialData?.checkInStart ?? '15:00',
    checkOut: initialData?.checkOut ?? '11:00',
    bedrooms: String(initialData?.bedrooms ?? 1),
    bathrooms: String(initialData?.bathrooms ?? 1),
    bedsCount: String(initialData?.bedsCount ?? 1),
    totalSurface: String(initialData?.totalSurface ?? 65),
    maxGuests: String(initialData?.maxGuests ?? 2),
    kitchen: initialData?.kitchen ?? true,
    laundry: initialData?.laundry ?? true,
    balcony: initialData?.balcony ?? false,
    petFriendly: initialData?.petFriendly ?? false,
    pool: initialData?.pool ?? false,
    gym: initialData?.gym ?? false,
    terrace: initialData?.terrace ?? false,
    hasWorkstation: ws?.hasWorkstation ?? true,
    desk: ws?.desk ?? 'Ergonomic Standing Desk',
    chair: ws?.chair ?? 'Herman Miller Aeron',
    monitors: ws?.monitors ?? '27" 4K UHD Monitor',
    keyboard: ws?.keyboard ?? 'Mechanical Keyboard & Wireless Mouse',
    wifiSpeed: String(ws?.wifiSpeed ?? 600),
    description: initialData?.description ?? '',
    houseRules: initialData?.houseRules ?? '<p>No smoking inside. Quiet hours 22:00 - 08:00.</p>',
  };
}

function isIntInRange(raw: string, min: number, max: number): boolean {
  const num = Number(raw);
  return raw.trim() !== '' && Number.isInteger(num) && num >= min && num <= max;
}

interface ValidationContext {
  locations: Location[];
  initialData?: Property;
  imageCount: number;
}

export function validateAdminPropertyForm(
  values: AdminPropertyFormValues,
  { locations, initialData, imageCount }: ValidationContext
): AdminPropertyFormErrors {
  const errors: AdminPropertyFormErrors = {};

  const parsedHostId = Number(values.hostId);
  if (!Number.isInteger(parsedHostId) || parsedHostId <= 0) {
    errors.hostId = 'Please select an owning host.';
  }

  const title = values.title.trim();
  if (!title) {
    errors.title = 'Property title is required.';
  } else if (title.length > 255) {
    errors.title = 'Title must be 255 characters or fewer.';
  }

  if (values.slug.trim() && !/^[a-z0-9-]+$/i.test(values.slug.trim())) {
    errors.slug = 'Slug may only contain letters, numbers, and hyphens.';
  }

  const chosenLocation = locations.find((l) => String(l.id) === values.selectedLocationId);
  if (!chosenLocation && !initialData?.city) {
    errors.city = 'Please select a destination city.';
  }

  const rent = values.monthlyRentUsd;
  if (rent === '' || !Number.isFinite(rent) || rent <= 0) {
    errors.monthlyRentUsd = 'Monthly rent must be greater than $0.';
  } else if (Math.round(rent * 100) > INT4_MAX) {
    errors.monthlyRentUsd = 'Monthly rent exceeds the maximum allowed amount.';
  }

  if (!isIntInRange(values.minimumStayNights, BOOKING_RULES.minimumStayNights, 3650)) {
    errors.minimumStayNights = `Minimum stay must be an integer between ${BOOKING_RULES.minimumStayNights} and 3650 nights.`;
  }
  if (!isIntInRange(values.bedrooms, 0, 50)) errors.bedrooms = 'Bedrooms must be between 0 and 50.';
  if (!isIntInRange(values.bathrooms, 0, 50)) errors.bathrooms = 'Bathrooms must be between 0 and 50.';
  if (!isIntInRange(values.bedsCount, 0, 50)) errors.bedsCount = 'Beds count must be between 0 and 50.';
  if (!isIntInRange(values.totalSurface, 0, 100000)) {
    errors.totalSurface = 'Total surface must be between 0 and 100,000 m².';
  }
  if (!isIntInRange(values.maxGuests, 1, 50)) errors.maxGuests = 'Max guests must be between 1 and 50.';
  if (!isIntInRange(values.wifiSpeed, 0, 100000)) {
    errors.wifiSpeed = 'Wi-Fi speed must be between 0 and 100,000 Mbps.';
  }

  if (imageCount === 0) {
    errors.images = 'Add at least one property photo.';
  }

  return errors;
}

export function buildAdminPropertyPayload(
  values: AdminPropertyFormValues,
  images: string[],
  { locations, initialData }: Omit<ValidationContext, 'imageCount'>
): Partial<Property> & { hostId: number } {
  const chosenLocation = locations.find((l) => String(l.id) === values.selectedLocationId);
  const trimmedSlug = values.slug.trim().toLowerCase();

  return {
    hostId: Number(values.hostId),
    title: values.title.trim(),
    ...(trimmedSlug ? { slug: trimmedSlug } : {}),
    locationId: chosenLocation?.id ?? initialData?.locationId,
    city: chosenLocation?.city ?? initialData?.city ?? 'Madrid',
    country: chosenLocation?.country ?? initialData?.country ?? 'Spain',
    neighborhood: values.neighborhood.trim(),
    address: values.address.trim(),
    pricePerMonth: Math.round(Number(values.monthlyRentUsd) * 100),
    currency: initialData?.currency ?? 'USD',
    minimumStayNights: Number(values.minimumStayNights),
    checkInStart: values.checkInStart.trim() || '15:00',
    checkOut: values.checkOut.trim() || '11:00',
    bedrooms: Number(values.bedrooms),
    bathrooms: Number(values.bathrooms),
    bedsCount: Number(values.bedsCount),
    totalSurface: Number(values.totalSurface),
    maxGuests: Number(values.maxGuests),
    kitchen: values.kitchen,
    laundry: values.laundry,
    balcony: values.balcony,
    petFriendly: values.petFriendly,
    pool: values.pool,
    gym: values.gym,
    terrace: values.terrace,
    workstation: {
      hasWorkstation: values.hasWorkstation,
      desk: values.desk.trim(),
      chair: values.chair.trim(),
      monitors: values.monitors.trim(),
      keyboard: values.keyboard.trim(),
      wifiSpeed: Number(values.wifiSpeed),
    },
    images,
    isDirectBooking: values.isDirectBooking,
    status: values.status,
    description: values.description,
    houseRules: values.houseRules,
  };
}
