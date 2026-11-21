'use client';

import React, { useState, useEffect, startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import type { HostApplicationInput, HostProfile, User } from '@/lib/types';
import { ApplyForm } from './apply-form';
import { ApplicationStatusCard } from './application-status-card';
import { Badge } from '@/components/ui/badge';

interface HostApplyContainerProps {
  initialUser: User | null;
  initialHostProfile: HostProfile | null;
  submitAction: (data: HostApplicationInput) => Promise<{
    success: boolean;
    error?: string;
    host?: HostProfile;
  }>;
}

export const HostApplyContainer: React.FC<HostApplyContainerProps> = ({
  initialUser,
  initialHostProfile,
  submitAction,
}) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(initialHostProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [previewState, setPreviewState] = useState<'real' | 'pending' | 'rejected' | 'approved'>('real');
  const [isClientReady, setIsClientReady] = useState(false);

  // Client authentication check on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nomaddesk_user');
      if (!stored) {
        // Unauthenticated access -> redirect to login (AC-HOST-1, AC-HOST-2)
        router.replace('/login?callbackUrl=/host/apply');
        return;
      }
      const parsed = JSON.parse(stored);
      startTransition(() => {
        setCurrentUser(parsed);
        setIsClientReady(true);
      });
    } catch {
      // In case of error, redirect
      router.replace('/login?callbackUrl=/host/apply');
      return;
    }
  }, [router]);

  const handleSubmit = async (data: HostApplicationInput) => {
    const res = await submitAction(data);
    if (res.success && res.host) {
      setHostProfile(res.host);
      setIsEditing(false);
      setPreviewState('real');
    }
    return res;
  };

  if (!isClientReady && !initialUser) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-pulse">
        <div className="h-8 bg-neutral-200 rounded-lg w-1/3 mb-4" />
        <div className="h-64 bg-white rounded-3xl border border-neutral-200" />
      </div>
    );
  }

  // Determine current active profile to display
  let displayProfile: HostProfile | null = hostProfile;
  if (previewState === 'pending') {
    displayProfile = {
      id: 999,
      userId: currentUser?.id || 1,
      displayName: hostProfile?.displayName || 'Casa Urbana Stays',
      slug: 'casa-urbana-stays',
      phone: hostProfile?.phone || '+34 600 000 001',
      website: hostProfile?.website || 'https://casaurbana.com',
      cities: hostProfile?.cities || 'Madrid, Barcelona',
      portfolioSize: hostProfile?.portfolioSize || 5,
      bio: hostProfile?.bio || 'Curated boutique apartments equipped with 1Gbps fiber and ergonomic workstations.',
      avatar: null,
      status: 'pending',
      approvedAt: null,
      createdAt: new Date().toISOString(),
    };
  } else if (previewState === 'rejected') {
    displayProfile = {
      id: 999,
      userId: currentUser?.id || 1,
      displayName: hostProfile?.displayName || 'Casa Urbana Stays',
      slug: 'casa-urbana-stays',
      phone: hostProfile?.phone || '+34 600 000 001',
      website: hostProfile?.website || 'https://casaurbana.com',
      cities: hostProfile?.cities || 'Madrid, Barcelona',
      portfolioSize: hostProfile?.portfolioSize || 5,
      bio: hostProfile?.bio || 'Curated boutique apartments equipped with 1Gbps fiber.',
      avatar: null,
      status: 'rejected',
      rejectionReason:
        'Internet speed report indicates 100 Mbps in 2 units. NomadDesk minimum standard requires certified ≥ 300 Mbps fiber.',
      approvedAt: null,
      createdAt: new Date().toISOString(),
    };
  } else if (previewState === 'approved') {
    displayProfile = {
      id: 999,
      userId: currentUser?.id || 1,
      displayName: hostProfile?.displayName || 'Casa Urbana Stays',
      slug: 'casa-urbana-stays',
      phone: hostProfile?.phone || '+34 600 000 001',
      website: hostProfile?.website || 'https://casaurbana.com',
      cities: hostProfile?.cities || 'Madrid, Barcelona',
      portfolioSize: hostProfile?.portfolioSize || 12,
      bio: hostProfile?.bio || 'Design-led furnished apartments in central Madrid and Barcelona.',
      avatar: null,
      status: 'approved',
      rejectionReason: null,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  const hasSubmitted = Boolean(displayProfile && displayProfile.status);
  const showForm = !hasSubmitted || isEditing;

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
            displayProfile
              ? {
                  displayName: displayProfile.displayName,
                  phone: displayProfile.phone,
                  website: displayProfile.website,
                  cities: displayProfile.cities,
                  portfolioSize: displayProfile.portfolioSize,
                  bio: displayProfile.bio,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          isResubmission={hasSubmitted && displayProfile?.status === 'rejected'}
          onCancelResubmit={hasSubmitted ? () => setIsEditing(false) : undefined}
          onSuccess={(newHost) => {
            setHostProfile(newHost);
            setIsEditing(false);
          }}
        />
      ) : (
        displayProfile && (
          <ApplicationStatusCard
            hostProfile={displayProfile}
            onEdit={() => setIsEditing(true)}
          />
        )
      )}

      {/* UI States & Verification Blocks */}
      <section className="mt-12 pt-8 border-t border-[var(--color-border-light)]">
        <div className="bg-white/80 rounded-2xl border border-[var(--color-border-light)] p-5">
          <div className="text-xs font-bold text-[var(--color-text-on-light)] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>📋 UI States &amp; Verification Blocks — Host Application</span>
            <Badge variant="neutral" pill>
              AC-HOST-1 / AC-HOST-2
            </Badge>
          </div>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mb-4">
            Test and visually verify all lifecycle states required by AC-HOST-1 (Application under review, Rejection with reason, and Approval).
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setPreviewState('real');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                previewState === 'real' && !isEditing
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              Current Real State ({hostProfile ? hostProfile.status : 'New Applicant'})
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewState('real');
                setIsEditing(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showForm && previewState === 'real'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              Empty Form View
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewState('pending');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                previewState === 'pending'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              Pending Review State (AC-HOST-1)
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewState('rejected');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                previewState === 'rejected'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
              }`}
            >
              Declined with Reason State
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewState('approved');
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                previewState === 'approved'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Approved Host Partner State
            </button>
          </div>

          <div className="text-[11px] text-[var(--color-text-light-subtle)] bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
            <strong>Security Rule (AC-HOST-2):</strong> Unapproved guest accounts navigating to <code className="text-neutral-800 font-mono">/host</code> or <code className="text-neutral-800 font-mono">/host/listings</code> are automatically guarded and redirected to this application page.
          </div>
        </div>
      </section>
    </div>
  );
};
