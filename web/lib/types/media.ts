import type { User } from './user';

export interface MediaItem {
  id: number;
  url: string;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  alt: string | null;
  uploadedBy: number | null;
  createdAt: string;
  isInUse: boolean;
  usageCount: number;
}

export interface MediaListResult {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type UploadActor =
  | { user: User; role: 'admin' }
  | { user: User; role: 'host'; hostId: number };
