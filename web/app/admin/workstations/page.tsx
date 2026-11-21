'use client';

import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
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
  fetchWorkstationsAction,
} from '@/app/admin/cms-actions';
import {
  Monitor,
  Package,
  Sliders,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function AdminWorkstationsPage() {
  const [data, setData] = useState<WorkstationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'packages' | 'components' | 'addons'>('packages');
  const [componentCategory, setComponentCategory] = useState<keyof WorkstationComponents | 'all'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<WorkstationPackage | null>(null);
  const [pkgPriceEUR, setPkgPriceEUR] = useState<number>(0);

  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Partial<WorkstationComponentOption> | null>(null);
  const [compCategory, setCompCategory] = useState<keyof WorkstationComponents>('monitor');
  const [compPriceEUR, setCompPriceEUR] = useState<number>(0);

  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Partial<WorkstationAddon> | null>(null);
  const [addonPriceEUR, setAddonPriceEUR] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isActionRunningRef = useRef(false);

  const fetchWorkstations = async () => {
    try {
      const wsData = await fetchWorkstationsAction();
      startTransition(() => {
        setData(wsData);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchWorkstations();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Edit Package Handler
  const handleOpenEditPkg = (pkg: WorkstationPackage) => {
    setEditingPkg({ ...pkg });
    setPkgPriceEUR(Math.round(pkg.pricePerMonth / 100));
    setFormError(null);
    setIsPkgModalOpen(true);
  };

  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg || isSubmitting || isActionRunningRef.current) return;

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const priceCents = Math.round(Number(pkgPriceEUR) * 100);
      await saveWorkstationPackageAction({
        id: editingPkg.id,
        name: editingPkg.name,
        pricePerMonth: priceCents,
        description: editingPkg.description,
        features: editingPkg.features,
      });

      showToast(`Workstation package "${editingPkg.name}" updated to €${pkgPriceEUR}/mo (AC-CMS-2)!`);
      setIsPkgModalOpen(false);
      setEditingPkg(null);
      await fetchWorkstations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update package');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // 2. Component Add/Edit Handlers
  const handleOpenAddComp = (cat: keyof WorkstationComponents = 'monitor') => {
    setCompCategory(cat);
    setEditingComp({
      id: `comp-${Date.now()}`,
      name: '',
      pricePerMonth: 0,
      isIncluded: false,
      description: '',
    });
    setCompPriceEUR(0);
    setFormError(null);
    setIsCompModalOpen(true);
  };

  const handleOpenEditComp = (cat: keyof WorkstationComponents, comp: WorkstationComponentOption) => {
    setCompCategory(cat);
    setEditingComp({ ...comp });
    setCompPriceEUR(Math.round(comp.pricePerMonth / 100));
    setFormError(null);
    setIsCompModalOpen(true);
  };

  const handleSaveComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp || !editingComp.name || isSubmitting || isActionRunningRef.current) return;

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const priceCents = Math.round(Number(compPriceEUR) * 100);
      await saveWorkstationComponentAction(compCategory, {
        id: editingComp.id || `comp-${Date.now()}`,
        name: editingComp.name,
        pricePerMonth: priceCents,
        isIncluded: editingComp.isIncluded ?? false,
        description: editingComp.description || '',
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

  const handleDeleteComp = async (cat: keyof WorkstationComponents, id: string) => {
    if (!confirm('Are you sure you want to remove this hardware option?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;

    try {
      await deleteWorkstationComponentAction(cat, id);
      showToast('Component removed.');
      await fetchWorkstations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete component');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  // 3. Addon Add/Edit Handlers
  const handleOpenAddAddon = () => {
    setEditingAddon({
      id: `addon-${Date.now()}`,
      name: '',
      pricePerMonth: 0,
      description: '',
    });
    setAddonPriceEUR(0);
    setFormError(null);
    setIsAddonModalOpen(true);
  };

  const handleOpenEditAddon = (addon: WorkstationAddon) => {
    setEditingAddon({ ...addon });
    setAddonPriceEUR(Math.round(addon.pricePerMonth / 100));
    setFormError(null);
    setIsAddonModalOpen(true);
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddon || !editingAddon.name || isSubmitting || isActionRunningRef.current) return;

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const priceCents = Math.round(Number(addonPriceEUR) * 100);
      await saveWorkstationAddonAction({
        id: editingAddon.id || `addon-${Date.now()}`,
        name: editingAddon.name,
        pricePerMonth: priceCents,
        description: editingAddon.description || '',
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

  const handleDeleteAddon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this accessory add-on?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;

    try {
      await deleteWorkstationAddonAction(id);
      showToast('Add-on removed.');
      await fetchWorkstations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete add-on');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  // Flattened components list with category tags
  const allComponentsList = useMemo(() => {
    if (!data) return [];
    const list: Array<{
      category: keyof WorkstationComponents;
      categoryLabel: string;
      item: WorkstationComponentOption;
    }> = [];

    const cats: Array<{ key: keyof WorkstationComponents; label: string }> = [
      { key: 'monitor', label: 'Monitors' },
      { key: 'chair', label: 'Ergonomic Chairs' },
      { key: 'desk', label: 'Work Desks' },
      { key: 'keyboardMouse', label: 'Keyboard & Mouse' },
    ];

    cats.forEach(({ key, label }) => {
      if (componentCategory === 'all' || componentCategory === key) {
        data.components[key]?.forEach((item) => {
          list.push({ category: key, categoryLabel: label, item });
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Accessory</span>
          </button>
        )}
      </div>

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
          <span>Packages ({data?.packages?.length || 2})</span>
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
          <span>Peripherals &amp; Add-ons ({data?.addons?.length || 5})</span>
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
                  <th className="py-3 px-4">Package Name</th>
                  <th className="py-3 px-4">Monthly Price (€)</th>
                  <th className="py-3 px-4">Hardware Included</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {data?.packages.map((pkg) => {
                  const priceEUR = Math.round(pkg.pricePerMonth / 100);
                  const isIncluded = pkg.isIncluded || priceEUR === 0;

                  return (
                    <tr
                      key={pkg.id}
                      data-testid={`package-row-${pkg.id}`}
                      className="hover:bg-neutral-50/50 transition-colors"
                    >
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
                        {isIncluded ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Default Standard
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            Active Upgrade
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPkg(pkg)}
                          data-testid={`edit-package-${pkg.id}`}
                          className="px-3 py-1.5 rounded-lg border border-[var(--color-border-light)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
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
          <div className="flex gap-2">
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
                    <th className="py-3 px-4">Component Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Monthly Price (€)</th>
                    <th className="py-3 px-4">Tier Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {allComponentsList.map(({ category, categoryLabel, item }) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50">
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
                        {item.isIncluded ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Base Included
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                            Paid Upgrade
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                              className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
                  <th className="py-3 px-4">Accessory Name</th>
                  <th className="py-3 px-4">Monthly Price (€)</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {data?.addons.map((addon) => (
                  <tr key={addon.id} className="hover:bg-neutral-50/50">
                    <td className="py-3.5 px-4 font-semibold text-[var(--color-text-on-light)]">
                      {addon.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[var(--color-brand)]">
                      +€{Math.round(addon.pricePerMonth / 100)} / mo
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">{addon.description}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
                          className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Edit Package (AC-CMS-2) */}
      {isPkgModalOpen && editingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[var(--color-border-light)] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-base font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                <Package className="w-5 h-5 text-[var(--color-brand)]" />
                <span>Edit Package: {editingPkg.name}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsPkgModalOpen(false)}
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
                <label className="block font-semibold text-neutral-700 mb-1">
                  Monthly Price (€ / month) — AC-CMS-2
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-500">€</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={pkgPriceEUR}
                    onChange={(e) => setPkgPriceEUR(Number(e.target.value))}
                    data-testid="pkg-price-input"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[var(--color-border-light)] font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
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
          <div className="bg-white rounded-2xl max-w-md w-full border border-[var(--color-border-light)] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
                {editingComp.name ? `Edit Component: ${editingComp.name}` : 'Add Hardware Component'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCompModalOpen(false)}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                <label className="block font-semibold text-neutral-700 mb-1">Monthly Upgrade Price (€/mo)</label>
                <input
                  type="number"
                  min={0}
                  value={compPriceEUR}
                  onChange={(e) => setCompPriceEUR(Number(e.target.value))}
                  placeholder="0 for included base hardware"
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
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
          <div className="bg-white rounded-2xl max-w-md w-full border border-[var(--color-border-light)] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
                {editingAddon.name ? `Edit Add-on: ${editingAddon.name}` : 'Add Accessory Add-on'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddonModalOpen(false)}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                <label className="block font-semibold text-neutral-700 mb-1">Monthly Add-on Price (€/mo)</label>
                <input
                  type="number"
                  min={0}
                  value={addonPriceEUR}
                  onChange={(e) => setAddonPriceEUR(Number(e.target.value))}
                  placeholder="e.g. 20"
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
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
