import type {
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
  const idx = store.workstations.packages.findIndex((p) => p.id === pkg.id);
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
