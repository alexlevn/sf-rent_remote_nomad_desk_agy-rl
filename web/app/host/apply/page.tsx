import React from 'react';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { getHostByUserId, applyHost, updateHostProfile } from '@/lib/api/hosts';
import type { HostApplicationInput, HostProfile } from '@/lib/types';
import { HostApplyContainer } from '@/features/host/host-apply-container';

export const metadata: Metadata = {
  title: 'Apply to Become a Host Partner | NomadDesk',
  description:
    'Submit your curated furnished apartment portfolio to the NomadDesk Partner Network. Connect with vetted tech professionals and remote workers for steady 30+ night stays.',
};

export default async function HostApplyPage() {
  const user = await getCurrentUser();
  const hostProfile = user ? await getHostByUserId(user.id) : null;

  // Server action to handle host application submission or re-submission
  async function submitHostApplicationAction(data: HostApplicationInput): Promise<{
    success: boolean;
    error?: string;
    host?: HostProfile;
  }> {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'You must be signed in to submit a host application.',
      };
    }

    try {
      const existing = await getHostByUserId(currentUser.id);
      let savedProfile: HostProfile;

      if (existing) {
        // Re-submission / update existing profile
        savedProfile = await updateHostProfile(existing.id, {
          displayName: data.displayName,
          phone: data.phone,
          website: data.website || null,
          cities: data.cities,
          portfolioSize: data.portfolioSize,
          bio: data.bio,
          status: 'pending',
          rejectionReason: null,
        });
      } else {
        // New application
        savedProfile = await applyHost({
          ...data,
          userId: currentUser.id,
        });
      }

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
          initialUser={user}
          initialHostProfile={hostProfile}
          submitAction={submitHostApplicationAction}
        />
      </main>
    </div>
  );
}
