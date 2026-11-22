'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Property } from '@/lib/types';
import { ReasonPromptModal } from '@/features/admin/reason-prompt-modal';

interface PropertyRejectModalProps {
  property: Property;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function PropertyRejectModal({ property, isSubmitting, onCancel, onConfirm }: PropertyRejectModalProps) {
  return (
    <ReasonPromptModal
      ariaLabel={`Reject ${property.title}`}
      icon={AlertTriangle}
      title="Reject Property Listing"
      subtitle={property.title}
      description="Please state why this listing is being rejected so the Host can correct the listing details."
      defaultReason="Listing requires higher quality workstation photos"
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
