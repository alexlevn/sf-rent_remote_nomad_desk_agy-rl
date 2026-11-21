import type { CommunityVideo } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists community reel videos.
 */
export async function listVideos(): Promise<CommunityVideo[]> {
  const store = getMockStore();
  return store.videos.map((v) => ({ ...v }));
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
