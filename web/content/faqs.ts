export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

export const FAQS: FAQItem[] = [
  {
    question: 'What is the minimum stay duration?',
    answer:
      'NomadDesk requires a minimum stay of 30 consecutive nights. This complies with residential leasing laws and unlocks deep monthly discounts over daily tourist platforms.',
    category: 'Bookings',
  },
  {
    question: 'How does the Workstation setup work?',
    answer:
      'Every apartment includes our Comfort Base setup (4K screen, ergonomic chair, fiber internet). You can customize monitors, desks, and audio accessories in the Workstation Builder.',
    category: 'Workstations',
  },
  {
    question: 'What is the cancellation policy?',
    answer:
      'You can cancel any confirmed booking for a 100% full refund up to 14 days before your scheduled move-in date. Requests pending host confirmation can be cancelled anytime with zero penalty.',
    category: 'Policies',
  },
  {
    question: 'How does payment authorization work?',
    answer:
      'When you submit a "Request to Book", your payment is authorized but not captured. The host has 48 hours to respond. If declined or expired, the authorization hold releases immediately.',
    category: 'Payments',
  },
  {
    question: 'Can I extend my stay once I am in the apartment?',
    answer:
      'Yes! Through your Guest Portal, you can request an extension up to 14 days before your checkout date, subject to host availability and calendar blocks.',
    category: 'Bookings',
  },
  {
    question: 'What happens if the WiFi speed does not match the listing?',
    answer:
      'All listings feature verified WiFi speedtests. If your speed drops below 80% of the certified speed, NomadDesk provides backup 5G mobile hotspots or free cancellation.',
    category: 'Workstations',
  },
];
