import React from 'react';
import { Loader2, Save, type LucideIcon } from 'lucide-react';

export const inputClass =
  'w-full min-h-10 text-sm py-2 px-3 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/25';
export const labelClass = 'block text-xs font-semibold text-[var(--color-text-on-light)] mb-1';
export const cardClass =
  'bg-white border border-[var(--color-border-light)] rounded-xl p-5 sm:p-6 space-y-5 shadow-2xs';

export function CardTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-[var(--color-brand)]" />
      <h2 className="text-base font-bold text-[var(--color-text-on-light)]">{children}</h2>
    </div>
  );
}

export function CardHeader({ icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="pb-3 border-b border-[var(--color-border-light)]">
      <CardTitle icon={icon}>{children}</CardTitle>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

export function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

export function SubmitLabel({ isSubmitting, isEditMode }: { isSubmitting: boolean; isEditMode: boolean }) {
  return isSubmitting ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{isEditMode ? 'Saving Changes...' : 'Creating Property...'}</span>
    </>
  ) : (
    <>
      <Save className="w-4 h-4" />
      <span>{isEditMode ? 'Save Changes' : 'Create Property'}</span>
    </>
  );
}
