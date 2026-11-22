import React from 'react';
import type { Metadata } from 'next';
import { getHostPortalContext } from '@/lib/auth/host-page';
import { HostProfileForm } from '@/features/host/host-profile-form';

export const metadata: Metadata = {
  title: 'Host Profile | NomadDesk Host Portal',
  description: 'Manage your public host profile, logo, bio, and portfolio details.',
  robots: { index: false, follow: false },
};

export default async function HostProfilePage() {
  const { host, isReadOnly } = await getHostPortalContext('/host/profile');

  return <HostProfileForm initialProfile={host} isReadOnly={isReadOnly} />;
}
