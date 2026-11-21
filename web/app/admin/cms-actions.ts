'use server';

import { revalidatePath } from 'next/cache';
import { AuthError, requireAdmin } from '@/lib/auth/guards';
import { sanitizeHtml } from '@/lib/validations/content';
import {
  saveLocation,
  deleteLocation,
  reorderTopCities,
  listLocations,
} from '@/lib/api/locations';
import {
  saveWorkstationPackage,
  saveWorkstationComponent,
  deleteWorkstationComponent,
  saveWorkstationAddon,
  deleteWorkstationAddon,
  reorderWorkstationItems,
  listWorkstations,
} from '@/lib/api/workstations';
import { saveTravelGuide, deleteTravelGuide, listTravelGuides } from '@/lib/api/guides';
import { saveBlogPost, deleteBlogPost, listBlogPosts } from '@/lib/api/blog';
import { saveVideo, deleteVideo, reorderVideos, listVideos } from '@/lib/api/videos';
import { reorderFeaturedProperties } from '@/lib/api/properties';
import { getExchangeRates, updateExchangeRates } from '@/lib/api/rates';
import type {
  Location,
  WorkstationPackage,
  WorkstationComponentOption,
  WorkstationComponents,
  WorkstationAddon,
  TravelGuide,
  BlogPost,
  CommunityVideo,
  ExchangeRates,
} from '@/lib/types';

/**
 * Strips dangerous executable script tags and event handlers (AC-CMS-8).
 */
export async function sanitizeHtmlContent(html: string): Promise<string> {
  return sanitizeHtml(html);
}

/**
 * Asserts admin role directly against PostgreSQL (Risk #10).
 * Throws 403 error if unauthenticated, guest, or host calls CMS action (AC-CMS-8).
 */
async function assertAdminRole() {
  try {
    return await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      const error = new Error('Forbidden: Admin role required.');
      // Normalize to 403 for CMS HTTP handlers / test assertions
      (error as unknown as { status: number; statusCode: number }).status = 403;
      (error as unknown as { status: number; statusCode: number }).statusCode = 403;
      throw error;
    }
    throw err;
  }
}

// ==========================================
// Locations CMS Actions (AC-CMS-1)
// ==========================================

export async function saveLocationAction(data: Partial<Location>) {
  await assertAdminRole();
  const location = await saveLocation(data);
  revalidatePath('/');
  revalidatePath('/a/furnished-apartments');
  revalidatePath('/admin/locations');
  revalidatePath('/host/listings/new');
  return { success: true, location };
}

export async function deleteLocationAction(id: number) {
  await assertAdminRole();
  const deleted = await deleteLocation(id);
  revalidatePath('/');
  revalidatePath('/a/furnished-apartments');
  revalidatePath('/admin/locations');
  return { success: deleted };
}

export async function reorderTopCitiesAction(orderedIds: number[]) {
  await assertAdminRole();
  const updated = await reorderTopCities(orderedIds);
  revalidatePath('/');
  revalidatePath('/admin/locations');
  return { success: true, locations: updated };
}

// ==========================================
// Workstations CMS Actions (AC-CMS-2)
// ==========================================

export async function saveWorkstationPackageAction(
  pkg: Partial<WorkstationPackage> & { id: string }
) {
  await assertAdminRole();
  const updated = await saveWorkstationPackage(pkg);
  revalidatePath('/workstations');
  revalidatePath('/workstations/build');
  revalidatePath('/admin/workstations');
  revalidatePath('/l/apartments/[slug]', 'page');
  return { success: true, package: updated };
}

export async function saveWorkstationComponentAction(
  category: keyof WorkstationComponents,
  component: Partial<WorkstationComponentOption> & { id: string }
) {
  await assertAdminRole();
  const updated = await saveWorkstationComponent(category, component);
  revalidatePath('/workstations');
  revalidatePath('/workstations/build');
  revalidatePath('/admin/workstations');
  return { success: true, component: updated };
}

export async function deleteWorkstationComponentAction(
  category: keyof WorkstationComponents,
  id: string
) {
  await assertAdminRole();
  const deleted = await deleteWorkstationComponent(category, id);
  revalidatePath('/workstations');
  revalidatePath('/workstations/build');
  revalidatePath('/admin/workstations');
  return { success: deleted };
}

export async function saveWorkstationAddonAction(
  addon: Partial<WorkstationAddon> & { id: string }
) {
  await assertAdminRole();
  const updated = await saveWorkstationAddon(addon);
  revalidatePath('/workstations');
  revalidatePath('/workstations/build');
  revalidatePath('/admin/workstations');
  return { success: true, addon: updated };
}

export async function deleteWorkstationAddonAction(id: string) {
  await assertAdminRole();
  const deleted = await deleteWorkstationAddon(id);
  revalidatePath('/workstations');
  revalidatePath('/workstations/build');
  revalidatePath('/admin/workstations');
  return { success: deleted };
}

export async function reorderWorkstationItemsAction(
  type: 'package' | 'component' | 'addon',
  orderedIds: string[]
) {
  await assertAdminRole();
  const workstations = await reorderWorkstationItems(type, orderedIds);
  revalidatePath('/workstations');
  revalidatePath('/workstations/build');
  revalidatePath('/admin/workstations');
  return { success: true, workstations };
}

// ==========================================
// Travel Guides CMS Actions (AC-CMS-3)
// ==========================================

export async function saveTravelGuideAction(data: Partial<TravelGuide>) {
  await assertAdminRole();
  // Sanitize content against XSS scripts / onerror without wiping content on partial updates
  const payload: Partial<TravelGuide> = { ...data };
  if (data.content !== undefined) {
    payload.content = await sanitizeHtmlContent(data.content);
  }

  const guide = await saveTravelGuide(payload);

  revalidatePath('/');
  revalidatePath('/travel-guide');
  revalidatePath('/admin/guides');
  return { success: true, guide };
}

export async function deleteTravelGuideAction(id: number) {
  await assertAdminRole();
  const deleted = await deleteTravelGuide(id);
  revalidatePath('/');
  revalidatePath('/travel-guide');
  revalidatePath('/admin/guides');
  return { success: deleted };
}

// ==========================================
// Blog Posts CMS Actions
// ==========================================

export async function saveBlogPostAction(data: Partial<BlogPost>) {
  await assertAdminRole();
  const payload: Partial<BlogPost> = { ...data };
  if (data.content !== undefined) {
    payload.content = await sanitizeHtmlContent(data.content);
  }

  const post = await saveBlogPost(payload);

  revalidatePath('/blog');
  revalidatePath('/admin/blog');
  return { success: true, post };
}

export async function deleteBlogPostAction(id: number) {
  await assertAdminRole();
  const deleted = await deleteBlogPost(id);
  revalidatePath('/blog');
  revalidatePath('/admin/blog');
  return { success: deleted };
}

// ==========================================
// Community Reels CMS Actions
// ==========================================

export async function saveVideoAction(data: Partial<CommunityVideo>) {
  await assertAdminRole();
  const video = await saveVideo(data);
  revalidatePath('/');
  revalidatePath('/admin/videos');
  return { success: true, video };
}

export async function deleteVideoAction(id: number) {
  await assertAdminRole();
  const deleted = await deleteVideo(id);
  revalidatePath('/');
  revalidatePath('/admin/videos');
  return { success: deleted };
}

export async function reorderVideosAction(orderedIds: number[]) {
  await assertAdminRole();
  const videos = await reorderVideos(orderedIds);
  revalidatePath('/');
  revalidatePath('/admin/videos');
  return { success: true, videos };
}

// ==========================================
// Featured Properties CMS Actions (AC-CMS-4)
// ==========================================

export async function reorderFeaturedPropertiesAction(orderedIds: number[]) {
  await assertAdminRole();
  const properties = await reorderFeaturedProperties(orderedIds);
  revalidatePath('/');
  revalidatePath('/admin/properties');
  return { success: true, properties };
}

// ==========================================
// Exchange Rates CMS Actions (AC-CMS-5)
// ==========================================

export async function updateExchangeRatesAction(rates: Partial<ExchangeRates>) {
  await assertAdminRole();
  const updated = await updateExchangeRates(rates);
  revalidatePath('/');
  revalidatePath('/admin/settings');
  revalidatePath('/c/[city]', 'page');
  revalidatePath('/l/apartments/[slug]', 'page');
  return { success: true, rates: updated };
}

// ==========================================
// Server Fetch Actions for Client Admin Pages
// ==========================================

export async function fetchWorkstationsAction() {
  await assertAdminRole();
  return await listWorkstations();
}

export async function fetchAdminWorkstationsAction() {
  await assertAdminRole();
  return await listWorkstations({ includeInactive: true });
}

export async function fetchLocationsAction() {
  await assertAdminRole();
  return await listLocations({ includeInactive: true });
}

export async function fetchTravelGuidesAction() {
  await assertAdminRole();
  const [guidesData, locsData] = await Promise.all([
    listTravelGuides({ includeDrafts: true, status: 'all' }),
    listLocations({ includeInactive: true }),
  ]);
  return { guidesData, locsData };
}

export async function fetchBlogPostsAction() {
  await assertAdminRole();
  return await listBlogPosts({ includeDrafts: true, status: 'all' });
}

export async function fetchVideosAction() {
  await assertAdminRole();
  return await listVideos({ includeInactive: true });
}

export async function fetchExchangeRatesAction() {
  await assertAdminRole();
  return await getExchangeRates();
}

