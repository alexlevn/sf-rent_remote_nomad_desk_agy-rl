import {
  MediaServiceError,
  deleteUnusedMedia,
  findMediaUsages,
  listMediaPaginated,
  uploadMediaFile,
  type DeleteMediaOptions,
  type DeleteMediaResult,
  type ListMediaParams,
  type MediaServiceErrorStatus,
  type UploadMediaOptions,
} from '@/lib/api/media';
import { requireUploadActor } from '@/lib/auth/guards';
import {
  MAX_IMAGE_DIMENSION,
  MAX_UPLOAD_FILE_SIZE,
  UploadValidationError,
  deleteUploadFile,
  saveUploadedFile,
  type AllowedImageMimeType,
  type UploadErrorCode,
  type UploadOptions,
  type UploadedFileResult,
} from '@/lib/storage/upload';
import type { MediaItem } from '@/lib/types';

/**
 * Single server-side entry point for authenticated image uploads.
 */
export async function handleImageUpload(
  input: Buffer | Blob | FormData,
  options?: UploadMediaOptions,
): Promise<MediaItem> {
  const actor = await requireUploadActor();
  return uploadMediaFile(input, actor, options);
}

export {
  MAX_IMAGE_DIMENSION,
  MAX_UPLOAD_FILE_SIZE,
  MediaServiceError,
  UploadValidationError,
  deleteUnusedMedia,
  deleteUploadFile,
  findMediaUsages,
  listMediaPaginated,
  saveUploadedFile,
  uploadMediaFile,
};

export type {
  AllowedImageMimeType,
  DeleteMediaOptions,
  DeleteMediaResult,
  ListMediaParams,
  MediaServiceErrorStatus,
  UploadErrorCode,
  UploadMediaOptions,
  UploadOptions,
  UploadedFileResult,
};
