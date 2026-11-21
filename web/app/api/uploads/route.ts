import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireUploadActor } from '@/lib/auth/guards';
import {
  MAX_MEDIA_ALT_LENGTH,
  MAX_UPLOAD_FILE_SIZE,
  MediaServiceError,
  UploadValidationError,
  uploadMediaFile,
} from '@/lib/uploads';
import type { UploadActor } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow small multipart boundary/field overhead above the 5 MB file limit
const MAX_MULTIPART_CONTENT_LENGTH = MAX_UPLOAD_FILE_SIZE + 256 * 1024;

function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === 'function' &&
    typeof (value as Blob).size === 'number'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let actor: UploadActor;
  try {
    actor = await requireUploadActor();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[api/uploads] Auth check failed:', error);
    return NextResponse.json({ error: 'Authentication check failed.' }, { status: 500 });
  }

  // Reject obviously oversized payloads before buffering multipart body into memory
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          error: `File exceeds maximum allowed size of ${MAX_UPLOAD_FILE_SIZE / (1024 * 1024)} MB.`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 413 },
      );
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid multipart form data.' },
      { status: 400 },
    );
  }

  const fileEntry = formData.get('file');
  if (!fileEntry || !isBlobLike(fileEntry)) {
    return NextResponse.json(
      { error: 'Missing file in FormData field "file".', code: 'INVALID_INPUT' },
      { status: 400 },
    );
  }

  const rawAlt = formData.get('alt');
  let alt: string | undefined;
  if (rawAlt !== null) {
    if (typeof rawAlt !== 'string') {
      return NextResponse.json(
        { error: 'Alt text must be a string.' },
        { status: 400 },
      );
    }
    const trimmedAlt = rawAlt.trim();
    if (trimmedAlt.length > MAX_MEDIA_ALT_LENGTH) {
      return NextResponse.json(
        { error: `Alt text must be ${MAX_MEDIA_ALT_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }
    alt = trimmedAlt.length > 0 ? trimmedAlt : undefined;
  }

  try {
    const mediaItem = await uploadMediaFile(fileEntry, actor, { alt });
    return NextResponse.json({ media: mediaItem }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      const status = error.code === 'FILE_TOO_LARGE' ? 413 : 400;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[api/uploads] Upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload image.' },
      { status: 500 },
    );
  }
}
