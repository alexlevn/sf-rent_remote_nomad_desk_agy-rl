export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  isExternal?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'About', href: '/about-us' },
  { label: 'Cities', href: '/a/furnished-apartments' },
  { label: 'Travel Guides', href: '/travel-guide' },
  { label: 'Our Workstations', href: '/workstations' },
  { label: 'Blog', href: '/blog' },
  { label: 'For Hosts', href: '/partner-network' },
];

export const GUEST_NAV_ITEMS: NavItem[] = [
  { label: 'Guest Dashboard', href: '/guests/dashboard' },
  { label: 'My Bookings', href: '/guests/reservations' },
  { label: 'Saved Apartments', href: '/guests/favorites' },
];

export const HOST_NAV_ITEMS: NavItem[] = [
  { label: 'Host Dashboard', href: '/host' },
  { label: 'My Listings', href: '/host/listings' },
  { label: 'Calendar Availability', href: '/host/calendar' },
  { label: 'Payouts & Earnings', href: '/host/payouts' },
  { label: 'Host Profile', href: '/host/profile' },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Admin Dashboard', href: '/admin' },
  { label: 'Properties Approval', href: '/admin/properties' },
  { label: 'Host Applications', href: '/admin/hosts' },
  { label: 'Reservations Oversight', href: '/admin/reservations' },
  { label: 'Locations & CMS', href: '/admin/locations' },
  { label: 'Exchange Rates & Settings', href: '/admin/settings' },
];
