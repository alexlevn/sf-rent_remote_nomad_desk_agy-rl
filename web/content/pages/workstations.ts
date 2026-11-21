export type WorkstationBenefitIcon = 'wifi' | 'armchair' | 'monitor' | 'zap';

export interface WorkstationBenefit {
  id: string;
  icon: WorkstationBenefitIcon;
  title: string;
  description: string;
}

export interface WorkstationFaqItem {
  id: string;
  q: string;
  a: string;
}

export interface WorkstationsPageContent {
  metadata: {
    title: string;
    description: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
  benefitsSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  benefits: readonly WorkstationBenefit[];
  faqsSection: {
    title: string;
    subtitle: string;
  };
  faqs: readonly WorkstationFaqItem[];
  cta: {
    title: string;
    subtitle: string;
    buttonLabel: string;
  };
}

export const WORKSTATIONS_PAGE_CONTENT: WorkstationsPageContent = {
  metadata: {
    title: 'Our Ergonomic Workstations | NomadDesk',
    description:
      'Every NomadDesk home comes with our certified Comfort Base hardware. Elevate your workflow with Pro upgrades or configure every peripheral.',
  },
  hero: {
    badge: 'Zero Compromise Setup',
    title: 'A Workstation, Coordinated with Your Reservation',
    subtitle:
      'Every NomadDesk home comes with our certified Comfort Base hardware. Elevate your workflow with Pro upgrades or configure every peripheral.',
    primaryCtaLabel: 'Launch Workstation Builder',
    secondaryCtaLabel: 'Browse Apartments',
  },
  benefitsSection: {
    eyebrow: 'Why Professionals Choose NomadDesk',
    title: 'Engineered for Deep Work & Extreme Productivity',
    subtitle:
      'Say goodbye to cramped dining chairs, spotty hotel WiFi, and neck strain.',
  },
  benefits: [
    {
      id: 'fiber-internet',
      icon: 'wifi',
      title: 'Guaranteed Fiber Internet (≥ 300 Mbps)',
      description:
        'Low-latency fiber optic connection certified with documented speedtests before every check-in. Zero bandwidth throttling or shared public networks.',
    },
    {
      id: 'ergonomics',
      icon: 'armchair',
      title: 'Medical-Grade Ergonomics',
      description:
        'High-performance seating designed for 10+ hour sustained posture health. Upgrade to Herman Miller Aeron for pressure-distributing 8Z Pellicle mesh.',
    },
    {
      id: 'displays',
      icon: 'monitor',
      title: 'Dual 4K & Ultrawide Real Estate',
      description:
        'Maximize screen productivity with calibrated 4K displays on heavy-duty gas counter-balance arms. Includes USB-C 90W single-cable power delivery.',
    },
    {
      id: 'docking',
      icon: 'zap',
      title: 'Turnkey Plug & Play Docking',
      description:
        'Arrive with your laptop, plug in one cable, and instantly connect to multi-monitors, high-speed ethernet, webcam, and charging.',
    },
  ],
  faqsSection: {
    title: 'Frequently Asked Questions About Workstations',
    subtitle:
      'Everything you need to know about setup, hardware delivery, and support.',
  },
  faqs: [
    {
      id: 'customize-components',
      q: 'Can I customize individual hardware components rather than taking a whole package?',
      a: 'Yes! Use our interactive Workstation Builder (/workstations/build) to hand-pick your preferred monitor size, chair model, standing desk, and studio peripherals with realtime monthly pricing.',
    },
    {
      id: 'pre-arrival-prep',
      q: 'How is the workstation prepared before my arrival?',
      a: 'Our local field operations team cleans, calibrates, and verifies all equipment 24 hours prior to check-in. When you unlock the apartment door, your workstation is powered on and ready for work.',
    },
    {
      id: 'hardware-malfunction',
      q: 'What if hardware malfunctions during my stay?',
      a: 'All hardware is backed by NomadDesk On-Site Guarantee. Report any issue via the Guest Portal, and our local technician will repair or replace your hardware within 24 hours at zero charge.',
    },
    {
      id: 'internet-guarantee',
      q: 'Is high-speed internet guaranteed across all rooms?',
      a: 'Every listing undergoes physical speed verification before publication. If speeds drop below 80% of the certified benchmark, we immediately deploy a dedicated 5G mobile backup hotspot.',
    },
  ],
  cta: {
    title: 'Ready to Build Your Perfect Remote Workstation?',
    subtitle:
      'Select an apartment in any of our 34 destinations and configure your custom desk and display setup in minutes.',
    buttonLabel: 'Launch Workstation Builder →',
  },
};
