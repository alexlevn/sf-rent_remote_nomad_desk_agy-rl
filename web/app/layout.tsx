import type { Metadata } from 'next';
import './globals.css';
import { CurrencyProvider } from '@/context/currency-context';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SITE_CONFIG } from '@/content/site';

export const metadata: Metadata = {
  title: SITE_CONFIG.title,
  description: SITE_CONFIG.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[var(--color-bg-light)] text-[var(--color-text-on-light)]">
        <CurrencyProvider>
          <Header />
          <div className="flex-1 flex flex-col pt-24 min-h-[calc(100vh-80px)]">
            {children}
          </div>
          <Footer />
        </CurrencyProvider>
      </body>
    </html>
  );
}
