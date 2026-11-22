import type { Metadata } from 'next';
import './globals.css';
import { CurrencyProvider } from '@/context/currency-context';
import { Header, type HeaderUser } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SITE_CONFIG, getSiteUrl } from '@/content/site';
import { getExchangeRates } from '@/lib/api/rates';
import { getStrictSessionUser } from '@/lib/auth/session';
import { DEFAULT_EXCHANGE_RATES } from '@/lib/pricing';

// Render routes dynamically at request time so Docker builds need no live DB and CMS/DB edits appear immediately
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: SITE_CONFIG.title,
  description: SITE_CONFIG.description,
  openGraph: {
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    siteName: SITE_CONFIG.name,
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialRates = DEFAULT_EXCHANGE_RATES;
  let initialUser: HeaderUser | null = null;

  try {
    const [rates, sessionUser] = await Promise.all([
      getExchangeRates().catch(() => DEFAULT_EXCHANGE_RATES),
      getStrictSessionUser().catch(() => null),
    ]);
    initialRates = rates;
    if (sessionUser && sessionUser.isActive) {
      const displayName =
        `${sessionUser.firstName ?? ''} ${sessionUser.lastName ?? ''}`.trim() ||
        sessionUser.email;
      initialUser = {
        id: sessionUser.id,
        name: displayName,
        email: sessionUser.email,
        role: sessionUser.role,
      };
    }
  } catch {
    // Keep safe defaults if DB is unreachable during static fallback
  }

  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[var(--color-bg-light)] text-[var(--color-text-on-light)]">
        <CurrencyProvider initialRates={initialRates}>
          <Header initialUser={initialUser} />
          <div className="flex-1 flex flex-col pt-24 min-h-[calc(100vh-80px)]">
            {children}
          </div>
          <Footer />
        </CurrencyProvider>
      </body>
    </html>
  );
}
