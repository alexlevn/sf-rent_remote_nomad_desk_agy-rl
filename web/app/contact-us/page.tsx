import type { Metadata } from 'next';
import { CONTACT_PAGE_CONTENT } from '@/content/pages/contact';
import { ContactForm } from '@/features/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact Us | NomadDesk',
  description:
    'Get in touch with the NomadDesk concierge team for booking assistance, custom workstation requests, or corporate relocation inquiries.',
  alternates: {
    canonical: '/contact-us',
  },
  openGraph: {
    title: 'Contact Us | NomadDesk',
    description:
      'Get in touch with the NomadDesk concierge team for booking assistance, custom workstation requests, or corporate relocation inquiries.',
    type: 'website',
  },
};

export default function ContactUsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl sm:text-[36px] font-bold text-[var(--color-text-on-light)] tracking-tight mb-3">
          {CONTACT_PAGE_CONTENT.title}
        </h1>
        <p className="text-base sm:text-lg text-[var(--color-text-on-light-muted)] max-w-2xl leading-relaxed">
          {CONTACT_PAGE_CONTENT.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-5 shadow-2xs">
          <div className="text-xl mb-2">⚡</div>
          <h3 className="text-sm font-bold text-[var(--color-text-on-light)] mb-1">Fast Response</h3>
          <p className="text-xs text-[var(--color-text-on-light-muted)]">
            Our global support team responds to guest and host inquiries within 24 hours.
          </p>
        </div>

        <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-5 shadow-2xs">
          <div className="text-xl mb-2">🏢</div>
          <h3 className="text-sm font-bold text-[var(--color-text-on-light)] mb-1">Corporate Relocation</h3>
          <p className="text-xs text-[var(--color-text-on-light-muted)]">
            Custom invoicing, multi-unit stays, and team billing available on request.
          </p>
        </div>

        <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-5 shadow-2xs">
          <div className="text-xl mb-2">🛠️</div>
          <h3 className="text-sm font-bold text-[var(--color-text-on-light)] mb-1">Workstation Support</h3>
          <p className="text-xs text-[var(--color-text-on-light-muted)]">
            Hardware delivery, monitor calibration, or backup 5G routers delivered to your door.
          </p>
        </div>
      </div>

      {/* Embedded Contact Form */}
      <ContactForm
        id="contact"
        heading={CONTACT_PAGE_CONTENT.formHeading}
        subheading={CONTACT_PAGE_CONTENT.formDescription}
      />
    </main>
  );
}
