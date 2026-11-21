import type {
  WorkstationAddon,
  WorkstationComponentOption,
  WorkstationComponents,
  WorkstationData,
  WorkstationPackage,
} from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Returns available workstation packages, hardware components, and add-ons.
 */
export async function listWorkstations(): Promise<WorkstationData> {
  const store = getMockStore();
  return JSON.parse(JSON.stringify(store.workstations)) as WorkstationData;
}

/**
 * Retrieves a workstation package by slug ('comfort-base', 'pro-upgrade').
 */
export async function getWorkstationPackageBySlug(
  slug: string
): Promise<WorkstationPackage | null> {
  const store = getMockStore();
  const pkg = store.workstations.packages.find((p) => p.slug === slug || p.id === slug);
  return pkg ? { ...pkg } : null;
}

/**
 * Updates workstation package details (admin CMS).
 */
export async function saveWorkstationPackage(
  pkg: Partial<WorkstationPackage> & { id: string }
): Promise<WorkstationPackage> {
  const store = getMockStore();
  const idx = store.workstations.packages.findIndex(
    (p) => p.id === pkg.id || p.slug === pkg.id
  );
  if (idx === -1) {
    throw new Error(`Workstation package ${pkg.id} not found`);
  }

  const updated: WorkstationPackage = {
    ...store.workstations.packages[idx],
    ...pkg,
  };
  store.workstations.packages[idx] = updated;
  return { ...updated };
}

/**
 * Updates or adds a workstation component option (desk, chair, monitor, keyboardMouse).
 */
export async function saveWorkstationComponent(
  category: keyof WorkstationComponents,
  component: Partial<WorkstationComponentOption> & { id: string }
): Promise<WorkstationComponentOption> {
  const store = getMockStore();
  const list = store.workstations.components[category];
  const idx = list.findIndex((c) => c.id === component.id);

  if (idx !== -1) {
    list[idx] = { ...list[idx], ...component };
    return { ...list[idx] };
  }

  const newComp: WorkstationComponentOption = {
    id: component.id,
    name: component.name || 'New Component',
    pricePerMonth: component.pricePerMonth || 0,
    isIncluded: component.isIncluded ?? false,
    description: component.description || '',
  };
  list.push(newComp);
  return { ...newComp };
}

/**
 * Deletes or hides a workstation component option.
 */
export async function deleteWorkstationComponent(
  category: keyof WorkstationComponents,
  id: string
): Promise<boolean> {
  const store = getMockStore();
  const list = store.workstations.components[category];
  const idx = list.findIndex((c) => c.id === id);
  if (idx !== -1) {
    list.splice(idx, 1);
    return true;
  }
  return false;
}

/**
 * Updates or adds a workstation accessory add-on.
 */
export async function saveWorkstationAddon(
  addon: Partial<WorkstationAddon> & { id: string }
): Promise<WorkstationAddon> {
  const store = getMockStore();
  const idx = store.workstations.addons.findIndex((a) => a.id === addon.id);

  if (idx !== -1) {
    store.workstations.addons[idx] = { ...store.workstations.addons[idx], ...addon };
    return { ...store.workstations.addons[idx] };
  }

  const newAddon: WorkstationAddon = {
    id: addon.id,
    name: addon.name || 'New Add-on',
    pricePerMonth: addon.pricePerMonth || 0,
    description: addon.description || '',
  };
  store.workstations.addons.push(newAddon);
  return { ...newAddon };
}

/**
 * Deletes a workstation accessory add-on.
 */
export async function deleteWorkstationAddon(id: string): Promise<boolean> {
  const store = getMockStore();
  const idx = store.workstations.addons.findIndex((a) => a.id === id);
  if (idx !== -1) {
    store.workstations.addons.splice(idx, 1);
    return true;
  }
  return false;
}
