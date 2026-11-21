import type { Property, PropertyFilterParams, PropertyStatus } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Checks if two date ranges [startA, endA) and [startB, endB) overlap.
 */
function datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

/**
 * Lists properties matching filter criteria.
 * Defaults to 'published' properties for public browsing.
 */
export async function listProperties(params?: PropertyFilterParams): Promise<Property[]> {
  const store = getMockStore();
  let result = [...store.properties];

  // Status filtering (default: 'published' only from approved hosts, unless 'all' or explicit status requested)
  if (params?.status === 'all') {
    // Return properties of all statuses
  } else if (params?.status) {
    result = result.filter((p) => p.status === params.status);
  } else {
    const approvedHostIds = new Set(
      store.hosts.filter((h) => h.status === 'approved').map((h) => h.id)
    );
    result = result.filter((p) => p.status === 'published' && approvedHostIds.has(p.hostId));
  }

  // City filter (case-insensitive on city name or slug)
  if (params?.city) {
    const qCity = params.city.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.city.toLowerCase() === qCity ||
        p.city.toLowerCase().includes(qCity) ||
        p.neighborhood.toLowerCase().includes(qCity)
    );
  }

  // Neighborhood filter
  if (params?.neighborhood) {
    const qNeigh = params.neighborhood.trim().toLowerCase();
    result = result.filter((p) => p.neighborhood.toLowerCase() === qNeigh);
  }

  // Host filter
  if (params?.hostId != null) {
    result = result.filter((p) => p.hostId === params.hostId);
  }

  // Featured filter
  if (params?.featured) {
    result = result.filter((p) => p.featuredPosition != null || p.isFeatured === true);
  }

  // Bedrooms filter (exact or minimum)
  if (params?.bedrooms != null) {
    if (params.exactBedrooms) {
      result = result.filter((p) => p.bedrooms === params.bedrooms!);
    } else {
      result = result.filter((p) => p.bedrooms >= params.bedrooms!);
    }
  }

  // Min price filter (cents)
  if (params?.minPrice != null) {
    result = result.filter((p) => p.pricePerMonth >= params.minPrice!);
  }

  // Max price filter (cents)
  if (params?.maxPrice != null) {
    result = result.filter((p) => p.pricePerMonth <= params.maxPrice!);
  }

  // Direct booking (Instant Book) filter
  if (params?.isDirectBooking != null) {
    result = result.filter((p) => p.isDirectBooking === params.isDirectBooking);
  }

  // Minimum verified Wi-Fi speed (Mbps)
  if (params?.minWifiSpeed != null) {
    result = result.filter(
      (p) => (p.workstation?.wifiSpeed || 0) >= params.minWifiSpeed!
    );
  }

  // Amenities filter
  if (params?.amenities && params.amenities.length > 0) {
    for (const rawAmenity of params.amenities) {
      const amenity = rawAmenity.toLowerCase();
      result = result.filter((p) => {
        if (amenity === 'kitchen') return p.kitchen;
        if (amenity === 'laundry') return p.laundry;
        if (amenity === 'balcony') return p.balcony;
        if (amenity === 'petfriendly' || amenity === 'pet_friendly' || amenity === 'pets') return p.petFriendly;
        if (amenity === 'pool' || amenity === 'swimming_pool') return p.pool;
        if (amenity === 'gym') return p.gym;
        if (amenity === 'terrace') return p.terrace;
        if (amenity === 'workstation') return p.workstation?.hasWorkstation;
        return true;
      });
    }
  }

  // Date availability filter: exclude properties with overlapping blocked dates or active reservations
  if (params?.moveIn && params?.moveOut) {
    const { moveIn, moveOut } = params;
    result = result.filter((property) => {
      // Check blocked dates
      const hasBlocked = store.blockedDates.some(
        (b) => b.propertyId === property.id && datesOverlap(b.startDate, b.endDate, moveIn, moveOut)
      );
      if (hasBlocked) return false;

      // Check active reservations (pending or confirmed)
      const hasConflict = store.reservations.some(
        (r) =>
          r.propertyId === property.id &&
          (r.status === 'pending' || r.status === 'confirmed') &&
          datesOverlap(r.moveInDate, r.moveOutDate, moveIn, moveOut)
      );
      return !hasConflict;
    });
  }

  return result;
}

/**
 * Retrieves a property by its URL slug.
 * By default requires property to be 'published' and its host 'approved' (AC-LIST-6).
 */
export async function getPropertyBySlug(
  slug: string,
  options?: { allowUnpublished?: boolean }
): Promise<Property | null> {
  const store = getMockStore();
  const property = store.properties.find((p) => p.slug === slug);
  if (!property) return null;

  if (!options?.allowUnpublished) {
    if (property.status !== 'published') return null;
    const host = store.hosts.find((h) => h.id === property.hostId);
    if (!host || host.status !== 'approved') return null;
  }

  return { ...property };
}

/**
 * Retrieves a property by its unique ID.
 */
export async function getPropertyById(id: number): Promise<Property | null> {
  const store = getMockStore();
  const property = store.properties.find((p) => p.id === id);
  return property ? { ...property } : null;
}

/**
 * Lists all properties belonging to a specific host.
 */
export async function listHostListings(hostId: number): Promise<Property[]> {
  const store = getMockStore();
  return store.properties
    .filter((p) => p.hostId === hostId)
    .map((p) => ({ ...p }));
}

/**
 * Saves a host listing (creates new draft or updates existing property).
 */
export async function saveHostListing(
  hostId: number,
  data: Partial<Property>
): Promise<Property> {
  const store = getMockStore();

  if (data.id) {
    const index = store.properties.findIndex((p) => p.id === data.id);
    if (index === -1) {
      throw new Error(`Property ${data.id} not found`);
    }
    const existing = store.properties[index];
    if (existing.hostId !== hostId) {
      throw new Error('Unauthorized: property does not belong to this host');
    }

    const updated: Property = {
      ...existing,
      ...data,
      id: existing.id,
      hostId,
      updatedAt: new Date().toISOString(),
    };
    store.properties[index] = updated;
    return { ...updated };
  }

  // Create new listing
  const maxId = store.properties.reduce((max, p) => Math.max(max, p.id), 0);
  const newId = maxId + 1;
  const cleanTitleSlug = (data.title || `property-${newId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const finalSlug = data.slug || cleanTitleSlug || `property-${newId}`;
  const newProperty: Property = {
    id: newId,
    reference: `ND-PROP-${newId}`,
    title: data.title || 'Untitled Property',
    slug: finalSlug,
    description: data.description || '',
    pricePerMonth: data.pricePerMonth || 200000,
    currency: data.currency || 'USD',
    locationId: data.locationId || 1,
    city: data.city || 'Madrid',
    country: data.country || 'Spain',
    neighborhood: data.neighborhood || '',
    address: data.address || '',
    bedrooms: data.bedrooms || 1,
    bathrooms: data.bathrooms || 1,
    totalSurface: data.totalSurface || 50,
    maxGuests: data.maxGuests || 2,
    bedsCount: data.bedsCount || 1,
    kitchen: data.kitchen ?? true,
    laundry: data.laundry ?? true,
    balcony: data.balcony ?? false,
    petFriendly: data.petFriendly ?? false,
    pool: data.pool ?? false,
    gym: data.gym ?? false,
    terrace: data.terrace ?? false,
    workstation: data.workstation || {
      hasWorkstation: true,
      desk: 'Standard Desk',
      chair: 'Ergonomic Chair',
      monitors: 'Ultrawide Monitor',
      keyboard: 'Standard',
      wifiSpeed: 300,
    },
    houseRules: data.houseRules || 'No smoking. Quiet hours 22:00 - 08:00.',
    checkInStart: data.checkInStart || '15:00',
    checkOut: data.checkOut || '11:00',
    minimumStayNights: data.minimumStayNights || 30,
    isDirectBooking: data.isDirectBooking ?? false,
    images: data.images && data.images.length > 0 ? data.images : ['/seed/property/prop-madrid-1.webp'],
    hostId,
    status: data.status || 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.properties.push(newProperty);
  return { ...newProperty };
}

/**
 * Updates a property status (e.g. publish, reject, hide) by admin or host lifecycle.
 */
export async function updatePropertyStatus(
  id: number,
  status: PropertyStatus,
  rejectionReason?: string | null
): Promise<Property | null> {
  const store = getMockStore();
  const property = store.properties.find((p) => p.id === id);
  if (!property) return null;

  property.status = status;
  if (rejectionReason !== undefined) {
    property.rejectionReason = rejectionReason;
  }
  property.updatedAt = new Date().toISOString();
  return { ...property };
}
