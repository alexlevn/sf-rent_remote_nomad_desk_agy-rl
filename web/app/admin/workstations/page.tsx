'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import Link from 'next/link';
import type {
  WorkstationData,
  WorkstationPackage,
  WorkstationComponentOption,
  WorkstationAddon,
} from '@/lib/types';
import {
  saveWorkstationPackageAction,
  saveWorkstationComponentAction,
  deleteWorkstationComponentAction,
  saveWorkstationAddonAction,
  deleteWorkstationAddonAction,
  reorderWorkstationItemsAction,
  fetchAdminWorkstationsAction,
} from '@/app/admin/cms-actions';
import { Monitor, Package, Sliders, Plus, X, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPONENT_CATEGORIES, type ComponentCategory } from '@/features/admin/workstations/constants';
import { PackageEditModal } from '@/features/admin/workstations/package-edit-modal';
import {
  ComponentEditModal,
  type ComponentModalTarget,
} from '@/features/admin/workstations/component-edit-modal';
import { AddonEditModal, type AddonModalTarget } from '@/features/admin/workstations/addon-edit-modal';
import {
  AddonsTable,
  ComponentsTable,
  PackagesTable,
  type ComponentListEntry,
} from '@/features/admin/workstations/catalog-tables';

const TOAST_DURATION_MS = 3500;
const DELETE_REFERENCED_ERROR =
  'Cannot delete workstation option referenced by existing reservations. Hide it instead.';

function moveItem<T>(items: T[], index: number, nextIndex: number): T[] {
  const ordered = [...items];
  const [moved] = ordered.splice(index, 1);
  ordered.splice(nextIndex, 0, moved);
  return ordered;
}

export default function AdminWorkstationsPage() {
  const [data, setData] = useState<WorkstationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'packages' | 'components' | 'addons'>('packages');
  const [componentCategory, setComponentCategory] = useState<ComponentCategory | 'all'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pkgTarget, setPkgTarget] = useState<WorkstationPackage | null>(null);
  const [compTarget, setCompTarget] = useState<ComponentModalTarget | null>(null);
  const [addonTarget, setAddonTarget] = useState<AddonModalTarget | null>(null);

  const isActionRunningRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  }, []);

  const fetchWorkstations = useCallback(async () => {
    try {
      const wsData = await fetchAdminWorkstationsAction();
      startTransition(() => {
        setData(wsData);
        setLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setActionError(err instanceof Error ? err.message : 'Failed to load workstation catalog.');
        setLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    fetchWorkstations();
  }, [fetchWorkstations]);

  const closePkgModal = useCallback(() => setPkgTarget(null), []);
  const closeCompModal = useCallback(() => setCompTarget(null), []);
  const closeAddonModal = useCallback(() => setAddonTarget(null), []);

  const handleModalSaved = useCallback(
    async (message: string) => {
      showToast(message);
      setPkgTarget(null);
      setCompTarget(null);
      setAddonTarget(null);
      await fetchWorkstations();
    },
    [fetchWorkstations, showToast]
  );

  // Serializes list actions (toggle / reorder / delete) so double clicks don't race
  const runListAction = async (action: () => Promise<void>, fallbackError: string) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : fallbackError);
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const applyReorder = async (
    kind: 'package' | 'component' | 'addon',
    ids: string[],
    message: string
  ) => {
    const res = await reorderWorkstationItemsAction(kind, ids);
    startTransition(() => {
      setData(res.workstations);
    });
    showToast(message);
  };

  // 1. Packages
  const handleOpenEditPkg = (pkg: WorkstationPackage) => {
    setActionError(null);
    setPkgTarget(pkg);
  };

  const handleTogglePkgActive = (pkg: WorkstationPackage) =>
    runListAction(async () => {
      const nextActive = pkg.isActive === false;
      await saveWorkstationPackageAction({ id: pkg.id, isActive: nextActive });
      showToast(`Package "${pkg.name}" is now ${nextActive ? 'visible' : 'hidden'}.`);
      await fetchWorkstations();
    }, 'Failed to toggle package visibility.');

  const handleMovePkg = (index: number, direction: -1 | 1) => {
    if (!data) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= data.packages.length) return;
    return runListAction(
      () =>
        applyReorder(
          'package',
          moveItem(data.packages, index, nextIndex).map((p) => p.id),
          'Package order updated.'
        ),
      'Failed to reorder packages.'
    );
  };

  // 2. Components
  const handleOpenAddComp = (cat: ComponentCategory = 'monitor') => {
    setActionError(null);
    setCompTarget({
      isNew: true,
      category: cat,
      item: {
        id: `comp-${Date.now()}`,
        name: '',
        pricePerMonth: 0,
        isIncluded: false,
        description: '',
        isActive: true,
      },
    });
  };

  const handleOpenEditComp = (cat: ComponentCategory, comp: WorkstationComponentOption) => {
    setActionError(null);
    setCompTarget({ isNew: false, category: cat, item: comp });
  };

  const handleToggleCompActive = (category: ComponentCategory, item: WorkstationComponentOption) =>
    runListAction(async () => {
      const nextActive = item.isActive === false;
      await saveWorkstationComponentAction(category, { id: item.id, isActive: nextActive });
      showToast(`Component "${item.name}" is now ${nextActive ? 'visible' : 'hidden'}.`);
      await fetchWorkstations();
    }, 'Failed to toggle component visibility.');

  const handleMoveComp = (category: ComponentCategory, catIndex: number, direction: -1 | 1) => {
    if (!data) return;
    const categoryItems = data.components[category] ?? [];
    const nextIndex = catIndex + direction;
    if (nextIndex < 0 || nextIndex >= categoryItems.length) return;
    return runListAction(
      () =>
        applyReorder(
          'component',
          moveItem(categoryItems, catIndex, nextIndex).map((c) => c.id),
          'Component order updated.'
        ),
      'Failed to reorder components.'
    );
  };

  const handleDeleteComp = (cat: ComponentCategory, id: string) => {
    if (!confirm('Are you sure you want to remove this hardware option?')) return;
    return runListAction(async () => {
      await deleteWorkstationComponentAction(cat, id);
      showToast('Component removed.');
      await fetchWorkstations();
    }, DELETE_REFERENCED_ERROR);
  };

  // 3. Add-ons
  const handleOpenAddAddon = () => {
    setActionError(null);
    setAddonTarget({
      isNew: true,
      item: { id: `addon-${Date.now()}`, name: '', pricePerMonth: 0, description: '', isActive: true },
    });
  };

  const handleOpenEditAddon = (addon: WorkstationAddon) => {
    setActionError(null);
    setAddonTarget({ isNew: false, item: addon });
  };

  const handleToggleAddonActive = (addon: WorkstationAddon) =>
    runListAction(async () => {
      const nextActive = addon.isActive === false;
      await saveWorkstationAddonAction({ id: addon.id, isActive: nextActive });
      showToast(`Add-on "${addon.name}" is now ${nextActive ? 'visible' : 'hidden'}.`);
      await fetchWorkstations();
    }, 'Failed to toggle add-on visibility.');

  const handleMoveAddon = (index: number, direction: -1 | 1) => {
    if (!data) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= data.addons.length) return;
    return runListAction(
      () =>
        applyReorder(
          'addon',
          moveItem(data.addons, index, nextIndex).map((a) => a.id),
          'Add-on order updated.'
        ),
      'Failed to reorder add-ons.'
    );
  };

  const handleDeleteAddon = (id: string) => {
    if (!confirm('Are you sure you want to delete this accessory add-on?')) return;
    return runListAction(async () => {
      await deleteWorkstationAddonAction(id);
      showToast('Add-on removed.');
      await fetchWorkstations();
    }, DELETE_REFERENCED_ERROR);
  };

  // Flattened components list with category index/length for per-category reordering
  const allComponentsList = useMemo<ComponentListEntry[]>(() => {
    if (!data) return [];
    return COMPONENT_CATEGORIES.flatMap(({ key, label }) => {
      if (componentCategory !== 'all' && componentCategory !== key) return [];
      const items = data.components[key] ?? [];
      return items.map((item, idx) => ({
        category: key,
        categoryLabel: label,
        item,
        catIndex: idx,
        catLength: items.length,
      }));
    });
  }, [data, componentCategory]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="text-[var(--color-text-on-light)] font-medium">Content Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
            Workstation Hardware Catalog
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
            Configure monthly tier packages, individual ergonomic components, and productivity add-on accessories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href={activeTab === 'packages' ? '/workstations' : '/workstations/build'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            <span>View on Web</span>
          </Link>

          {activeTab === 'components' && (
            <button
              type="button"
              onClick={() => handleOpenAddComp('monitor')}
              data-testid="add-component-btn"
              className="flex min-h-10 items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Component</span>
            </button>
          )}

          {activeTab === 'addons' && (
            <button
              type="button"
              onClick={handleOpenAddAddon}
              data-testid="add-addon-btn"
              className="flex min-h-10 items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Accessory</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Action Error Banner (e.g., reservation reference delete guard) */}
      {actionError && (
        <div
          data-testid="workstation-action-error"
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="p-1 rounded hover:bg-red-100 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('packages')}
          data-testid="tab-packages"
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer',
            activeTab === 'packages'
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900',
          )}
        >
          <Package className="w-4 h-4" />
          <span>Packages ({data?.packages?.length ?? 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('components')}
          data-testid="tab-components"
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer',
            activeTab === 'components'
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900',
          )}
        >
          <Monitor className="w-4 h-4" />
          <span>Monitors &amp; Desks</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('addons')}
          data-testid="tab-addons"
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer',
            activeTab === 'addons'
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900',
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>Peripherals &amp; Add-ons ({data?.addons?.length ?? 0})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-neutral-400">Loading catalog...</div>
      ) : activeTab === 'packages' ? (
        <PackagesTable
          packages={data?.packages ?? []}
          onMove={handleMovePkg}
          onToggle={handleTogglePkgActive}
          onEdit={handleOpenEditPkg}
        />
      ) : activeTab === 'components' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'monitor', 'chair', 'desk', 'keyboardMouse'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setComponentCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer',
                  componentCategory === cat
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white border border-[var(--color-border-light)] text-neutral-600 hover:bg-neutral-50',
                )}
              >
                {cat === 'all'
                  ? 'All Components'
                  : cat === 'monitor'
                  ? 'Monitors'
                  : cat === 'chair'
                  ? 'Chairs'
                  : cat === 'desk'
                  ? 'Desks'
                  : 'Keyboards & Mice'}
              </button>
            ))}
          </div>

          <ComponentsTable
            entries={allComponentsList}
            onMove={handleMoveComp}
            onToggle={handleToggleCompActive}
            onEdit={handleOpenEditComp}
            onDelete={handleDeleteComp}
          />
        </div>
      ) : (
        <AddonsTable
          addons={data?.addons ?? []}
          onMove={handleMoveAddon}
          onToggle={handleToggleAddonActive}
          onEdit={handleOpenEditAddon}
          onDelete={handleDeleteAddon}
        />
      )}

      {pkgTarget && <PackageEditModal pkg={pkgTarget} onClose={closePkgModal} onSaved={handleModalSaved} />}
      {compTarget && (
        <ComponentEditModal target={compTarget} onClose={closeCompModal} onSaved={handleModalSaved} />
      )}
      {addonTarget && (
        <AddonEditModal target={addonTarget} onClose={closeAddonModal} onSaved={handleModalSaved} />
      )}
    </div>
  );
}
