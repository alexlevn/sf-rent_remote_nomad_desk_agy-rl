import React from 'react';
import type { PropertyWorkstation } from '@/lib/types';

interface WorkstationSpecsProps {
  workstation: PropertyWorkstation;
  bedrooms: number;
  bathrooms: number;
  totalSurface: number;
  maxGuests: number;
}

export function WorkstationSpecs({
  workstation,
  bedrooms,
  bathrooms,
  totalSurface,
  maxGuests,
}: WorkstationSpecsProps) {
  return (
    <div className="space-y-6 mb-8">
      {/* Property Key Specs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border border-[var(--color-border-light)] rounded-xl shadow-xs">
        <div>
          <div className="font-bold text-lg text-[var(--color-text-on-light)]">{bedrooms}</div>
          <div className="text-xs text-[var(--color-text-on-light-muted)]">Bedrooms</div>
        </div>
        <div>
          <div className="font-bold text-lg text-[var(--color-text-on-light)]">{bathrooms}</div>
          <div className="text-xs text-[var(--color-text-on-light-muted)]">Bathrooms</div>
        </div>
        <div>
          <div className="font-bold text-lg text-[var(--color-text-on-light)]">{totalSurface} m²</div>
          <div className="text-xs text-[var(--color-text-on-light-muted)]">Surface Area</div>
        </div>
        <div>
          <div className="font-bold text-lg text-[var(--color-text-on-light)]">{maxGuests}</div>
          <div className="text-xs text-[var(--color-text-on-light-muted)]">Max Guests</div>
        </div>
      </div>

      {/* Workstation Specification Box (Core Differentiator — AC-DETAIL-1) */}
      <div
        data-testid="workstation-specs-box"
        className="bg-[var(--color-text-on-light)] text-white rounded-2xl p-6 sm:p-7 shadow-xs border border-neutral-800"
      >
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🖥️</span>
            <span>Dedicated Workstation Specs</span>
          </h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-brand)] text-white">
            Included at €0
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-semibold text-white">Monitors: </span>
            <span className="text-[var(--color-text-on-dark-subtle)]">
              {workstation.monitors || 'Dual 27" 4K UHD Monitors'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-white">Desk: </span>
            <span className="text-[var(--color-text-on-dark-subtle)]">
              {workstation.desk || 'Motorized Standing Desk (160x80cm)'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-white">Chair: </span>
            <span className="text-[var(--color-text-on-dark-subtle)]">
              {workstation.chair || 'Ergonomic Executive Seating'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-white">Peripherals: </span>
            <span className="text-[var(--color-text-on-dark-subtle)]">
              {workstation.keyboard || 'Precision Mechanical Keyboard & Wireless Mouse'}
            </span>
          </div>
          <div className="sm:col-span-2">
            <span className="font-semibold text-white">Internet Speed: </span>
            <span className="text-emerald-400 font-bold">
              {workstation.wifiSpeed ? `${workstation.wifiSpeed} Mbps Guaranteed Fiber` : '600 Mbps Guaranteed Fiber'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
