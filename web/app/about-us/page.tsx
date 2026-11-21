import type { Metadata } from 'next';
import { ABOUT_US_CONTENT } from '@/content/pages/about-us';
import { ContactForm } from '@/features/contact/contact-form';

export const metadata: Metadata = {
  title: 'About Us | NomadDesk',
  description:
    'Learn how NomadDesk eliminates wobbly tables and spotty WiFi for remote professionals with certified monthly stays.',
};

export default function AboutUsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-on-light)] tracking-tight mb-4">
          {ABOUT_US_CONTENT.title}
        </h1>
        <p className="text-lg sm:text-xl text-[var(--color-text-on-light)] leading-relaxed mb-8">
          {ABOUT_US_CONTENT.intro}
        </p>

        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8 mb-10 shadow-xs">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-on-light)] mb-3">
            {ABOUT_US_CONTENT.missionTitle}
          </h2>
          <p className="text-base text-[var(--color-text-on-light-muted)] leading-relaxed">
            {ABOUT_US_CONTENT.missionText}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {ABOUT_US_CONTENT.values.map((v) => (
            <div
              key={v.title}
              className="bg-white border border-[var(--color-border-light)] rounded-xl p-5 shadow-2xs"
            >
              <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-2">
                {v.title}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] leading-relaxed">
                {v.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded Contact Support Form */}
      <ContactForm
        id="contact"
        heading="Contact Support"
        subheading="Need assistance with a reservation or custom enterprise relocation? Drop us a note."
      />
    </main>
  );
}
