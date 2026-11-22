'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { HostProfile, Location, Property } from '@/lib/types';
import { formatLastSaved } from '@/lib/format';
import { createAdminPropertyAction, updateAdminPropertyAction } from '@/app/admin/admin-actions';
import { MediaLibraryModal } from '@/features/media/media-library-modal';
import { useUnsavedChanges } from '@/features/media/use-unsaved-changes';
import { usePropertyImages } from '@/features/property-form/use-property-images';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PROPERTY_IMAGE,
  buildAdminPropertyPayload,
  buildInitialValues,
  resolveDefaultHostId,
  resolveDefaultLocation,
  validateAdminPropertyForm,
  type AdminPropertyFormErrors,
  type AdminPropertyFormValues,
  type SetAdminPropertyField,
} from '@/features/admin/property-form/form-values';
import { SubmitLabel } from '@/features/admin/property-form/form-ui';
import { BasicsSection, RichContentSection } from '@/features/admin/property-form/content-sections';
import {
  PricingSection,
  SpecsSection,
  WorkstationSection,
} from '@/features/admin/property-form/detail-sections';
import { LocationCard, PublishCard } from '@/features/admin/property-form/sidebar-cards';
import { AdminPhotosCard } from '@/features/admin/property-form/admin-photos-card';

interface AdminPropertyFormProps {
  initialData?: Property;
  hosts: HostProfile[];
  locations: Location[];
}

export function AdminPropertyForm({ initialData, hosts, locations }: AdminPropertyFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(initialData);

  const [defaultLocation] = useState(() => resolveDefaultLocation(initialData, locations));
  const [values, setValues] = useState<AdminPropertyFormValues>(() =>
    buildInitialValues(initialData, resolveDefaultHostId(initialData, hosts), defaultLocation)
  );
  const setField = useCallback<SetAdminPropertyField>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const [errors, setErrors] = useState<AdminPropertyFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const clearImagesFieldError = () => {
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  };

  const photos = usePropertyImages(
    initialData?.images && initialData.images.length > 0 ? initialData.images : [DEFAULT_PROPERTY_IMAGE],
    clearImagesFieldError
  );

  // Track dirty state against initial snapshot for unsaved-changes warnings
  const currentSnapshot = JSON.stringify({ ...values, images: photos.images });
  const [baselineSnapshot, setBaselineSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = currentSnapshot !== baselineSnapshot;
  const { confirmLeave } = useUnsavedChanges(isDirty);

  const lastSavedLabel = formatLastSaved(initialData?.updatedAt);
  const canViewOnWeb = Boolean(isEditMode && initialData?.status === 'published' && initialData.slug);
  const errorCount = Object.keys(errors).length;

  const handleCancel = () => {
    if (!confirmLeave()) return;
    router.push('/admin/properties');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setServerError(null);

    const nextErrors = validateAdminPropertyForm(values, {
      locations,
      initialData,
      imageCount: photos.images.length,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => {
        const firstInvalid = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"], [data-field-error="true"]'
        );
        firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid?.focus?.();
      });
      return;
    }

    const payload = buildAdminPropertyPayload(values, photos.images, { locations, initialData });

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (isEditMode && initialData) {
        const updated = await updateAdminPropertyAction(initialData.id, payload);
        if (!updated) {
          throw new Error('Property not found or could not be updated.');
        }
      } else {
        await createAdminPropertyAction(payload);
      }

      // Clear dirty state before navigating away so leave guards do not fire
      setBaselineSnapshot(currentSnapshot);
      router.push('/admin/properties');
      router.refresh();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to save property.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const sectionProps = { values, errors, setField };

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6 pb-8">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/properties"
            onClick={(e) => {
              if (!confirmLeave()) {
                e.preventDefault();
              }
            }}
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Property Inventory</span>
          </Link>

          {isEditMode && initialData && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-on-light-muted)]">
              <span className="font-mono">{initialData.reference}</span>
              <span>·</span>
              <span>ID #{initialData.id}</span>
            </div>
          )}
        </div>

        {serverError && (
          <div
            role="alert"
            data-testid="property-form-error"
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to save property</p>
              <p className="text-xs mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        {/* WordPress / WooCommerce Two-Column Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <BasicsSection {...sectionProps} />
            <RichContentSection values={values} setField={setField} />
            <PricingSection {...sectionProps} />
            <SpecsSection {...sectionProps} />
            <WorkstationSection {...sectionProps} />
          </div>

          <div className="space-y-5 min-w-0">
            <PublishCard
              {...sectionProps}
              hosts={hosts}
              initialData={initialData}
              isEditMode={isEditMode}
              isSubmitting={isSubmitting}
              lastSavedLabel={lastSavedLabel}
              canViewOnWeb={canViewOnWeb}
            />
            <AdminPhotosCard photos={photos} title={values.title} fieldError={errors.images} />
            <LocationCard
              {...sectionProps}
              locations={locations}
              initialData={initialData}
              hasDefaultLocation={defaultLocation !== null}
            />
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div
          data-testid="property-sticky-save-bar"
          className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-light)] bg-white/95 backdrop-blur-xs px-4 py-3 shadow-lg"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span
              aria-hidden="true"
              className={cn('h-2 w-2 rounded-full', isDirty ? 'bg-amber-500' : 'bg-emerald-500')}
            />
            <span
              data-testid="property-dirty-status"
              className={isDirty ? 'text-amber-700 font-semibold' : 'text-[var(--color-text-on-light-muted)]'}
            >
              {isDirty ? 'Unsaved changes' : 'Ready to save'}
            </span>
            {errorCount > 0 && (
              <span role="alert" className="text-red-600 font-semibold">
                · Please fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} above
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              data-testid="property-cancel-btn"
              className="min-h-10 rounded-xl border border-[var(--color-border-light)] bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-sm px-4 py-2 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="property-sticky-submit-btn"
              className="min-h-10 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-semibold text-sm px-5 py-2 inline-flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <SubmitLabel isSubmitting={isSubmitting} isEditMode={isEditMode} />
            </button>
          </div>
        </div>
      </form>

      <MediaLibraryModal
        isOpen={photos.isMediaModalOpen}
        onClose={() => photos.setMediaModalOpen(false)}
        onSelect={photos.addFromMediaLibrary}
        multiple={true}
        allowUrlTab={true}
        initialTab="upload"
        title="Property Photos"
      />
    </>
  );
}
