import { BOOKING_RULES } from '@/content/booking-rules';

export const DESTINATIONS_PAGE_CONTENT = {
  badge: 'Global Footprint',
  title: 'Furnished Apartments for Monthly Rentals',
  description:
    'Explore all countries and cities featuring verified remote work residences equipped with ergonomic workstations and fiber internet.',
  searchPlaceholder: 'Quick search city or country...',
  faqs: [
    {
      q: 'What is the minimum stay length across NomadDesk destinations?',
      a: `All apartments in our global directory require a minimum stay of ${BOOKING_RULES.minimumStayNights} nights, giving remote professionals residential monthly pricing without tourist surcharges.`,
    },
    {
      q: 'Are workstations and fiber WiFi standardized in every city?',
      a: 'Yes. Every published apartment includes a verified high-speed internet connection and at least a Comfort Base workstation, with optional Pro or Custom hardware upgrades installed before arrival.',
    },
    {
      q: 'What is the cancellation policy if my travel plans change?',
      a: `Guests receive a full refund when cancelling at least ${BOOKING_RULES.freeCancelDays} days prior to check-in. You can manage cancellations directly in your Guest Portal.`,
    },
  ],
};
