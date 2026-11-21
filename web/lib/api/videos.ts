import type { CommunityVideo } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists community reel videos. By default only returns active videos.
 */
export async function listVideos(options?: {
  includeInactive?: boolean;
}): Promise<CommunityVideo[]> {
  const store = getMockStore();
  const list = options?.includeInactive
    ? store.videos
    : store.videos.filter((v) => v.isActive !== false);
  return list
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((v) => ({ ...v }));
}

/**
 * Saves or updates a video reel entry (admin CMS).
 */
export async function saveVideo(data: Partial<CommunityVideo>): Promise<CommunityVideo> {
  const store = getMockStore();
  if (data.id) {
    const idx = store.videos.findIndex((v) => v.id === data.id);
    if (idx !== -1) {
      store.videos[idx] = { ...store.videos[idx], ...data };
      return { ...store.videos[idx] };
    }
  }

  const maxId = store.videos.reduce((max, v) => Math.max(max, v.id), 0);
  const newVideo: CommunityVideo = {
    id: maxId + 1,
    platform: data.platform || 'Instagram',
    url: data.url || 'https://www.instagram.com',
    embedSrc: data.embedSrc || '',
    aspect: data.aspect || '9:16',
    authorName: data.authorName || 'Guest Story',
    avatar: data.avatar || '/seed/location/madrid.jpg',
    isActive: data.isActive ?? true,
    position: data.position ?? maxId + 1,
  };

  store.videos.push(newVideo);
  return { ...newVideo };
}

/**
 * Deletes a video reel by ID.
 */
export async function deleteVideo(id: number): Promise<boolean> {
  const store = getMockStore();
  const idx = store.videos.findIndex((v) => v.id === id);
  if (idx !== -1) {
    store.videos.splice(idx, 1);
    return true;
  }
  return false;
}

/**
 * Reorders video reels by ID sequence.
 */
export async function reorderVideos(orderedIds: number[]): Promise<CommunityVideo[]> {
  const store = getMockStore();
  orderedIds.forEach((id, idx) => {
    const v = store.videos.find((item) => item.id === id);
    if (v) {
      v.position = idx + 1;
    }
  });
  return store.videos
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((v) => ({ ...v }));
}
