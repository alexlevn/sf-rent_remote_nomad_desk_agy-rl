import { BOOKING_RULES } from '@/content/booking-rules';

export const TERMS_CONTENT = {
  title: 'Terms of Service',
  subtitle:
    'These terms apply to guests, hosts and visitors of NomadDesk. Demo text for the design prototype.',
  sections: [
    {
      title: '1. Bookings',
      body: `Minimum stay is ${BOOKING_RULES.minimumStayNights} nights. Instant-book stays are confirmed immediately; request-to-book stays need the host to accept within ${BOOKING_RULES.respondHours} hours.`,
    },
    {
      title: '2. Payments and cancellation',
      body: `Cards are authorized at booking and captured when the stay is confirmed. Free cancellation applies up to ${BOOKING_RULES.freeCancelDays} days before move-in.`,
    },
    {
      title: '3. Hosts',
      body: `Hosts are reviewed before listing. NomadDesk keeps a ${BOOKING_RULES.commissionPercent}% commission on the rent and may suspend listings that break the rules.`,
    },
    {
      title: '4. Acceptable use',
      body: 'Do not misuse the platform, attempt to bypass payments, or publish false listing information.',
    },
  ],
};
