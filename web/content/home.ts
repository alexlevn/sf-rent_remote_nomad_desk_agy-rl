export interface StepGuide {
  step: string;
  title: string;
  description: string;
  highlight?: boolean;
}

export const HOME_CONTENT = {
  hero: {
    badge: '⚡ Dedicated Ergonomic Workstation in Every Home',
    title: 'Furnished Apartments for Monthly Rentals with Proper Desks',
    subtitle:
      'Pack one suitcase. Arrive, unpack, and sit down at a dual-monitor 4K desk with guaranteed fiber internet in top remote work hubs.',
    destinationLabel: 'DESTINATION',
    moveInLabel: 'MOVE-IN DATE',
    moveOutLabel: 'MOVE-OUT DATE (MIN 30 DAYS)',
    searchButton: 'Browse apartments',
    dateWarning:
      'Minimum 30 Nights Required: NomadDesk caters to monthly stays. Please select at least 30 consecutive nights.',
  },
  featured: {
    badge: 'Hand-Curated',
    title: 'Featured Apartments with Executive Desks',
    subtitle: 'Inspected ergonomics, certified fiber speeds, and verified host partners.',
    exploreAllLabel: 'Explore All Apartments →',
  },
  cities: {
    badge: 'Global Footprint',
    title: 'Top Cities for Remote Workers',
    subtitle: 'Vibrant digital nomad communities, low timezone friction, and high quality of life.',
    exploreAllLabel: 'Browse All 34 Destinations',
  },
  showcase: {
    badge: 'Seamless Living',
    title: 'One Stay, From Booking to Check-Out',
    subtitle:
      'No viewing appointments, no local guarantor required. Standardized enterprise-grade home offices in every residence.',
    steps: [
      {
        step: '01',
        title: 'Select & Request',
        description:
          'Choose your city, verify your workstation hardware, and submit instant reservation or 48-hour request.',
      },
      {
        step: '02',
        title: 'Arrival & Keyless Access',
        description:
          'Receive your digital lock pass, airport transfer instructions, and direct WiFi credentials 24 hours prior.',
        highlight: true,
      },
      {
        step: '03',
        title: 'Plug In & Focus',
        description:
          'Connect your USB-C cable to dual 4K monitors and mechanical peripherals. You are ready for your standup.',
      },
    ] as StepGuide[],
  },
  workstationBanner: {
    badge: 'Hardware Customizer',
    title: 'Need a 34" Ultrawide or Herman Miller Aeron?',
    description:
      'Every NomadDesk includes our Comfort Base setup. Upgrade monitors, chairs, and creator audio with our Workstation Builder tool.',
    cta: 'Launch Workstation Builder →',
  },
  reels: {
    badge: 'Community Moments',
    title: 'Life in NomadDesk Workspaces',
    subtitle: 'See real remote professionals and digital nomads working from our furnished apartments.',
  },
  guides: {
    badge: 'City Knowledge',
    title: 'Digital Nomad Travel Guides',
    subtitle: 'Cost of living, coworking spaces, neighborhood safety, and visa guides written by nomads.',
    exploreAllLabel: 'Explore All Guides →',
  },
  faq: {
    badge: 'Got Questions?',
    title: 'Frequently Asked Questions',
    subtitle: 'Everything you need to know about monthly bookings, workstations, and our verification process.',
  },
};
