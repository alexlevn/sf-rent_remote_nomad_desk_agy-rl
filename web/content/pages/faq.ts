import { BOOKING_RULES } from '@/content/booking-rules';

export interface FAQPageItem {
  id: string;
  category: 'Booking' | 'Workstations' | 'Cancellation' | 'Payments';
  question: string;
  answer: string;
}

export const FAQ_PAGE_CONTENT = {
  title: 'Frequently Asked Questions',
  subtitle:
    'Everything you need to know about monthly bookings, workstations, and cancellation policies.',
  categories: ['All', 'Booking', 'Workstations', 'Cancellation', 'Payments'] as const,
  items: [
    {
      id: 'faq-min-stay',
      category: 'Booking',
      question: 'What is the minimum stay duration?',
      answer: `NomadDesk requires a minimum stay of ${BOOKING_RULES.minimumStayNights} consecutive nights. This complies with residential leasing laws and unlocks deep monthly discounts over daily tourist platforms.`,
    },
    {
      id: 'faq-workstation',
      category: 'Workstations',
      question: 'How does the Workstation setup work?',
      answer:
        'Every apartment includes our Comfort Base setup (4K screen, ergonomic chair, fiber internet). You can customize monitors, desks, and audio accessories in the Workstation Builder.',
    },
    {
      id: 'faq-cancellation',
      category: 'Cancellation',
      question: 'What is the cancellation policy?',
      answer: `You can cancel any confirmed booking for a 100% full refund up to ${BOOKING_RULES.freeCancelDays} days before your scheduled move-in date. Requests pending host confirmation can be cancelled anytime with zero penalty.`,
    },
    {
      id: 'faq-payment-auth',
      category: 'Payments',
      question: 'How does payment authorization work?',
      answer: `When you submit a "Request to Book", your payment is authorized but not captured. The host has ${BOOKING_RULES.respondHours} hours to respond. If declined or expired, the authorization hold releases immediately.`,
    },
    {
      id: 'faq-extend',
      category: 'Booking',
      question: 'Can I extend my stay once I am in the apartment?',
      answer: `Yes! Through your Guest Portal, you can request an extension up to ${BOOKING_RULES.freeCancelDays} days before your checkout date, subject to host availability and calendar blocks.`,
    },
    {
      id: 'faq-wifi',
      category: 'Workstations',
      question: 'What happens if the WiFi speed does not match the listing?',
      answer:
        'All listings feature verified WiFi speedtests. If your speed drops below 80% of the certified speed, NomadDesk provides backup 5G mobile hotspots or free cancellation.',
    },
    {
      id: 'faq-commission',
      category: 'Payments',
      question: 'Are there hidden service fees or commissions?',
      answer: `NomadDesk charges a standard ${BOOKING_RULES.commissionPercent}% platform commission included in host payouts. Guests pay the listed monthly rate plus cleaning with no surprise tourist surcharges.`,
    },
  ] as FAQPageItem[],
};
