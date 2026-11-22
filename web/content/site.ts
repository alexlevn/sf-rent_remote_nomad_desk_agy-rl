import { BOOKING_RULES } from '@/content/booking-rules';

export interface FooterLinkItem {
  label: string;
  href: string;
  badge?: string;
  highlight?: 'brand' | 'admin' | 'neutral';
}

export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3288';
  return configured.replace(/\/+$/, '');
}

export const SITE_CONFIG = {
  name: 'NomadDesk',
  brandBadge: 'PRO',
  title: 'NomadDesk — Furnished Apartments & Remote Workspaces',
  tagline:
    'Curated furnished apartments equipped with ergonomic workstations and high-speed fiber internet for digital nomads and remote professionals worldwide.',
  description:
    'Book flexible furnished apartments with verified high-speed Wi-Fi and ergonomic workspaces designed for digital nomads.',
  minStayNotice: `Minimum ${BOOKING_RULES.minimumStayNights}-night stays.`,
  copyright: `© 2026 NomadDesk Inc. All rights reserved. Minimum ${BOOKING_RULES.minimumStayNights}-night stays.`,
  contactEmail: 'support@nomaddesk.com',
  partnersEmail: 'partners@nomaddesk.com',
  links: {
    home: '/',
    browse: '/c/furnished-apartments-madrid',
    cities: '/a/furnished-apartments',
    workstations: '/workstations',
    workstationBuilder: '/workstations/build',
    partnerNetwork: '/partner-network',
    hostApply: '/host/apply',
    login: '/login',
    register: '/register',
    about: '/about-us',
    howItWorks: '/how-it-works',
    faq: '/faq',
    terms: '/terms',
    privacy: '/about-us',
    contact: '/contact-us',
    blog: '/blog',
    travelGuides: '/travel-guide',
    hostDashboard: '/host',
    adminDashboard: '/admin',
    guestDashboard: '/guests/dashboard',
  },
  footerSections: [
    {
      title: 'Top Destinations',
      links: [
        { label: 'Madrid Apartments', href: '/c/furnished-apartments-madrid' },
        { label: 'Barcelona Apartments', href: '/c/furnished-apartments-barcelona' },
        { label: 'Buenos Aires Apartments', href: '/c/furnished-apartments-buenos-aires' },
        { label: 'Lima Apartments', href: '/c/furnished-apartments-lima' },
        { label: 'All Destinations →', href: '/a/furnished-apartments' },
      ],
    },
    {
      title: 'Platform',
      links: [
        { label: 'Our Workstations', href: '/workstations' },
        { label: 'Workstation Builder', href: '/workstations/build' },
        { label: 'Partner Network (Hosts)', href: '/partner-network' },
        { label: 'Digital Nomad Guides', href: '/travel-guide' },
        { label: 'Remote Insights Blog', href: '/blog' },
      ],
    },
    {
      title: 'Company & Trust',
      links: [
        { label: 'How It Works', href: '/how-it-works' },
        { label: 'About NomadDesk', href: '/about-us' },
        { label: 'FAQs & Support', href: '/faq' },
        { label: 'Host Portal', href: '/host', highlight: 'brand' as const },
        { label: 'Admin Portal', href: '/admin', highlight: 'admin' as const },
      ],
    },
  ],
  legalLinks: [
    { label: 'Privacy Policy', href: '/about-us' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Contact Support', href: '/contact-us' },
  ],
};
