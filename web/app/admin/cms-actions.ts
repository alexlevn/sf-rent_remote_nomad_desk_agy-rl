'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import {
  saveLocation,
  deleteLocation,
  reorderTopCities,
} from '@/lib/api/locations';
import {
  saveWorkstationPackage,
  saveWorkstationComponent,
  deleteWorkstationComponent,
  saveWorkstationAddon,
  deleteWorkstationAddon,
} from '@/lib/api/workstations';
import { saveTravelGuide, deleteTravelGuide } from '@/lib/api/guides';
import { saveBlogPost, deleteBlogPost } from '@/lib/api/blog';
import { saveVideo, deleteVideo, reorderVideos } from '@/lib/api/videos';
import type {
  Location,
  WorkstationPackage,
  WorkstationComponentOption,
  WorkstationComponents,
  WorkstationAddon,
  TravelGuide,
  BlogPost,
  CommunityVideo,
} from '@/lib/types';

/**
 * Strips dangerous executable script tags and event handlers (AC-CMS-8).
 */
export async function sanitizeHtmlContent(html: string): Promise<string> {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Asserts admin role. Throws 403 error if guest or host calls CMS action (AC-CMS-8).
 */
async function assertAdminRole() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    const error = new Error('Forbidden: Admin role required.');
    // Set 403 status property for HTTP handlers / test assertions
    (error as unknown as { status: number; statusCode: number }).status = 403;
    (error as unknown as { status: number; statusCode: number }).statusCode = 403;
    throw error;
  }
  return user;
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

// ==========================================
// Travel Guides CMS Actions (AC-CMS-3)
// ==========================================

export async function saveTravelGuideAction(data: Partial<TravelGuide>) {
  await assertAdminRole();
  // Sanitize content against XSS scripts / onerror
  const sanitizedContent = data.content
    ? await sanitizeHtmlContent(data.content)
    : '';

  const guide = await saveTravelGuide({
    ...data,
    content: sanitizedContent,
  });

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
  const sanitizedContent = data.content
    ? await sanitizeHtmlContent(data.content)
    : '';

  const post = await saveBlogPost({
    ...data,
    content: sanitizedContent,
  });

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
