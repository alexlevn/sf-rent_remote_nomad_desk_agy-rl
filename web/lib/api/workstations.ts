import { and, asc, eq, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  workstationAddons,
  workstationComponents,
  workstationPackages,
} from '@/lib/db/schema';
import type {
  WorkstationAddon,
  WorkstationComponentOption,
  WorkstationComponents,
  WorkstationData,
  WorkstationPackage,
} from '@/lib/types';
import {
  createWorkstationAddonSchema,
  createWorkstationComponentSchema,
  createWorkstationPackageSchema,
  updateWorkstationAddonSchema,
  updateWorkstationComponentSchema,
  updateWorkstationPackageSchema,
  workstationCategorySchema,
} from '@/lib/validations/workstation';

// Seeded package slugs map to short UI/E2E IDs ('comfort', 'pro') while DB uses serial PK + slug.
const SLUG_TO_PACKAGE_ID: Record<string, string> = {
  'comfort-base': 'comfort',
  'pro-upgrade': 'pro',
};

const PACKAGE_ID_TO_SLUG: Record<string, string> = {
  comfort: 'comfort-base',
  pro: 'pro-upgrade',
};

function resolvePackageSlug(idOrSlug: string): string {
  const normalized = idOrSlug.trim().toLowerCase();
  return PACKAGE_ID_TO_SLUG[normalized] ?? normalized;
}

function mapPackageRow(
  row: typeof workstationPackages.$inferSelect
): WorkstationPackage {
  return {
    id: SLUG_TO_PACKAGE_ID[row.slug] ?? row.slug,
    name: row.name,
    slug: row.slug,
    pricePerMonth: row.monthlyPriceEUR,
    isIncluded: row.isIncluded,
    description: row.description ?? '',
    features: Array.isArray(row.features) ? row.features : [],
  };
}

function mapComponentRow(
  row: typeof workstationComponents.$inferSelect
): WorkstationComponentOption {
  const firstOpt =
    Array.isArray(row.options) &&
    row.options.length > 0 &&
    typeof row.options[0] === 'object' &&
    row.options[0] !== null
      ? (row.options[0] as Record<string, unknown>)
      : null;

  const isIncluded =
    typeof firstOpt?.isIncluded === 'boolean'
      ? firstOpt.isIncluded
      : row.monthlyPriceEUR === 0;
  const description =
    typeof firstOpt?.description === 'string' ? firstOpt.description : '';

  return {
    id: row.componentId,
    name: row.name,
    pricePerMonth: row.monthlyPriceEUR,
    isIncluded,
    description,
  };
}

function mapAddonRow(
  row: typeof workstationAddons.$inferSelect
): WorkstationAddon {
  return {
    id: row.addonId,
    name: row.name,
    pricePerMonth: row.monthlyPriceEUR,
    description: row.description ?? '',
  };
}

function isWorkstationCategory(
  value: string
): value is keyof WorkstationComponents {
  return (
    value === 'desk' ||
    value === 'chair' ||
    value === 'monitor' ||
    value === 'keyboardMouse'
  );
}

/**
 * Returns available workstation packages, hardware components, and add-ons from PostgreSQL.
 */
export async function listWorkstations(): Promise<WorkstationData> {
  const [pkgRows, compRows, addonRows] = await Promise.all([
    db
      .select()
      .from(workstationPackages)
      .where(eq(workstationPackages.isActive, true))
      .orderBy(asc(workstationPackages.position), asc(workstationPackages.id)),
    db
      .select()
      .from(workstationComponents)
      .where(eq(workstationComponents.isActive, true))
      .orderBy(asc(workstationComponents.position), asc(workstationComponents.id)),
    db
      .select()
      .from(workstationAddons)
      .where(eq(workstationAddons.isActive, true))
      .orderBy(asc(workstationAddons.position), asc(workstationAddons.id)),
  ]);

  const components: WorkstationComponents = {
    desk: [],
    chair: [],
    monitor: [],
    keyboardMouse: [],
  };

  for (const row of compRows) {
    if (isWorkstationCategory(row.category)) {
      components[row.category].push(mapComponentRow(row));
    }
  }

  return {
    packages: pkgRows.map(mapPackageRow),
    components,
    addons: addonRows.map(mapAddonRow),
  };
}

/**
 * Retrieves a workstation package by slug or package ID alias ('comfort-base', 'pro-upgrade', 'pro').
 */
export async function getWorkstationPackageBySlug(
  slug: string
): Promise<WorkstationPackage | null> {
  if (!slug || typeof slug !== 'string') return null;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const resolvedSlug = resolvePackageSlug(normalized);

  const rows = await db
    .select()
    .from(workstationPackages)
    .where(
      and(
        eq(workstationPackages.isActive, true),
        or(
          eq(sql`lower(${workstationPackages.slug})`, normalized),
          eq(sql`lower(${workstationPackages.slug})`, resolvedSlug)
        )
      )
    )
    .limit(1);

  return rows.length > 0 ? mapPackageRow(rows[0]) : null;
}

/**
 * Updates an existing workstation package or inserts a new one (admin CMS).
 */
export async function saveWorkstationPackage(
  pkg: Partial<WorkstationPackage> & { id: string }
): Promise<WorkstationPackage> {
  const lookupSlugs = new Set<string>([
    pkg.id.trim().toLowerCase(),
    resolvePackageSlug(pkg.id),
  ]);
  if (pkg.slug) {
    lookupSlugs.add(pkg.slug.trim().toLowerCase());
  }

  const slugConditions = Array.from(lookupSlugs)
    .filter(Boolean)
    .map((candidate) => eq(sql`lower(${workstationPackages.slug})`, candidate));

  const existingRows =
    slugConditions.length > 0
      ? await db
          .select()
          .from(workstationPackages)
          .where(or(...slugConditions))
          .limit(1)
      : [];

  if (existingRows.length > 0) {
    const validated = updateWorkstationPackageSchema.parse(pkg);
    const existing = existingRows[0];

    const updateValues: Partial<typeof workstationPackages.$inferInsert> = {};
    if (validated.name !== undefined) updateValues.name = validated.name;
    if (validated.slug !== undefined) {
      updateValues.slug = validated.slug.toLowerCase();
    }
    if (validated.pricePerMonth !== undefined) {
      updateValues.monthlyPriceEUR = validated.pricePerMonth;
    }
    if (validated.isIncluded !== undefined) {
      updateValues.isIncluded = validated.isIncluded;
    }
    if (validated.description !== undefined) {
      updateValues.description = validated.description;
    }
    if (validated.features !== undefined) {
      updateValues.features = validated.features;
    }

    if (Object.keys(updateValues).length === 0) {
      return mapPackageRow(existing);
    }

    const updated = await db
      .update(workstationPackages)
      .set(updateValues)
      .where(eq(workstationPackages.id, existing.id))
      .returning();

    return mapPackageRow(updated[0]);
  }

  const validated = createWorkstationPackageSchema.parse(pkg);
  const maxPosResult = await db
    .select({ maxPos: sql<number>`coalesce(max(${workstationPackages.position}), 0)::int` })
    .from(workstationPackages);
  const nextPos = (maxPosResult[0]?.maxPos ?? 0) + 1;
  const slug = (validated.slug ?? validated.id).toLowerCase().replace(/\s+/g, '-');

  const inserted = await db
    .insert(workstationPackages)
    .values({
      slug,
      name: validated.name,
      description: validated.description,
      monthlyPriceEUR: validated.pricePerMonth,
      isIncluded: validated.isIncluded,
      features: validated.features,
      isActive: true,
      position: nextPos,
    })
    .returning();

  return mapPackageRow(inserted[0]);
}

/**
 * Updates or adds a workstation component option (desk, chair, monitor, keyboardMouse).
 */
export async function saveWorkstationComponent(
  category: keyof WorkstationComponents,
  component: Partial<WorkstationComponentOption> & { id: string }
): Promise<WorkstationComponentOption> {
  const validCategory = workstationCategorySchema.parse(category);

  const existingRows = await db
    .select()
    .from(workstationComponents)
    .where(eq(workstationComponents.componentId, component.id))
    .limit(1);

  if (existingRows.length > 0) {
    const validated = updateWorkstationComponentSchema.parse(component);
    const existing = existingRows[0];
    const currentMapped = mapComponentRow(existing);

    const merged: WorkstationComponentOption = {
      id: existing.componentId,
      name: validated.name ?? currentMapped.name,
      pricePerMonth: validated.pricePerMonth ?? currentMapped.pricePerMonth,
      isIncluded: validated.isIncluded ?? currentMapped.isIncluded,
      description: validated.description ?? currentMapped.description,
    };

    const updated = await db
      .update(workstationComponents)
      .set({
        name: merged.name,
        category: validCategory,
        monthlyPriceEUR: merged.pricePerMonth,
        options: [merged],
        isActive: true,
      })
      .where(eq(workstationComponents.id, existing.id))
      .returning();

    return mapComponentRow(updated[0]);
  }

  const validated = createWorkstationComponentSchema.parse(component);
  const maxPosResult = await db
    .select({ maxPos: sql<number>`coalesce(max(${workstationComponents.position}), 0)::int` })
    .from(workstationComponents);
  const nextPos = (maxPosResult[0]?.maxPos ?? 0) + 1;

  const newOption: WorkstationComponentOption = {
    id: validated.id,
    name: validated.name,
    pricePerMonth: validated.pricePerMonth,
    isIncluded: validated.isIncluded,
    description: validated.description,
  };

  const inserted = await db
    .insert(workstationComponents)
    .values({
      componentId: newOption.id,
      name: newOption.name,
      category: validCategory,
      monthlyPriceEUR: newOption.pricePerMonth,
      options: [newOption],
      isActive: true,
      position: nextPos,
    })
    .returning();

  return mapComponentRow(inserted[0]);
}

/**
 * Deletes a workstation component option by category and componentId.
 */
export async function deleteWorkstationComponent(
  category: keyof WorkstationComponents,
  id: string
): Promise<boolean> {
  const validCategory = workstationCategorySchema.parse(category);
  if (!id || typeof id !== 'string') return false;

  const deleted = await db
    .delete(workstationComponents)
    .where(
      and(
        eq(workstationComponents.category, validCategory),
        eq(workstationComponents.componentId, id)
      )
    )
    .returning({ id: workstationComponents.id });

  return deleted.length > 0;
}

/**
 * Updates or adds a workstation accessory add-on.
 */
export async function saveWorkstationAddon(
  addon: Partial<WorkstationAddon> & { id: string }
): Promise<WorkstationAddon> {
  const existingRows = await db
    .select()
    .from(workstationAddons)
    .where(eq(workstationAddons.addonId, addon.id))
    .limit(1);

  if (existingRows.length > 0) {
    const validated = updateWorkstationAddonSchema.parse(addon);
    const existing = existingRows[0];

    const updateValues: Partial<typeof workstationAddons.$inferInsert> = {};
    if (validated.name !== undefined) updateValues.name = validated.name;
    if (validated.pricePerMonth !== undefined) {
      updateValues.monthlyPriceEUR = validated.pricePerMonth;
    }
    if (validated.description !== undefined) {
      updateValues.description = validated.description;
    }

    if (Object.keys(updateValues).length === 0) {
      return mapAddonRow(existing);
    }

    const updated = await db
      .update(workstationAddons)
      .set(updateValues)
      .where(eq(workstationAddons.id, existing.id))
      .returning();

    return mapAddonRow(updated[0]);
  }

  const validated = createWorkstationAddonSchema.parse(addon);
  const maxPosResult = await db
    .select({ maxPos: sql<number>`coalesce(max(${workstationAddons.position}), 0)::int` })
    .from(workstationAddons);
  const nextPos = (maxPosResult[0]?.maxPos ?? 0) + 1;

  const inserted = await db
    .insert(workstationAddons)
    .values({
      addonId: validated.id,
      name: validated.name,
      category: 'addon',
      description: validated.description,
      monthlyPriceEUR: validated.pricePerMonth,
      isActive: true,
      position: nextPos,
    })
    .returning();

  return mapAddonRow(inserted[0]);
}

/**
 * Deletes a workstation accessory add-on by addonId.
 */
export async function deleteWorkstationAddon(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') return false;

  const deleted = await db
    .delete(workstationAddons)
    .where(eq(workstationAddons.addonId, id))
    .returning({ id: workstationAddons.id });

  return deleted.length > 0;
}
