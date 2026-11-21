'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Building2,
  Phone,
  Globe,
  MapPin,
  Layers,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { HostProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ApplicationStatusCardProps {
  hostProfile: HostProfile;
  onEdit?: () => void;
}

export const ApplicationStatusCard: React.FC<ApplicationStatusCardProps> = ({
  hostProfile,
  onEdit,
}) => {
  const { status, displayName, phone, website, cities, portfolioSize, bio, rejectionReason, approvedAt, createdAt } =
    hostProfile;

  // Format date helper
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Just now';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (status === 'pending') {
    return (
      <div className="bg-white rounded-3xl border border-[var(--color-border-light)] p-8 sm:p-10 shadow-[var(--shadow-md)]">
        {/* Status Badge & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Badge variant="accent" pill>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1.5" />
            Under Review
          </Badge>
          <span className="text-xs text-[var(--color-text-on-light-muted)]">
            Submitted: {formatDate(createdAt)}
          </span>
        </div>

        {/* Icon & Title */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-on-light)] tracking-tight">
              Application under review
            </h2>
            <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1 leading-relaxed">
              Thank you for applying to the NomadDesk Partner Network. Our curation team is currently reviewing your apartment portfolio, workstation equipment, and high-speed internet reliability.
            </p>
          </div>
        </div>

        {/* Application Summary Box */}
        <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-2xl p-5 mb-6 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-on-light)] mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            Submitted Portfolio Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--color-text-light-subtle)]" />
              <div>
                <span className="text-[var(--color-text-on-light-muted)] block">Company / Name</span>
                <span className="font-semibold text-[var(--color-text-on-light)]">{displayName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[var(--color-text-light-subtle)]" />
              <div>
                <span className="text-[var(--color-text-on-light-muted)] block">Contact Phone</span>
                <span className="font-semibold text-[var(--color-text-on-light)]">{phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-text-light-subtle)]" />
              <div>
                <span className="text-[var(--color-text-on-light-muted)] block">Operating Cities</span>
                <span className="font-semibold text-[var(--color-text-on-light)]">{cities}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--color-text-light-subtle)]" />
              <div>
                <span className="text-[var(--color-text-on-light-muted)] block">Portfolio Size</span>
                <span className="font-semibold text-[var(--color-text-on-light)]">{portfolioSize} apartments</span>
              </div>
            </div>

            {website && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Globe className="w-4 h-4 text-[var(--color-text-light-subtle)]" />
                <div>
                  <span className="text-[var(--color-text-on-light-muted)] block">Website</span>
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[var(--color-brand)] hover:underline"
                  >
                    {website}
                  </a>
                </div>
              </div>
            )}
          </div>

          {bio && (
            <div className="pt-2 border-t border-[var(--color-border-light)] text-xs">
              <span className="text-[var(--color-text-on-light-muted)] block mb-1">Portfolio Bio:</span>
              <p className="text-[var(--color-text-on-light)] italic leading-relaxed">{bio}</p>
            </div>
          )}
        </div>

        {/* SLA Notice & Access Protection Alert */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 mb-6 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            Review SLA: 24 to 48 Business Hours
          </div>
          <p className="text-amber-800 leading-relaxed">
            Our market managers review submissions Monday through Friday. You will receive an email notification when your listing privileges are activated.
          </p>
          <p className="text-amber-700 text-[11px] pt-1">
            Note: Host portal access (<code className="bg-amber-100 px-1 py-0.5 rounded">/host</code> and <code className="bg-amber-100 px-1 py-0.5 rounded">/host/listings</code>) will remain protected until your application status updates to approved.
          </p>
        </div>

        {/* Action Link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-border-light)]">
          <Link
            href="/partner-network"
            className="text-xs font-medium text-[var(--color-brand)] hover:underline"
          >
            ← Back to Partner Network Overview
          </Link>
          <div className="text-xs text-[var(--color-text-on-light-muted)]">
            Questions? Contact <a href="mailto:partners@nomaddesk.com" className="text-[var(--color-text-on-light)] font-medium hover:underline">partners@nomaddesk.com</a>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="bg-white rounded-3xl border border-red-200 p-8 sm:p-10 shadow-[var(--shadow-md)]">
        {/* Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            Application Declined
          </span>
          <span className="text-xs text-[var(--color-text-on-light-muted)]">
            Status: Action Required
          </span>
        </div>

        {/* Icon & Title */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-on-light)] tracking-tight">
              Application Requires Revisions
            </h2>
            <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1 leading-relaxed">
              Thank you for your interest in NomadDesk. Our curation team was unable to approve your application in its current state. Please review the feedback below and update your portfolio details.
            </p>
          </div>
        </div>

        {/* Rejection Reason Callout */}
        <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-xs text-red-900 mb-6 space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5 text-red-950">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            Curator Feedback &amp; Rejection Reason:
          </div>
          <p className="text-red-800 text-sm font-medium pl-5 leading-relaxed">
            &ldquo;{rejectionReason || 'Portfolio does not meet current ergonomics or fiber speed requirements (≥ 300 Mbps). Please provide updated workstation specifications.'}&rdquo;
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-border-light)]">
          {onEdit && (
            <Button
              type="button"
              variant="primary"
              onClick={onEdit}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Update and Resubmit Application
            </Button>
          )}
          <Link
            href="/partner-network"
            className="text-xs font-medium text-[var(--color-text-on-light-muted)] hover:text-[var(--color-brand)]"
          >
            ← View Requirements
          </Link>
        </div>
      </div>
    );
  }

  // Approved Status
  return (
    <div className="bg-white rounded-3xl border border-emerald-200 p-8 sm:p-10 shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          Approved Host Partner
        </span>
        <span className="text-xs text-[var(--color-text-on-light-muted)]">
          Active since {formatDate(approvedAt)}
        </span>
      </div>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-on-light)] tracking-tight">
            Welcome to NomadDesk, {displayName}!
          </h2>
          <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1 leading-relaxed">
            Your host partner profile is fully approved. You can now manage your apartment listings, configure workstation equipment, set calendar availability, and monitor monthly payouts.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-900 mb-6 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
        <div>
          <span className="font-semibold block">Full Host Privileges Activated</span>
          <span className="text-emerald-800">Direct booking requests and instant bookings are now enabled for your account.</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-border-light)]">
        <Link href="/host">
          <Button variant="primary" className="w-full sm:w-auto">
            Go to Host Portal Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
        <Link
          href="/partner-network"
          className="text-xs font-medium text-[var(--color-text-on-light-muted)] hover:text-[var(--color-brand)]"
        >
          Partner Network Overview
        </Link>
      </div>
    </div>
  );
};
