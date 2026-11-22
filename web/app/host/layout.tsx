import type { Metadata } from 'next';
import { getStrictSessionUser } from '@/lib/auth/session';
import { getHostByUserId } from '@/lib/api/hosts';
import { HostShell } from '@/features/host/host-shell';

export const metadata: Metadata = {
  title: 'Host Portal | NomadDesk',
  robots: { index: false, follow: false },
};

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getStrictSessionUser();
  const host = user ? await getHostByUserId(user.id) : null;

  return (
    <HostShell user={user} host={host}>
      {children}
    </HostShell>
  );
}
