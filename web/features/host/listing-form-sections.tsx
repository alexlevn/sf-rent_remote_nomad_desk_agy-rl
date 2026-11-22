'use client';

import React, { useCallback, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ExternalLink } from 'lucide-react';
import type { Location, Property } from '@/lib/types';
import { MediaLibraryModal } from '@/features/media/media-library-modal';
import { useUnsavedChanges } from '@/features/media/use-unsaved-changes';
import { usePropertyImages } from '@/features/property-form/use-property-images';
import {
  buildInitialListingValues,
  buildListingPayload,
  validateListingForm,
  type HostListingFormErrors,
  type HostListingFormValues,
  type ListingSaveIntent,
  type SetHostListingField,
} from '@/features/host/listing-form/form-values';
import { ListingBasicsSection } from '@/features/host/listing-form/basics-section';
import { ListingPhotosSection } from '@/features/host/listing-form/photos-section';
import {
  ListingPricingSection,
  ListingSpecsSection,
  ListingWorkstationSection,
} from '@/features/host/listing-form/detail-sections';
import { ListingActionBar } from '@/features/host/listing-form/action-bar';

interface ListingFormSectionsProps {
  initialData?: Property;
  locations: Location[];
  isReadOnly?: boolean;
  onSaveAction: (
    data: Partial<Property>,
    intent: ListingSaveIntent
  ) => Promise<{ success: boolean; error?: string; property?: Property }>;
}

export function ListingFormSections({
  initialData,
  locations,
  isReadOnly = false,
  onSaveAction,
}: ListingFormSectionsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [values, setValues] = useState<HostListingFormValues>(() =>
    buildInitialListingValues(initialData, locations)
  );
  const setField = useCallback<SetHostListingField>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const [errors, setErrors] = useState<HostListingFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingIntent, setSubmittingIntent] = useState<ListingSaveIntent | null>(null);
  const isSubmittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const clearImagesFieldError = () => {
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  };

  // New listings start with no photos so hosts intentionally upload or pick them
  const photos = usePropertyImages(initialData?.images ? [...initialData.images] : [], clearImagesFieldError);

  // Track dirty state against initial snapshot for unsaved-changes warnings
  const currentSnapshot = JSON.stringify({ ...values, images: photos.images });
  const [baselineSnapshot, setBaselineSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = currentSnapshot !== baselineSnapshot;
  const { confirmLeave } = useUnsavedChanges(isDirty);

  const canViewOnWeb = Boolean(initialData && initialData.status === 'published' && initialData.slug);
  const isPreservableLiveStatus = initialData?.status === 'published' || initialData?.status === 'hidden';

  const resetSubmitting = () => {
    setIsSubmitting(false);
    setSubmittingIntent(null);
    isSubmittingRef.current = false;
  };

  const handleSubmit = async (intent: ListingSaveIntent) => {
    if (isReadOnly || isSubmittingRef.current) return;

    const nextErrors = validateListingForm(values, photos.images, intent);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => {
        const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus?.();
        }
      });
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmittingIntent(intent);
    setServerError(null);

    try {
      const res = await onSaveAction(buildListingPayload(values, photos.images, locations, initialData), intent);

      if (!res.success) {
        setServerError(res.error || 'Failed to save listing. Please try again.');
        resetSubmitting();
        return;
      }

      setBaselineSnapshot(currentSnapshot);
      startTransition(() => {
        router.push('/host/listings');
      });
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      resetSubmitting();
    }
  };

  const handleCancel = () => {
    if (isSubmittingRef.current) return;
    if (!confirmLeave()) return;
    router.push('/host/listings');
  };

  const sectionProps = { values, errors, setField };

  return (
    <>
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8 md:p-10 max-w-4xl mx-auto shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-neutral-100 pb-5 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              {initialData ? `Edit Listing #${initialData.id}` : 'Create New Apartment Listing'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Provide complete property information, verified workstation hardware specifications, and monthly rates.
            </p>
          </div>
          {canViewOnWeb && initialData && (
            <Link
              href={`/l/apartments/${initialData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="host-view-on-web-link"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View on Web</span>
            </Link>
          )}
        </div>

        {serverError && (
          <div
            role="alert"
            className="mb-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Unable to save listing: </span>
              {serverError}
            </div>
          </div>
        )}

        <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-10">
          <ListingBasicsSection {...sectionProps} locations={locations} initialData={initialData} />
          <ListingPhotosSection photos={photos} fieldError={errors.images} />
          <ListingSpecsSection values={values} setField={setField} />
          <ListingWorkstationSection {...sectionProps} />
          <ListingPricingSection {...sectionProps} />
          <ListingActionBar
            isDirty={isDirty}
            errorCount={Object.keys(errors).length}
            isReadOnly={isReadOnly}
            isSubmitting={isSubmitting}
            submittingIntent={submittingIntent}
            isPreservableLiveStatus={isPreservableLiveStatus}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
          />
        </form>
      </div>

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
