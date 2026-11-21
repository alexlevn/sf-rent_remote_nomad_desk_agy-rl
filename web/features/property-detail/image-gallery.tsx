'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);

  // Normalize image URLs
  const normalizeSrc = (src: string) => (src.startsWith('/') ? src : `/${src}`);
  
  // Ensure we have at least 5 images for the grid
  const rawList = images.length > 0 ? images : ['/seed/property/prop-madrid-1.webp'];
  const galleryImages = [...rawList];
  while (galleryImages.length < 5) {
    galleryImages.push(rawList[galleryImages.length % rawList.length]);
  }

  const openModal = (index: number) => {
    setModalIndex(index);
  };

  const closeModal = () => {
    setModalIndex(null);
  };

  const nextImage = () => {
    if (modalIndex !== null) {
      setModalIndex((modalIndex + 1) % galleryImages.length);
    }
  };

  const prevImage = () => {
    if (modalIndex !== null) {
      setModalIndex((modalIndex - 1 + galleryImages.length) % galleryImages.length);
    }
  };

  // Keyboard navigation for modal
  React.useEffect(() => {
    if (modalIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalIndex(null);
      }
      if (e.key === 'ArrowRight') {
        setModalIndex((curr) =>
          curr !== null ? (curr + 1) % galleryImages.length : null
        );
      }
      if (e.key === 'ArrowLeft') {
        setModalIndex((curr) =>
          curr !== null
            ? (curr - 1 + galleryImages.length) % galleryImages.length
            : null
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalIndex, galleryImages.length]);

  return (
    <>
      {/* Desktop Gallery Grid (5-photo layout measured from design/l-apartments-detail.html) */}
      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-3 h-[380px] rounded-2xl overflow-hidden mb-8 shadow-xs">
        {/* Main Photo (Row span 2) */}
        <div
          className="relative row-span-2 cursor-pointer group bg-neutral-100 overflow-hidden"
          onClick={() => openModal(0)}
        >
          <Image
            src={normalizeSrc(galleryImages[0])}
            alt={`${title} - Photo 1`}
            fill
            priority
            sizes="(max-width: 1024px) 50vw, 50vw"
            className="object-cover group-hover:scale-103 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* 4 Subsidiary Photos */}
        {galleryImages.slice(1, 5).map((img, idx) => (
          <div
            key={idx}
            className="relative cursor-pointer group bg-neutral-100 overflow-hidden"
            onClick={() => openModal(idx + 1)}
          >
            <Image
              src={normalizeSrc(img)}
              alt={`${title} - Photo ${idx + 2}`}
              fill
              sizes="(max-width: 1024px) 25vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />

            {/* "View all photos" button on last photo */}
            {idx === 3 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(4);
                }}
                className="absolute bottom-3 right-3 bg-neutral-900/80 hover:bg-neutral-950 text-white text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>View all {galleryImages.length} photos</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Mobile Photo Carousel */}
      <div className="md:hidden relative h-[260px] w-full rounded-2xl overflow-hidden mb-6 bg-neutral-100">
        <Image
          src={normalizeSrc(galleryImages[mobileIndex])}
          alt={`${title} - Mobile Photo ${mobileIndex + 1}`}
          fill
          priority
          sizes="100vw"
          className="object-cover cursor-pointer"
          onClick={() => openModal(mobileIndex)}
        />
        
        {/* Controls & Badges */}
        <div className="absolute top-3 right-3 bg-neutral-900/70 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-xs font-medium">
          {mobileIndex + 1} / {galleryImages.length}
        </div>

        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setMobileIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm backdrop-blur-xs"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm backdrop-blur-xs"
              aria-label="Next photo"
            >
              <ChevronRight className="w-4 h-4" />
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
        >
          {/* Top Bar */}
          <div className="flex justify-between items-center text-white z-10">
            <span className="text-sm font-medium text-neutral-300">
              {modalIndex + 1} / {galleryImages.length} — {title}
            </span>
            <button
              type="button"
              onClick={closeModal}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white cursor-pointer"
              aria-label="Close gallery"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Centered Image Container */}
          <div className="relative flex-1 w-full max-w-5xl mx-auto my-4 flex items-center justify-center">
            <Image
              src={normalizeSrc(galleryImages[modalIndex])}
              alt={`${title} - Photo ${modalIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />

            {/* Modal Navigation Buttons */}
            {galleryImages.length > 1 && (
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

          {/* Bottom Thumbnails */}
          <div className="flex justify-center gap-2 overflow-x-auto py-2">
            {galleryImages.map((thumb, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setModalIndex(idx)}
                className={`relative w-14 h-10 sm:w-16 sm:h-12 rounded-md overflow-hidden shrink-0 border-2 transition-all ${
                  idx === modalIndex
                    ? 'border-white scale-105'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <Image
                  src={normalizeSrc(thumb)}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
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
