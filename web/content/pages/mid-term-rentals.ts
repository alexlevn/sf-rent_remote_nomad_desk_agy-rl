import { BOOKING_RULES } from '@/content/booking-rules';

export const MID_TERM_RENTALS_CONTENT = {
  title: 'Mid-Term Rentals',
  subtitle: `Stays of ${BOOKING_RULES.minimumStayNights} nights or more, furnished, with a proper desk and fiber internet already in place.`,
  sections: [
    {
      title: 'Why a month or more',
      body: 'Monthly pricing is lower than nightly rates, there are no cleaning-fee surprises, and the apartment is set up for working from day one.',
    },
    {
      title: 'What is included',
      body: 'Furnished apartment, ergonomic workstation (Comfort Base or Pro Upgrade), verified internet speed and a flexible cancellation window.',
    },
    {
      title: 'Flexible end dates',
      body: `Not sure if you will stay one month or three? Book the first ${BOOKING_RULES.minimumStayNights} nights and talk to the host about extending.`,
    },
  ],
  ctaText: 'Browse apartments',
  ctaHref: '/a/furnished-apartments',
};
