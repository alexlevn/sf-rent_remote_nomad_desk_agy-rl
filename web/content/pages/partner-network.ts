import { BOOKING_RULES } from '@/content/booking-rules';

export interface PartnerValueProp {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface PartnerOnboardingStep {
  id: string;
  numberLabel: string;
  title: string;
  description: string;
}

export interface HostFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface PartnerNetworkContent {
  metadata: {
    title: string;
    description: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
  };
  valueProps: readonly PartnerValueProp[];
  stepsSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
  };
  steps: readonly PartnerOnboardingStep[];
  faqsSection: {
    badge: string;
    title: string;
    subtitle: string;
  };
  faqs: readonly HostFaqItem[];
  reviewSlaText: string;
}

export const PARTNER_NETWORK_CONTENT: PartnerNetworkContent = {
  metadata: {
    title: 'Partner Network for Hosts & Property Managers | NomadDesk',
    description: `Grow your portfolio with high-quality nomad tenants staying ${BOOKING_RULES.minimumStayNights}+ nights. Guaranteed upfront payments, lower turnover, and turnkey workstation infrastructure.`,
  },
  hero: {
    badge: 'Curated Supply Marketplace',
    title: 'Grow Your Portfolio with High-Quality Nomad Tenants',
    subtitle: `NomadDesk connects professional operators with vetted remote workers staying ${BOOKING_RULES.minimumStayNights}+ nights. Guaranteed payments, lower turnover, and turnkey workstation infrastructure.`,
    ctaLabel: 'Apply to Become a Host Partner →',
  },
  valueProps: [
    {
      id: 'guaranteed-payments',
      icon: '🛡️',
      title: 'Guaranteed Payments',
      description: `Funds authorized upfront. Platform deducts a transparent ${BOOKING_RULES.commissionPercent}% fee with direct monthly disbursements to your bank.`,
    },
    {
      id: 'vetted-workers',
      icon: '💼',
      title: 'Vetted Remote Workers',
      description:
        'High-income tech professionals, consultants, and remote founders treating homes with respect and care.',
    },
    {
      id: 'minimum-stay',
      icon: '🗓️',
      title: `Minimum ${BOOKING_RULES.minimumStayNights}-Night Stays`,
      description:
        'Say goodbye to daily check-in chaos and party guests. Enjoy steady monthly occupancy with zero turnover friction.',
    },
    {
      id: 'turnkey-workstations',
      icon: '⚡',
      title: 'Turnkey Workstations',
      description:
        'We supply and install ergonomic monitors and chairs, elevating your ADR without any capital expense.',
    },
  ],
  stepsSection: {
    eyebrow: 'Seamless Onboarding',
    title: '4 Steps to Hosting on NomadDesk',
    subtitle:
      'From application submission to receiving vetted bookings, our dedicated operations team supports you at every milestone.',
    ctaLabel: 'Submit Host Application Now →',
  },
  steps: [
    {
      id: 'apply',
      numberLabel: '01. Apply',
      title: 'Submit Portfolio',
      description:
        'Submit your portfolio details, unit counts, and operating cities for curation review.',
    },
    {
      id: 'inspection',
      numberLabel: '02. Inspection',
      title: 'Speed & Ergonomics',
      description:
        'NomadDesk verifies internet speed reliability (≥ 300 Mbps) and workstation ergonomic setup.',
    },
    {
      id: 'publish',
      numberLabel: '03. Publish',
      title: 'Go Live',
      description: `List approved apartments with Instant Book or ${BOOKING_RULES.respondHours}-Hour Request options on our global marketplace.`,
    },
    {
      id: 'get-paid',
      numberLabel: '04. Get Paid',
      title: 'Automated Payouts',
      description:
        'Receive bookings and enjoy automated monthly payout tracking directly in your host portal.',
    },
  ],
  faqsSection: {
    badge: 'Frequently Asked Questions',
    title: 'Everything You Need to Know About Hosting',
    subtitle:
      'Clear rules, straightforward terms, and transparent platform economics.',
  },
  faqs: [
    {
      id: 'commission',
      question: 'What commission does NomadDesk charge?',
      answer: `NomadDesk charges a transparent, flat ${BOOKING_RULES.commissionPercent}% host platform fee on completed booking transactions. There are no monthly listing subscriptions, onboarding fees, or hidden payment processing charges.`,
    },
    {
      id: 'response-window',
      question: `How does the ${BOOKING_RULES.respondHours}-hour booking response window work?`,
      answer: `For properties set to "Request to Book", hosts have exactly ${BOOKING_RULES.respondHours} hours to accept or decline the reservation. During this window, the guest's payment is authorized and held in escrow. If no action is taken, the authorization releases automatically.`,
    },
    {
      id: 'workstations',
      question: 'Who provides and installs the ergonomic workstations?',
      answer:
        "NomadDesk coordinates delivery and assembly of all workstation hardware (certified 4K displays, Herman Miller or medical-grade seating, motorized standing desks, and universal USB-C docks). You elevate your apartment's ADR without capital expenditure.",
    },
    {
      id: 'vetting',
      question: 'How are remote workers vetted before arrival?',
      answer:
        'Every guest undergoes identity verification, employment status screening, and background checks. Our community consists of senior software engineers, founders, designers, and tech consultants who require peaceful residential environments for focused work.',
    },
    {
      id: 'payouts',
      question: 'When and how do host payouts arrive?',
      answer: `Payouts are initiated via direct bank transfer or Stripe Connect 24 hours after guest check-in. For multi-month stays exceeding ${BOOKING_RULES.minimumStayNights} nights, payouts disburse automatically on a recurring ${BOOKING_RULES.minimumStayNights}-day billing cycle.`,
    },
  ],
  reviewSlaText: `24 to ${BOOKING_RULES.respondHours} business hours curation window with instant re-submission on feedback.`,
};
