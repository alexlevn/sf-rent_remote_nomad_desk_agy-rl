'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import type {
  WorkstationData,
  WorkstationPackage,
  WorkstationComponentOption,
  WorkstationAddon,
  WorkstationComponents,
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
import { CurrencyInput } from '@/features/media/currency-input';
import {
  Monitor,
  Package,
  Sliders,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const MAX_FEATURE_LENGTH = 80;
const MAX_FEATURES_COUNT = 12;

export default function AdminWorkstationsPage() {
  const [data, setData] = useState<WorkstationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'packages' | 'components' | 'addons'>('packages');
  const [componentCategory, setComponentCategory] = useState<keyof WorkstationComponents | 'all'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal states
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<WorkstationPackage | null>(null);
  const [pkgPriceEUR, setPkgPriceEUR] = useState<number | ''>(0);
  const [featureDraft, setFeatureDraft] = useState('');
  const [featureError, setFeatureError] = useState<string | null>(null);

  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Partial<WorkstationComponentOption> | null>(null);
  const [compCategory, setCompCategory] = useState<keyof WorkstationComponents>('monitor');
  const [compPriceEUR, setCompPriceEUR] = useState<number | ''>(0);

  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Partial<WorkstationAddon> | null>(null);
  const [addonPriceEUR, setAddonPriceEUR] = useState<number | ''>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
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

  // Close active modal on Escape key
  useEffect(() => {
    if (!isPkgModalOpen && !isCompModalOpen && !isAddonModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPkgModalOpen(false);
        setIsCompModalOpen(false);
        setIsAddonModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPkgModalOpen, isCompModalOpen, isAddonModalOpen]);

  // 1. Package Handlers
  const handleOpenEditPkg = (pkg: WorkstationPackage) => {
    setEditingPkg({ ...pkg, features: [...(pkg.features ?? [])] });
    setPkgPriceEUR(Math.round(pkg.pricePerMonth / 100));
    setFeatureDraft('');
    setFeatureError(null);
    setFormError(null);
    setActionError(null);
    setIsPkgModalOpen(true);
  };

  const handleAddFeature = () => {
    const trimmed = featureDraft.trim();
    if (!trimmed || !editingPkg) return;

    if (trimmed.length > MAX_FEATURE_LENGTH) {
      setFeatureError(`Each feature must be ${MAX_FEATURE_LENGTH} characters or fewer.`);
      return;
    }

    const currentFeatures = editingPkg.features ?? [];
    if (currentFeatures.length >= MAX_FEATURES_COUNT) {
      setFeatureError(`You can add up to ${MAX_FEATURES_COUNT} features per package.`);
      return;
    }

    const isDuplicate = currentFeatures.some(
      (item) => item.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setFeatureError('This feature is already listed.');
      return;
    }

    setEditingPkg((prev) =>
      prev ? { ...prev, features: [...(prev.features ?? []), trimmed] } : null
    );
    setFeatureDraft('');
    setFeatureError(null);
  };

  const handleFeatureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Prevent Enter in chip input from submitting the package form prematurely
      e.preventDefault();
      handleAddFeature();
    }
  };

  const handleRemoveFeature = (index: number) => {
    setEditingPkg((prev) =>
      prev
        ? { ...prev, features: (prev.features ?? []).filter((_, idx) => idx !== index) }
        : null
    );
    setFeatureError(null);
  };

  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg || isSubmitting || isActionRunningRef.current) return;

    if (pkgPriceEUR === '' || !Number.isFinite(pkgPriceEUR) || pkgPriceEUR < 0) {
      setFormError('Please enter a valid monthly price in EUR.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const priceCents = Math.round(pkgPriceEUR * 100);
      await saveWorkstationPackageAction({
        id: editingPkg.id,
        name: editingPkg.name,
        pricePerMonth: priceCents,
        description: editingPkg.description,
        features: editingPkg.features ?? [],
        isActive: editingPkg.isActive !== false,
      });

      showToast(`Workstation package "${editingPkg.name}" updated to €${pkgPriceEUR}/mo (AC-CMS-2)!`);
      setIsPkgModalOpen(false);
      setEditingPkg(null);
      setFeatureDraft('');
      setFeatureError(null);
      await fetchWorkstations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update package');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const handleTogglePkgActive = async (pkg: WorkstationPackage) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      const nextActive = pkg.isActive === false;
      await saveWorkstationPackageAction({ id: pkg.id, isActive: nextActive });
      showToast(`Package "${pkg.name}" is now ${nextActive ? 'visible' : 'hidden'}.`);
      await fetchWorkstations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle package visibility.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleMovePkg = async (index: number, direction: -1 | 1) => {
    if (!data || isActionRunningRef.current) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= data.packages.length) return;

    isActionRunningRef.current = true;
    setActionError(null);

    try {
      const ordered = [...data.packages];
      const [moved] = ordered.splice(index, 1);
      ordered.splice(nextIndex, 0, moved);
      const res = await reorderWorkstationItemsAction(
        'package',
        ordered.map((p) => p.id)
      );
      startTransition(() => {
        setData(res.workstations);
      });
      showToast('Package order updated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reorder packages.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  // 2. Component Add/Edit/Toggle/Reorder/Delete Handlers
  const handleOpenAddComp = (cat: keyof WorkstationComponents = 'monitor') => {
    setCompCategory(cat);
    setEditingComp({
      id: `comp-${Date.now()}`,
      name: '',
      pricePerMonth: 0,
      isIncluded: false,
      description: '',
      isActive: true,
    });
    setCompPriceEUR(0);
    setFormError(null);
    setActionError(null);
    setIsCompModalOpen(true);
  };

  const handleOpenEditComp = (cat: keyof WorkstationComponents, comp: WorkstationComponentOption) => {
    setCompCategory(cat);
    setEditingComp({ ...comp });
    setCompPriceEUR(Math.round(comp.pricePerMonth / 100));
    setFormError(null);
    setActionError(null);
    setIsCompModalOpen(true);
  };

  const handleSaveComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp || !editingComp.name || isSubmitting || isActionRunningRef.current) return;

    if (compPriceEUR === '' || !Number.isFinite(compPriceEUR) || compPriceEUR < 0) {
      setFormError('Please enter a valid monthly upgrade price in EUR (0 for included).');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const priceCents = Math.round(compPriceEUR * 100);
      await saveWorkstationComponentAction(compCategory, {
        id: editingComp.id || `comp-${Date.now()}`,
        name: editingComp.name,
        pricePerMonth: priceCents,
        isIncluded: editingComp.isIncluded ?? false,
        description: editingComp.description || '',
        isActive: editingComp.isActive !== false,
      });

      showToast(`Component "${editingComp.name}" saved successfully.`);
      setIsCompModalOpen(false);
      setEditingComp(null);
      await fetchWorkstations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save component');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const handleToggleCompActive = async (
    category: keyof WorkstationComponents,
    item: WorkstationComponentOption
  ) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      const nextActive = item.isActive === false;
      await saveWorkstationComponentAction(category, { id: item.id, isActive: nextActive });
      showToast(`Component "${item.name}" is now ${nextActive ? 'visible' : 'hidden'}.`);
      await fetchWorkstations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle component visibility.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleMoveComp = async (
    category: keyof WorkstationComponents,
    catIndex: number,
    direction: -1 | 1
  ) => {
    if (!data || isActionRunningRef.current) return;
    const categoryItems = data.components[category] ?? [];
    const nextIndex = catIndex + direction;
    if (nextIndex < 0 || nextIndex >= categoryItems.length) return;

    isActionRunningRef.current = true;
    setActionError(null);

    try {
      const ordered = [...categoryItems];
      const [moved] = ordered.splice(catIndex, 1);
      ordered.splice(nextIndex, 0, moved);
      const res = await reorderWorkstationItemsAction(
        'component',
        ordered.map((c) => c.id)
      );
      startTransition(() => {
        setData(res.workstations);
      });
      showToast('Component order updated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reorder components.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleDeleteComp = async (cat: keyof WorkstationComponents, id: string) => {
    if (!confirm('Are you sure you want to remove this hardware option?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      await deleteWorkstationComponentAction(cat, id);
      showToast('Component removed.');
      await fetchWorkstations();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Cannot delete workstation option referenced by existing reservations. Hide it instead.'
      );
    } finally {
      isActionRunningRef.current = false;
    }
  };

  // 3. Addon Add/Edit/Toggle/Reorder/Delete Handlers
  const handleOpenAddAddon = () => {
    setEditingAddon({
      id: `addon-${Date.now()}`,
      name: '',
      pricePerMonth: 0,
      description: '',
      isActive: true,
    });
    setAddonPriceEUR(0);
    setFormError(null);
    setActionError(null);
    setIsAddonModalOpen(true);
  };

  const handleOpenEditAddon = (addon: WorkstationAddon) => {
    setEditingAddon({ ...addon });
    setAddonPriceEUR(Math.round(addon.pricePerMonth / 100));
    setFormError(null);
    setActionError(null);
    setIsAddonModalOpen(true);
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddon || !editingAddon.name || isSubmitting || isActionRunningRef.current) return;

    if (addonPriceEUR === '' || !Number.isFinite(addonPriceEUR) || addonPriceEUR < 0) {
      setFormError('Please enter a valid monthly add-on price in EUR.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const priceCents = Math.round(addonPriceEUR * 100);
      await saveWorkstationAddonAction({
        id: editingAddon.id || `addon-${Date.now()}`,
        name: editingAddon.name,
        pricePerMonth: priceCents,
        description: editingAddon.description || '',
        isActive: editingAddon.isActive !== false,
      });

      showToast(`Add-on "${editingAddon.name}" saved successfully.`);
      setIsAddonModalOpen(false);
      setEditingAddon(null);
      await fetchWorkstations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save add-on');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const handleToggleAddonActive = async (addon: WorkstationAddon) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      const nextActive = addon.isActive === false;
      await saveWorkstationAddonAction({ id: addon.id, isActive: nextActive });
      showToast(`Add-on "${addon.name}" is now ${nextActive ? 'visible' : 'hidden'}.`);
      await fetchWorkstations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle add-on visibility.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleMoveAddon = async (index: number, direction: -1 | 1) => {
    if (!data || isActionRunningRef.current) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= data.addons.length) return;

    isActionRunningRef.current = true;
    setActionError(null);

    try {
      const ordered = [...data.addons];
      const [moved] = ordered.splice(index, 1);
      ordered.splice(nextIndex, 0, moved);
      const res = await reorderWorkstationItemsAction(
        'addon',
        ordered.map((a) => a.id)
      );
      startTransition(() => {
        setData(res.workstations);
      });
      showToast('Add-on order updated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reorder add-ons.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleDeleteAddon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this accessory add-on?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      await deleteWorkstationAddonAction(id);
      showToast('Add-on removed.');
      await fetchWorkstations();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Cannot delete workstation option referenced by existing reservations. Hide it instead.'
      );
    } finally {
      isActionRunningRef.current = false;
    }
  };

  // Flattened components list with category index/length for per-category reordering
  const allComponentsList = useMemo(() => {
    if (!data) return [];
    const list: Array<{
      category: keyof WorkstationComponents;
      categoryLabel: string;
      item: WorkstationComponentOption;
      catIndex: number;
      catLength: number;
    }> = [];

    const cats: Array<{ key: keyof WorkstationComponents; label: string }> = [
      { key: 'monitor', label: 'Monitors' },
      { key: 'chair', label: 'Ergonomic Chairs' },
      { key: 'desk', label: 'Work Desks' },
      { key: 'keyboardMouse', label: 'Keyboard & Mouse' },
    ];

    cats.forEach(({ key, label }) => {
      if (componentCategory === 'all' || componentCategory === key) {
        const items = data.components[key] ?? [];
        items.forEach((item, idx) => {
          list.push({
            category: key,
            categoryLabel: label,
            item,
            catIndex: idx,
            catLength: items.length,
          });
        });
      }
    });

    return list;
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

        {activeTab === 'components' && (
          <button
            type="button"
            onClick={() => handleOpenAddComp('monitor')}
            data-testid="add-component-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Accessory</span>
          </button>
        )}
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'packages'
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Packages ({data?.packages?.length ?? 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('components')}
          data-testid="tab-components"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'components'
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Monitors &amp; Desks</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('addons')}
          data-testid="tab-addons"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'addons'
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Peripherals &amp; Add-ons ({data?.addons?.length ?? 0})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-neutral-400">Loading catalog...</div>
      ) : activeTab === 'packages' ? (
        /* Tab 1: Packages Table */
        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Package Name</th>
                  <th className="py-3 px-4">Monthly Price (€)</th>
                  <th className="py-3 px-4">Hardware Included</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {data?.packages.map((pkg, idx) => {
                  const priceEUR = Math.round(pkg.pricePerMonth / 100);
                  const isIncluded = pkg.isIncluded || priceEUR === 0;
                  const isHidden = pkg.isActive === false;

                  return (
                    <tr
                      key={pkg.id}
                      data-testid={`package-row-${pkg.id}`}
                      className={`hover:bg-neutral-50/50 transition-colors ${
                        isHidden ? 'opacity-60 bg-neutral-50/30' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMovePkg(idx, -1)}
                            disabled={idx === 0}
                            title="Move up"
                            aria-label={`Move ${pkg.name} up`}
                            data-testid={`move-up-pkg-${pkg.id}`}
                            className="p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePkg(idx, 1)}
                            disabled={idx === data.packages.length - 1}
                            title="Move down"
                            aria-label={`Move ${pkg.name} down`}
                            data-testid={`move-down-pkg-${pkg.id}`}
                            className="p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-[var(--color-text-on-light)] text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[var(--color-brand)]" />
                          <span>{pkg.name}</span>
                        </div>
                        <span className="text-[11px] font-normal text-neutral-400 block mt-0.5">
                          {pkg.description}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          data-testid={`price-display-${pkg.id}`}
                          className="font-bold text-sm text-[var(--color-brand)]"
                        >
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
                          <button
                            type="button"
                            onClick={() => handleTogglePkgActive(pkg)}
                            title={isHidden ? 'Show package' : 'Hide package'}
                            aria-label={isHidden ? `Show ${pkg.name}` : `Hide ${pkg.name}`}
                            data-testid={`toggle-pkg-${pkg.id}`}
                            className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditPkg(pkg)}
                            data-testid={`edit-package-${pkg.id}`}
                            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-light)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'components' ? (
        /* Tab 2: Components Table */
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'monitor', 'chair', 'desk', 'keyboardMouse'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setComponentCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  componentCategory === cat
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white border border-[var(--color-border-light)] text-neutral-600 hover:bg-neutral-50'
                }`}
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

          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Component Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Monthly Price (€)</th>
                    <th className="py-3 px-4">Status / Tier</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {allComponentsList.map(({ category, categoryLabel, item, catIndex, catLength }) => {
                    const isHidden = item.isActive === false;
                    return (
                      <tr
                        key={item.id}
                        data-testid={`component-row-${item.id}`}
                        className={`hover:bg-neutral-50/50 transition-colors ${
                          isHidden ? 'opacity-60 bg-neutral-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveComp(category, catIndex, -1)}
                              disabled={catIndex === 0}
                              title="Move up within category"
                              aria-label={`Move ${item.name} up`}
                              data-testid={`move-up-comp-${item.id}`}
                              className="p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveComp(category, catIndex, 1)}
                              disabled={catIndex === catLength - 1}
                              title="Move down within category"
                              aria-label={`Move ${item.name} down`}
                              data-testid={`move-down-comp-${item.id}`}
                              className="p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--color-text-on-light)]">
                          {item.name}
                          <span className="text-[10px] text-neutral-400 block font-normal">
                            {item.description}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-600">{categoryLabel}</td>
                        <td className="py-3 px-4 font-semibold text-[var(--color-brand)]">
                          {item.pricePerMonth === 0
                            ? '€0 (Included)'
                            : `+€${Math.round(item.pricePerMonth / 100)} / mo`}
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
                            <button
                              type="button"
                              onClick={() => handleToggleCompActive(category, item)}
                              title={isHidden ? 'Show component' : 'Hide component'}
                              aria-label={isHidden ? `Show ${item.name}` : `Hide ${item.name}`}
                              data-testid={`toggle-comp-${item.id}`}
                              className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                            >
                              {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditComp(category, item)}
                              className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-100 text-xs cursor-pointer"
                            >
                              Edit
                            </button>
                            {!item.isIncluded && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComp(category, item.id)}
                                data-testid={`delete-comp-${item.id}`}
                                aria-label={`Delete ${item.name}`}
                                className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 3: Peripherals & Add-ons Table */
        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Accessory Name</th>
                  <th className="py-3 px-4">Monthly Price (€)</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {data?.addons.map((addon, idx) => {
                  const isHidden = addon.isActive === false;
                  return (
                    <tr
                      key={addon.id}
                      data-testid={`addon-row-${addon.id}`}
                      className={`hover:bg-neutral-50/50 transition-colors ${
                        isHidden ? 'opacity-60 bg-neutral-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveAddon(idx, -1)}
                            disabled={idx === 0}
                            title="Move up"
                            aria-label={`Move ${addon.name} up`}
                            data-testid={`move-up-addon-${addon.id}`}
                            className="p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveAddon(idx, 1)}
                            disabled={idx === data.addons.length - 1}
                            title="Move down"
                            aria-label={`Move ${addon.name} down`}
                            data-testid={`move-down-addon-${addon.id}`}
                            className="p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[var(--color-text-on-light)]">
                        {addon.name}
                      </td>
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
                          <button
                            type="button"
                            onClick={() => handleToggleAddonActive(addon)}
                            title={isHidden ? 'Show add-on' : 'Hide add-on'}
                            aria-label={isHidden ? `Show ${addon.name}` : `Hide ${addon.name}`}
                            data-testid={`toggle-addon-${addon.id}`}
                            className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditAddon(addon)}
                            className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-100 text-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddon(addon.id)}
                            data-testid={`delete-addon-${addon.id}`}
                            aria-label={`Delete ${addon.name}`}
                            className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Edit Package (AC-CMS-2) */}
      {isPkgModalOpen && editingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-base font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                <Package className="w-5 h-5 text-[var(--color-brand)]" />
                <span>Edit Package: {editingPkg.name}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsPkgModalOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePkg} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  value={editingPkg.name}
                  onChange={(e) => setEditingPkg((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div>
                <label
                  htmlFor="pkg-price-input"
                  className="block font-semibold text-neutral-700 mb-1"
                >
                  Monthly Price (€ / month) — AC-CMS-2
                </label>
                <CurrencyInput
                  id="pkg-price-input"
                  value={pkgPriceEUR}
                  onChange={setPkgPriceEUR}
                  currencySymbol="€"
                  suffix="/ mo"
                  min={0}
                  required
                  testId="pkg-price-input"
                  ariaInvalid={pkgPriceEUR === '' && formError !== null}
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Changes update /workstations, Builder, and widget immediately. Existing bookings retain their original rate.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingPkg.description}
                  onChange={(e) => setEditingPkg((prev) => (prev ? { ...prev, description: e.target.value } : null))}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="pkg-feature-input"
                    className="block font-semibold text-neutral-700"
                  >
                    Included Features
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {(editingPkg.features ?? []).length}/{MAX_FEATURES_COUNT}
                  </span>
                </div>

                {(editingPkg.features ?? []).length > 0 && (
                  <div
                    data-testid="pkg-features-list"
                    className="flex flex-wrap gap-1.5 mb-2 p-2.5 rounded-xl border border-[var(--color-border-light)] bg-neutral-50/70"
                  >
                    {(editingPkg.features ?? []).map((feat, idx) => (
                      <span
                        key={`${feat}-${idx}`}
                        data-testid={`pkg-feature-chip-${idx}`}
                        className="inline-flex items-center gap-1.5 max-w-full rounded-full border border-[var(--color-border-light)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-text-on-light)] shadow-2xs"
                      >
                        <span className="truncate">{feat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          aria-label={`Remove feature ${feat}`}
                          data-testid={`pkg-feature-remove-${idx}`}
                          className="inline-flex items-center justify-center rounded-full p-0.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    id="pkg-feature-input"
                    type="text"
                    value={featureDraft}
                    onChange={(e) => {
                      setFeatureDraft(e.target.value);
                      if (featureError) setFeatureError(null);
                    }}
                    onKeyDown={handleFeatureKeyDown}
                    placeholder="Type a feature and press Enter..."
                    data-testid="pkg-feature-input"
                    aria-invalid={featureError ? true : undefined}
                    className="flex-1 min-w-0 min-h-10 px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-xs text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    disabled={!featureDraft.trim()}
                    data-testid="pkg-feature-add-btn"
                    className="inline-flex items-center gap-1 min-h-10 px-3.5 py-2 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light-alt)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {featureError ? (
                  <p
                    role="alert"
                    data-testid="pkg-feature-error"
                    className="text-[11px] text-red-600 mt-1"
                  >
                    {featureError}
                  </p>
                ) : (
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Press Enter or click Add to include a feature (max {MAX_FEATURE_LENGTH} chars, up to {MAX_FEATURES_COUNT} items).
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPkg.isActive !== false}
                  onChange={(e) =>
                    setEditingPkg((prev) => (prev ? { ...prev, isActive: e.target.checked } : null))
                  }
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                />
                <span className="font-semibold text-neutral-700">Visible on public pages</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-light)]">
                <button
                  type="button"
                  onClick={() => setIsPkgModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border-light)] text-neutral-700 text-xs font-medium hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="save-pkg-btn"
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Component */}
      {isCompModalOpen && editingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
                {editingComp.name ? `Edit Component: ${editingComp.name}` : 'Add Hardware Component'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCompModalOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveComp} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Hardware Category</label>
                <select
                  value={compCategory}
                  onChange={(e) => setCompCategory(e.target.value as keyof WorkstationComponents)}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                >
                  <option value="monitor">Monitor Display</option>
                  <option value="chair">Ergonomic Chair</option>
                  <option value="desk">Work Desk</option>
                  <option value="keyboardMouse">Keyboard &amp; Mouse</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Component Name</label>
                <input
                  type="text"
                  required
                  value={editingComp.name || ''}
                  onChange={(e) => setEditingComp((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. 4K Curved Ultrawide Display"
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div>
                <label
                  htmlFor="comp-price-input"
                  className="block font-semibold text-neutral-700 mb-1"
                >
                  Monthly Upgrade Price (€/mo)
                </label>
                <CurrencyInput
                  id="comp-price-input"
                  value={compPriceEUR}
                  onChange={setCompPriceEUR}
                  currencySymbol="€"
                  suffix="/ mo"
                  placeholder="0 for included base hardware"
                  min={0}
                  required
                  testId="comp-price-input"
                  ariaInvalid={compPriceEUR === '' && formError !== null}
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingComp.description || ''}
                  onChange={(e) => setEditingComp((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingComp.isActive !== false}
                  onChange={(e) =>
                    setEditingComp((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                />
                <span className="font-semibold text-neutral-700">Visible on public pages</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-light)]">
                <button
                  type="button"
                  onClick={() => setIsCompModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border-light)] text-neutral-700 text-xs font-medium hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Addon */}
      {isAddonModalOpen && editingAddon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
                {editingAddon.name ? `Edit Add-on: ${editingAddon.name}` : 'Add Accessory Add-on'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddonModalOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddon} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Accessory Name</label>
                <input
                  type="text"
                  required
                  value={editingAddon.name || ''}
                  onChange={(e) => setEditingAddon((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Studio Microphone"
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div>
                <label
                  htmlFor="addon-price-input"
                  className="block font-semibold text-neutral-700 mb-1"
                >
                  Monthly Add-on Price (€/mo)
                </label>
                <CurrencyInput
                  id="addon-price-input"
                  value={addonPriceEUR}
                  onChange={setAddonPriceEUR}
                  currencySymbol="€"
                  suffix="/ mo"
                  placeholder="20"
                  min={0}
                  required
                  testId="addon-price-input"
                  ariaInvalid={addonPriceEUR === '' && formError !== null}
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingAddon.description || ''}
                  onChange={(e) => setEditingAddon((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingAddon.isActive !== false}
                  onChange={(e) =>
                    setEditingAddon((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                />
                <span className="font-semibold text-neutral-700">Visible on public pages</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-light)]">
                <button
                  type="button"
                  onClick={() => setIsAddonModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border-light)] text-neutral-700 text-xs font-medium hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Accessory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
