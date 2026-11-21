export type PropertyStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'hidden';

export interface PropertyWorkstation {
  hasWorkstation: boolean;
  desk: string;
  chair: string;
  monitors: string;
  keyboard: string;
  wifiSpeed: number; // Mbps
}

export interface Property {
  id: number;
  reference: string;
  title: string;
  slug: string;
  description: string;
  pricePerMonth: number; // USD cents
  currency: string;
  locationId: number;
  city: string;
  country: string;
  neighborhood: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  totalSurface: number; // m²
  maxGuests: number;
  bedsCount: number;
  kitchen: boolean;
  laundry: boolean;
  balcony: boolean;
  petFriendly: boolean;
  pool: boolean;
  gym: boolean;
  terrace: boolean;
  workstation: PropertyWorkstation;
  houseRules: string;
  checkInStart: string;
  checkOut: string;
  minimumStayNights: number;
  isFeatured?: boolean;
  featuredPosition?: number | null;
  isDirectBooking: boolean; // true = Instant book, false = Request to book
  images: string[];
  hostId: number;
  status: PropertyStatus;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyFilterParams {
  city?: string;
  neighborhood?: string;
  moveIn?: string;
  moveOut?: string;
  bedrooms?: number;
  exactBedrooms?: boolean;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  isDirectBooking?: boolean;
  minWifiSpeed?: number;
  hostId?: number;
  status?: PropertyStatus | 'all';
  featured?: boolean;
}
