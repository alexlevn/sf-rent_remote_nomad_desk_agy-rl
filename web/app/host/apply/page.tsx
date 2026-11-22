import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getStrictSessionUser } from '@/lib/auth/session';
import { requireStrictUser } from '@/lib/auth/guards';
import { getHostByUserId, applyHost } from '@/lib/api/hosts';
import type { HostApplicationInput, HostProfile } from '@/lib/types';
import { HostApplyContainer } from '@/features/host/host-apply-container';

export const metadata: Metadata = {
  title: 'Apply to Become a Host Partner | NomadDesk',
  description:
    'Submit your curated furnished apartment portfolio to the NomadDesk Partner Network. Connect with vetted tech professionals and remote workers for steady 30+ night stays.',
  robots: { index: false, follow: false },
};

export default async function HostApplyPage() {
  const user = await getStrictSessionUser();
  if (!user) {
    redirect('/login?callbackUrl=/host/apply');
  }

  const hostProfile = await getHostByUserId(user.id);

  async function submitHostApplicationAction(data: HostApplicationInput): Promise<{
    success: boolean;
    error?: string;
    host?: HostProfile;
  }> {
    'use server';

    try {
      const currentUser = await requireStrictUser();
      // Always route through applyHost so re-submissions enforce status guards and notify admin
      const savedProfile = await applyHost({
        ...data,
        userId: currentUser.id,
      });

      revalidatePath('/host/apply');
      revalidatePath('/admin/hosts');
      revalidatePath('/admin');

      return {
        success: true,
        host: savedProfile,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while saving your application.',
      };
    }
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-between">
      <main className="flex-1">
        <HostApplyContainer
          initialHostProfile={hostProfile}
          submitAction={submitHostApplicationAction}
        />
      </main>
    </div>
  );
}
