import { BOOKING_RULES } from '@/content/booking-rules';

export const HOW_IT_WORKS_CONTENT = {
  badge: 'The Monthly Standard',
  title: 'How NomadDesk Works',
  subtitle:
    'Designed specifically for digital nomads, remote engineers, and creators needing proper ergonomic setups.',
  steps: [
    {
      number: '01',
      title: 'Pick Your City',
      description: 'Browse 34 remote work capitals with certified fiber internet.',
    },
    {
      number: '02',
      title: 'Customize Hardware',
      description: 'Keep standard Comfort Base or upgrade to dual 4K / Herman Miller Aeron.',
    },
    {
      number: '03',
      title: 'Book Online',
      description: `Instant Book or ${BOOKING_RULES.respondHours}-Hour Host confirmation without viewing appointments.`,
    },
    {
      number: '04',
      title: 'Arrive & Focus',
      description: 'Digital door pass ready 24h prior. High-speed desk ready on day one.',
    },
  ],
  features: [
    {
      title: 'Ergonomic Certification',
      description: 'Every workstation is inspected for monitor height, desk stability, and lumbar support.',
    },
    {
      title: 'Verified Fiber Internet',
      description: 'Speedtest results verified before listing. 5G fallback hotspots available on demand.',
    },
    {
      title: 'Flexible Extensions',
      description: `Extend your stay directly in your guest portal up to ${BOOKING_RULES.freeCancelDays} days before checkout.`,
    },
  ],
  faqs: [
    {
      q: 'What is included in every monthly rental?',
      a: `Every apartment includes utilities, verified high-speed fiber WiFi, and a Comfort Base ergonomic workstation ready on day one for stays of ${BOOKING_RULES.minimumStayNights}+ nights.`,
    },
    {
      q: 'How does host confirmation work?',
      a: `Instant Book properties confirm immediately. Request-to-Book hosts have ${BOOKING_RULES.respondHours} hours to review and confirm your stay, and your card authorization is only captured once approved.`,
    },
    {
      q: 'Can I cancel or adjust my reservation?',
      a: `You can cancel for a full refund at least ${BOOKING_RULES.freeCancelDays} days before check-in directly from your Guest Portal.`,
    },
  ],
};
