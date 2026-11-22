'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { normalizeImageSrc } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);

  const uniquePhotos =
    images && images.length > 0 ? images : ['/seed/property/prop-madrid-1.webp'];
  // Visual desktop grid uses up to 5 slots; lightbox always shows real photos without artificial duplicates
  const desktopGridSlots = [...uniquePhotos];
  while (desktopGridSlots.length < 5) {
    desktopGridSlots.push(uniquePhotos[desktopGridSlots.length % uniquePhotos.length]);
  }

  const openModal = (index: number) => {
    setModalIndex(index % uniquePhotos.length);
  };

  const closeModal = () => {
    setModalIndex(null);
  };

  const nextImage = () => {
    if (modalIndex !== null) {
      setModalIndex((modalIndex + 1) % uniquePhotos.length);
    }
  };

  const prevImage = () => {
    if (modalIndex !== null) {
      setModalIndex((modalIndex - 1 + uniquePhotos.length) % uniquePhotos.length);
    }
  };

  // Keyboard navigation and body scroll lock for lightbox modal
  useEffect(() => {
    if (modalIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalIndex(null);
      }
      if (e.key === 'ArrowRight') {
        setModalIndex((curr) => (curr !== null ? (curr + 1) % uniquePhotos.length : null));
      }
      if (e.key === 'ArrowLeft') {
        setModalIndex((curr) =>
          curr !== null ? (curr - 1 + uniquePhotos.length) % uniquePhotos.length : null
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [modalIndex, uniquePhotos.length]);

  return (
    <>
      {/* Desktop Gallery Grid (5-photo layout) */}
      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-3 h-[380px] rounded-2xl overflow-hidden mb-8 shadow-xs">
        <button
          type="button"
          onClick={() => openModal(0)}
          aria-label={`View photo 1 of ${uniquePhotos.length} for ${title}`}
          className="relative row-span-2 cursor-pointer group bg-neutral-100 overflow-hidden text-left border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)]"
        >
          <Image
            src={normalizeImageSrc(desktopGridSlots[0])}
            alt={`${title} - Photo 1`}
            fill
            priority
            sizes="(max-width: 1024px) 50vw, 50vw"
            className="object-cover group-hover:scale-103 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>

        {desktopGridSlots.slice(1, 5).map((img, idx) => (
          <div key={idx} className="relative group bg-neutral-100 overflow-hidden">
            <button
              type="button"
              onClick={() => openModal(idx + 1)}
              aria-label={`View photo ${((idx + 1) % uniquePhotos.length) + 1} of ${uniquePhotos.length} for ${title}`}
              className="relative block w-full h-full cursor-pointer border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)]"
            >
              <Image
                src={normalizeImageSrc(img)}
                alt={`${title} - Photo ${idx + 2}`}
                fill
                sizes="(max-width: 1024px) 25vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
            </button>

            {idx === 3 && (
              <button
                type="button"
                onClick={() => openModal(0)}
                className="absolute bottom-3 right-3 z-10 bg-neutral-900/80 hover:bg-neutral-950 text-white text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>View all {uniquePhotos.length} photos</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Mobile Photo Carousel */}
      <div className="md:hidden relative h-[260px] w-full rounded-2xl overflow-hidden mb-6 bg-neutral-100">
        <button
          type="button"
          onClick={() => openModal(mobileIndex)}
          aria-label={`Open full-screen photo ${mobileIndex + 1} of ${uniquePhotos.length}`}
          className="relative block w-full h-full border-0 p-0 cursor-pointer"
        >
          <Image
            src={normalizeImageSrc(uniquePhotos[mobileIndex])}
            alt={`${title} - Photo ${mobileIndex + 1}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </button>

        <div className="absolute top-3 right-3 bg-neutral-900/70 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-xs font-medium pointer-events-none">
          {mobileIndex + 1} / {uniquePhotos.length}
        </div>

        {uniquePhotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setMobileIndex((prev) => (prev === 0 ? uniquePhotos.length - 1 : prev - 1))
              }
              className="absolute left-2.5 top-1/2 -translate-y-1/2 min-h-10 min-w-10 rounded-full bg-black/60 text-white flex items-center justify-center text-sm backdrop-blur-xs cursor-pointer"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setMobileIndex((prev) => (prev === uniquePhotos.length - 1 ? 0 : prev + 1))
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-10 min-w-10 rounded-full bg-black/60 text-white flex items-center justify-center text-sm backdrop-blur-xs cursor-pointer"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {modalIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo gallery for ${title}`}
        >
          <div className="flex justify-between items-center text-white z-10">
            <span className="text-sm font-medium text-neutral-300">
              {modalIndex + 1} / {uniquePhotos.length} — {title}
            </span>
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex items-center justify-center min-h-10 min-w-10 p-2 rounded-full hover:bg-white/10 transition-colors text-white cursor-pointer"
              aria-label="Close gallery"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative flex-1 w-full max-w-5xl mx-auto my-4 flex items-center justify-center">
            <Image
              src={normalizeImageSrc(uniquePhotos[modalIndex])}
              alt={`${title} - Photo ${modalIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />

            {uniquePhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div className="flex justify-center gap-2 overflow-x-auto py-2">
            {uniquePhotos.map((thumb, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`View photo ${idx + 1}`}
                onClick={() => setModalIndex(idx)}
                className={cn(
                  'relative w-14 h-10 sm:w-16 sm:h-12 rounded-md overflow-hidden shrink-0 border-2 transition-all cursor-pointer',
                  idx === modalIndex
                    ? 'border-white scale-105'
                    : 'border-transparent opacity-50 hover:opacity-100',
                )}
              >
                <Image
                  src={normalizeImageSrc(thumb)}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
