import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireUploadActor } from '@/lib/auth/guards';
import {
  MediaServiceError,
  UploadValidationError,
  deleteUnusedMedia,
} from '@/lib/uploads';
import { mediaIdSchema } from '@/lib/validations/media';
import type { UploadActor } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let actor: UploadActor;
  try {
    actor = await requireUploadActor();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[api/media/[id]] Auth check failed:', error);
    return NextResponse.json({ error: 'Authentication check failed.' }, { status: 500 });
  }

  const { id: rawId } = await context.params;
  const parsedId = mediaIdSchema.safeParse(rawId);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid media ID.' }, { status: 400 });
  }

  try {
    const result = await deleteUnusedMedia(parsedId.data, actor);
    return NextResponse.json({ ok: true, id: result.id }, { status: 200 });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof UploadValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[api/media/[id]] Delete failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete media item.' },
      { status: 500 },
    );
  }
}
