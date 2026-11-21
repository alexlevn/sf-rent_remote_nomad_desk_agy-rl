export interface Location {
  id: number;
  city: string;
  name: string;
  slug: string;
  country: string;
  countryCode: string;
  continent: string;
  propertiesCount: number;
  description: string;
  image: string;
  center: [number, number]; // [lat, lng]
  isActive?: boolean;
  position?: number;
}
