'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Monitor, Package, Sliders, Trash2 } from 'lucide-react';
import type { WorkstationAddon, WorkstationComponentOption, WorkstationPackage } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { ComponentCategory } from './constants';

const REORDER_BTN_CLASS =
  'p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer';
const TOGGLE_BTN_CLASS =
  'p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer';
const DELETE_BTN_CLASS = 'p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer';
const SMALL_EDIT_BTN_CLASS =
  'px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-100 text-xs cursor-pointer';
const HEAD_ROW_CLASS =
  'border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]';

type Direction = -1 | 1;

interface ReorderButtonsProps {
  name: string;
  testIdSuffix: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: Direction) => void;
  titleSuffix?: string;
}

function ReorderButtons({ name, testIdSuffix, isFirst, isLast, onMove, titleSuffix = '' }: ReorderButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={isFirst}
        title={`Move up${titleSuffix}`}
        aria-label={`Move ${name} up`}
        data-testid={`move-up-${testIdSuffix}`}
        className={REORDER_BTN_CLASS}
      >
        <ArrowUp className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={isLast}
        title={`Move down${titleSuffix}`}
        aria-label={`Move ${name} down`}
        data-testid={`move-down-${testIdSuffix}`}
        className={REORDER_BTN_CLASS}
      >
        <ArrowDown className="w-3 h-3" />
      </button>
    </div>
  );
}

interface VisibilityToggleProps {
  name: string;
  kind: string;
  isHidden: boolean;
  testId: string;
  onToggle: () => void;
}

function VisibilityToggle({ name, kind, isHidden, testId, onToggle }: VisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isHidden ? `Show ${kind}` : `Hide ${kind}`}
      aria-label={isHidden ? `Show ${name}` : `Hide ${name}`}
      data-testid={testId}
      className={TOGGLE_BTN_CLASS}
    >
      {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
    </button>
  );
}

function EmptyRow({ icon: Icon, message }: { icon: typeof Package; message: string }) {
  return (
    <tr>
      <td colSpan={6} className="py-12 px-4 text-center text-neutral-500">
        <Icon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
        <p className="font-semibold text-neutral-700">{message}</p>
      </td>
    </tr>
  );
}

function TableCard({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={HEAD_ROW_CLASS}>
              {headers.map((label, idx) => (
                <th key={label} className={cn('py-3 px-4', idx === headers.length - 1 && 'text-right')}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-light)]">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function rowClass(isHidden: boolean) {
  return cn('hover:bg-neutral-50/50 transition-colors', isHidden ? 'opacity-60 bg-neutral-50/30' : '');
}

interface PackagesTableProps {
  packages: WorkstationPackage[];
  onMove: (index: number, direction: Direction) => void;
  onToggle: (pkg: WorkstationPackage) => void;
  onEdit: (pkg: WorkstationPackage) => void;
}

export function PackagesTable({ packages, onMove, onToggle, onEdit }: PackagesTableProps) {
  return (
    <TableCard headers={['Order', 'Package Name', 'Monthly Price (€)', 'Hardware Included', 'Status', 'Actions']}>
      {packages.length === 0 ? (
        <EmptyRow icon={Package} message="No workstation packages configured" />
      ) : (
        packages.map((pkg, idx) => {
          const priceEUR = Math.round(pkg.pricePerMonth / 100);
          const isIncluded = pkg.isIncluded || priceEUR === 0;
          const isHidden = pkg.isActive === false;

          return (
            <tr key={pkg.id} data-testid={`package-row-${pkg.id}`} className={rowClass(isHidden)}>
              <td className="py-4 px-4">
                <ReorderButtons
                  name={pkg.name}
                  testIdSuffix={`pkg-${pkg.id}`}
                  isFirst={idx === 0}
                  isLast={idx === packages.length - 1}
                  onMove={(dir) => onMove(idx, dir)}
                />
              </td>
              <td className="py-4 px-4 font-bold text-[var(--color-text-on-light)] text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--color-brand)]" />
                  <span>{pkg.name}</span>
                </div>
                <span className="text-[11px] font-normal text-neutral-400 block mt-0.5">{pkg.description}</span>
              </td>
              <td className="py-4 px-4">
                <span data-testid={`price-display-${pkg.id}`} className="font-bold text-sm text-[var(--color-brand)]">
                  €{priceEUR} / mo
                </span>
              </td>
              <td className="py-4 px-4 text-neutral-600 max-w-md">
                {pkg.features?.join(' · ') || 'Hardware bundle included'}
              </td>
              <td className="py-4 px-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isHidden ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      Hidden
                    </span>
                  ) : isIncluded ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      Default Standard
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      Active Upgrade
                    </span>
                  )}
                </div>
              </td>
              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <VisibilityToggle
                    name={pkg.name}
                    kind="package"
                    isHidden={isHidden}
                    testId={`toggle-pkg-${pkg.id}`}
                    onToggle={() => onToggle(pkg)}
                  />
                  <button
                    type="button"
                    onClick={() => onEdit(pkg)}
                    data-testid={`edit-package-${pkg.id}`}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-light)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          );
        })
      )}
    </TableCard>
  );
}

export interface ComponentListEntry {
  category: ComponentCategory;
  categoryLabel: string;
  item: WorkstationComponentOption;
  catIndex: number;
  catLength: number;
}

interface ComponentsTableProps {
  entries: ComponentListEntry[];
  onMove: (category: ComponentCategory, catIndex: number, direction: Direction) => void;
  onToggle: (category: ComponentCategory, item: WorkstationComponentOption) => void;
  onEdit: (category: ComponentCategory, item: WorkstationComponentOption) => void;
  onDelete: (category: ComponentCategory, id: string) => void;
}

export function ComponentsTable({ entries, onMove, onToggle, onEdit, onDelete }: ComponentsTableProps) {
  return (
    <TableCard headers={['Order', 'Component Name', 'Category', 'Monthly Price (€)', 'Status / Tier', 'Actions']}>
      {entries.length === 0 ? (
        <EmptyRow icon={Monitor} message="No hardware components found" />
      ) : (
        entries.map(({ category, categoryLabel, item, catIndex, catLength }) => {
          const isHidden = item.isActive === false;
          return (
            <tr key={item.id} data-testid={`component-row-${item.id}`} className={rowClass(isHidden)}>
              <td className="py-3 px-4">
                <ReorderButtons
                  name={item.name}
                  testIdSuffix={`comp-${item.id}`}
                  isFirst={catIndex === 0}
                  isLast={catIndex === catLength - 1}
                  onMove={(dir) => onMove(category, catIndex, dir)}
                  titleSuffix=" within category"
                />
              </td>
              <td className="py-3 px-4 font-semibold text-[var(--color-text-on-light)]">
                {item.name}
                <span className="text-[10px] text-neutral-400 block font-normal">{item.description}</span>
              </td>
              <td className="py-3 px-4 text-neutral-600">{categoryLabel}</td>
              <td className="py-3 px-4 font-semibold text-[var(--color-brand)]">
                {item.pricePerMonth === 0 ? '€0 (Included)' : `+€${Math.round(item.pricePerMonth / 100)} / mo`}
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap items-center gap-1">
                  {isHidden && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                      Hidden
                    </span>
                  )}
                  {item.isIncluded ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Base Included
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                      Paid Upgrade
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <VisibilityToggle
                    name={item.name}
                    kind="component"
                    isHidden={isHidden}
                    testId={`toggle-comp-${item.id}`}
                    onToggle={() => onToggle(category, item)}
                  />
                  <button type="button" onClick={() => onEdit(category, item)} className={SMALL_EDIT_BTN_CLASS}>
                    Edit
                  </button>
                  {!item.isIncluded && (
                    <button
                      type="button"
                      onClick={() => onDelete(category, item.id)}
                      data-testid={`delete-comp-${item.id}`}
                      aria-label={`Delete ${item.name}`}
                      className={DELETE_BTN_CLASS}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })
      )}
    </TableCard>
  );
}

interface AddonsTableProps {
  addons: WorkstationAddon[];
  onMove: (index: number, direction: Direction) => void;
  onToggle: (addon: WorkstationAddon) => void;
  onEdit: (addon: WorkstationAddon) => void;
  onDelete: (id: string) => void;
}

export function AddonsTable({ addons, onMove, onToggle, onEdit, onDelete }: AddonsTableProps) {
  return (
    <TableCard headers={['Order', 'Accessory Name', 'Monthly Price (€)', 'Description', 'Status', 'Actions']}>
      {addons.length === 0 ? (
        <EmptyRow icon={Sliders} message="No peripheral add-ons configured" />
      ) : (
        addons.map((addon, idx) => {
          const isHidden = addon.isActive === false;
          return (
            <tr key={addon.id} data-testid={`addon-row-${addon.id}`} className={rowClass(isHidden)}>
              <td className="py-3.5 px-4">
                <ReorderButtons
                  name={addon.name}
                  testIdSuffix={`addon-${addon.id}`}
                  isFirst={idx === 0}
                  isLast={idx === addons.length - 1}
                  onMove={(dir) => onMove(idx, dir)}
                />
              </td>
              <td className="py-3.5 px-4 font-semibold text-[var(--color-text-on-light)]">{addon.name}</td>
              <td className="py-3.5 px-4 font-semibold text-[var(--color-brand)]">
                +€{Math.round(addon.pricePerMonth / 100)} / mo
              </td>
              <td className="py-3.5 px-4 text-neutral-600">{addon.description}</td>
              <td className="py-3.5 px-4">
                {isHidden ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                    Hidden
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                )}
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <VisibilityToggle
                    name={addon.name}
                    kind="add-on"
                    isHidden={isHidden}
                    testId={`toggle-addon-${addon.id}`}
                    onToggle={() => onToggle(addon)}
                  />
                  <button type="button" onClick={() => onEdit(addon)} className={SMALL_EDIT_BTN_CLASS}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(addon.id)}
                    data-testid={`delete-addon-${addon.id}`}
                    aria-label={`Delete ${addon.name}`}
                    className={DELETE_BTN_CLASS}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })
      )}
    </TableCard>
  );
}
