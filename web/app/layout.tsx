import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NomadDesk — Furnished Apartments & Remote Workspaces',
  description:
    'Book flexible furnished apartments with verified high-speed Wi-Fi and ergonomic workspaces designed for digital nomads.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[var(--color-bg-light)] text-[var(--color-text-on-light)]">
        {children}
      </body>
    </html>
  );
}
