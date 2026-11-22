'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import type { HostApplicationInput, HostProfile } from '@/lib/types';
import { ApplyForm } from './apply-form';
import { ApplicationStatusCard } from './application-status-card';

interface HostApplyContainerProps {
  initialHostProfile: HostProfile | null;
  submitAction: (data: HostApplicationInput) => Promise<{
    success: boolean;
    error?: string;
    host?: HostProfile;
  }>;
}

export const HostApplyContainer: React.FC<HostApplyContainerProps> = ({
  initialHostProfile,
  submitAction,
}) => {
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(initialHostProfile);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (data: HostApplicationInput) => {
    const res = await submitAction(data);
    if (res.success && res.host) {
      setHostProfile(res.host);
      setIsEditing(false);
    }
    return res;
  };

  const hasSubmitted = Boolean(hostProfile && hostProfile.status);
  const showForm = !hasSubmitted || (isEditing && hostProfile?.status === 'rejected');

  return (
    <div className="w-full max-w-3xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      {/* Top Breadcrumb / Back Link */}
      <div className="flex items-center justify-between pb-6 mb-2">
        <Link
          href="/partner-network"
          className="text-xs sm:text-sm font-medium text-[var(--color-text-on-light-muted)] hover:text-[var(--color-brand)] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Partner Network</span>
        </Link>
        <span className="text-xs text-[var(--color-text-light-subtle)] flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          Verified Host Application
        </span>
      </div>

      {/* Main Content Card: Form or Status Card */}
      {showForm ? (
        <ApplyForm
          initialData={
            hostProfile
              ? {
                  displayName: hostProfile.displayName,
                  phone: hostProfile.phone,
                  website: hostProfile.website,
                  cities: hostProfile.cities,
                  portfolioSize: hostProfile.portfolioSize,
                  bio: hostProfile.bio,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          isResubmission={hasSubmitted && hostProfile?.status === 'rejected'}
          onCancelResubmit={hasSubmitted ? () => setIsEditing(false) : undefined}
          onSuccess={(newHost) => {
            setHostProfile(newHost);
            setIsEditing(false);
          }}
        />
      ) : (
        hostProfile && (
          <ApplicationStatusCard
            hostProfile={hostProfile}
            onEdit={hostProfile.status === 'rejected' ? () => setIsEditing(true) : undefined}
          />
        )
      )}
    </div>
  );
};
