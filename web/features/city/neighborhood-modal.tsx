'use client';

import React, { useEffect } from 'react';

interface NeighborhoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  neighborhoods: { name: string; count: number }[];
  selectedNeighborhood: string | null;
  onSelectNeighborhood: (neighborhood: string | null) => void;
}

export function NeighborhoodModal({
  isOpen,
  onClose,
  cityName,
  neighborhoods,
  selectedNeighborhood,
  onSelectNeighborhood,
}: NeighborhoodModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="neighborhood-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[var(--color-border-light)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)]">
          <div>
            <h2 id="neighborhood-modal-title" className="text-lg font-bold text-[var(--color-text-on-light)]">
              Neighborhoods in {cityName}
            </h2>
            <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
              Select a neighborhood to filter monthly furnished stays
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">
          {/* All Neighborhoods Option */}
          <button
            type="button"
            onClick={() => {
              onSelectNeighborhood(null);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              selectedNeighborhood === null
                ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                : 'border-[var(--color-border-light)] bg-white hover:bg-neutral-50 text-[var(--color-text-on-light)]'
            }`}
          >
            <span>All Neighborhoods</span>
            {selectedNeighborhood === null && <span className="text-xs font-bold">✓ Selected</span>}
          </button>

          {/* Neighborhood List */}
          {neighborhoods.map((n) => {
            const isSelected =
              selectedNeighborhood !== null &&
              selectedNeighborhood.toLowerCase() === n.name.toLowerCase();
            return (
              <button
                key={n.name}
                type="button"
                onClick={() => {
                  onSelectNeighborhood(isSelected ? null : n.name);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                    : 'border-[var(--color-border-light)] bg-white hover:bg-neutral-50 text-[var(--color-text-on-light)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <span>{n.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-on-light-muted)] bg-neutral-100 px-2 py-0.5 rounded-full">
                    {n.count} {n.count === 1 ? 'stay' : 'stays'}
                  </span>
                  {isSelected && <span className="text-xs font-bold text-[var(--color-brand)]">✓</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-50 border-t border-[var(--color-border-light)]">
          <button
            type="button"
            onClick={() => {
              onSelectNeighborhood(null);
              onClose();
            }}
            className="text-xs font-semibold text-[var(--color-text-on-light-muted)] hover:text-black underline cursor-pointer"
          >
            Reset Selection
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
