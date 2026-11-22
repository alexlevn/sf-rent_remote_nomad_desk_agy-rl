import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata, type OutputInfo } from 'sharp';

export const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_LISTING = 20;
export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_INPUT_PIXELS = 40_000_000; // ~6324x6324 ceiling against decompression bombs
export const WEBP_QUALITY = 80;

export type AllowedImageMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif';

export type UploadErrorCode =
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_MIME_TYPE'
  | 'INVALID_INPUT'
  | 'ANIMATED_GIF_NOT_ALLOWED'
  | 'CORRUPT_IMAGE';

export class UploadValidationError extends Error {
  readonly code: UploadErrorCode;

  constructor(code: UploadErrorCode, message: string) {
    super(message);
    this.name = 'UploadValidationError';
    this.code = code;
  }
}

export interface UploadedFileResult {
  filename: string;
  storageKey: string;
  url: string;
  mimeType: 'image/webp';
  width: number;
  height: number;
  sizeBytes: number;
}

export interface UploadOptions {
  uploadDir?: string;
  fieldName?: string;
}

const ALLOWED_SHARP_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);

export function getUploadDir(overrideDir?: string): string {
  const configured = overrideDir ?? process.env.UPLOAD_DIR;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured.trim());
  }
  return path.resolve(process.cwd(), '.data/uploads');
}

export function detectImageMimeType(buffer: Buffer): AllowedImageMimeType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  if (buffer.length >= 6) {
    const gifHeader = buffer.subarray(0, 6).toString('ascii');
    if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
      return 'image/gif';
    }
  }

  return null;
}

/**
 * Resolves URL path segments safely inside UPLOAD_DIR and rejects traversal attempts.
 */
export function resolveUploadFilePath(
  segments: string[],
  overrideUploadDir?: string,
): string | null {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  const decodedSegments: string[] = [];
  for (const rawSegment of segments) {
    if (typeof rawSegment !== 'string' || rawSegment.length === 0) {
      return null;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(rawSegment);
    } catch {
      return null;
    }

    // Reject null bytes, path separators, dot segments, and embedded '..'
    if (
      decoded.length === 0 ||
      decoded.includes('\0') ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('..')
    ) {
      return null;
    }

    decodedSegments.push(decoded);
  }

  const baseDir = getUploadDir(overrideUploadDir);
  const resolved = path.resolve(baseDir, ...decodedSegments);
  const baseWithSep = baseDir.endsWith(path.sep) ? baseDir : `${baseDir}${path.sep}`;

  if (!resolved.startsWith(baseWithSep)) {
    return null;
  }

  return resolved;
}

export async function saveUploadedBuffer(
  buffer: Buffer,
  options?: Pick<UploadOptions, 'uploadDir'>,
): Promise<UploadedFileResult> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new UploadValidationError('EMPTY_FILE', 'Uploaded file is empty.');
  }

  if (buffer.length > MAX_UPLOAD_FILE_SIZE) {
    throw new UploadValidationError(
      'FILE_TOO_LARGE',
      `File exceeds maximum allowed size of ${MAX_UPLOAD_FILE_SIZE / (1024 * 1024)} MB.`,
    );
  }

  const detectedMime = detectImageMimeType(buffer);
  if (!detectedMime) {
    throw new UploadValidationError(
      'INVALID_MIME_TYPE',
      'Unsupported file format. Only JPEG, PNG, WebP, and static GIF images are allowed.',
    );
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, {
      animated: true,
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
  } catch {
    throw new UploadValidationError(
      'CORRUPT_IMAGE',
      'The uploaded image is corrupted or unreadable. Please upload a valid JPEG, PNG, WebP, or static GIF image.',
    );
  }

  if (!metadata.format || !ALLOWED_SHARP_FORMATS.has(metadata.format)) {
    throw new UploadValidationError(
      'INVALID_MIME_TYPE',
      'Unsupported file format. Only JPEG, PNG, WebP, and static GIF images are allowed.',
    );
  }

  if (metadata.format === 'gif' && (metadata.pages ?? 1) > 1) {
    throw new UploadValidationError(
      'ANIMATED_GIF_NOT_ALLOWED',
      'Animated GIFs are not supported. Please upload a static GIF, JPEG, PNG, or WebP image.',
    );
  }

  // Apply EXIF orientation before stripping metadata, cap dimensions, and normalize to WebP
  let processedData: Buffer;
  let processedInfo: OutputInfo;
  try {
    const output = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    processedData = output.data;
    processedInfo = output.info;
  } catch {
    throw new UploadValidationError(
      'CORRUPT_IMAGE',
      'The uploaded image could not be processed. Please upload a valid JPEG, PNG, WebP, or static GIF image.',
    );
  }

  const uploadDir = getUploadDir(options?.uploadDir);
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
  // Avoid Turbopack tracing the entire project directory on runtime volume paths
  const targetPath = path.join(/*turbopackIgnore: true*/ uploadDir, filename);

  await fs.writeFile(targetPath, processedData, { flag: 'wx' });

  return {
    filename,
    storageKey: filename,
    url: `/uploads/${filename}`,
    mimeType: 'image/webp',
    width: processedInfo.width,
    height: processedInfo.height,
    sizeBytes: processedData.length,
  };
}

/**
 * Deletes an uploaded file by storageKey inside UPLOAD_DIR, ignoring missing files.
 */
export async function deleteUploadFile(
  storageKey: string,
  options?: Pick<UploadOptions, 'uploadDir'>,
): Promise<boolean> {
  const resolved = resolveUploadFilePath([storageKey], options?.uploadDir);
  if (!resolved) {
    throw new UploadValidationError('INVALID_INPUT', 'Invalid storage key.');
  }

  try {
    await fs.unlink(resolved);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === 'function' &&
    typeof (value as Blob).size === 'number'
  );
}

export async function saveUploadedFile(
  input: Buffer | Blob | FormData,
  options?: UploadOptions,
): Promise<UploadedFileResult> {
  if (Buffer.isBuffer(input)) {
    return saveUploadedBuffer(input, options);
  }

  let blob: Blob;
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    const fieldName = options?.fieldName ?? 'file';
    const entry = input.get(fieldName);
    if (!entry || !isBlobLike(entry)) {
      throw new UploadValidationError(
        'INVALID_INPUT',
        `Missing file in FormData field "${fieldName}".`,
      );
    }
    blob = entry;
  } else if (isBlobLike(input)) {
    blob = input;
  } else {
    throw new UploadValidationError('INVALID_INPUT', 'Expected a Buffer, File/Blob, or FormData.');
  }

  if (blob.size === 0) {
    throw new UploadValidationError('EMPTY_FILE', 'Uploaded file is empty.');
  }

  // Check declared size before reading into memory to avoid unnecessary allocation
  if (blob.size > MAX_UPLOAD_FILE_SIZE) {
    throw new UploadValidationError(
      'FILE_TOO_LARGE',
      `File exceeds maximum allowed size of ${MAX_UPLOAD_FILE_SIZE / (1024 * 1024)} MB.`,
    );
  }

  const arrayBuffer = await blob.arrayBuffer();
  return saveUploadedBuffer(Buffer.from(arrayBuffer), options);
}
