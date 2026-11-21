import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireUploadActor } from '@/lib/auth/guards';
import { MediaServiceError, listMediaPaginated } from '@/lib/uploads';
import { mediaListQuerySchema } from '@/lib/validations/media';
import type { UploadActor } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  let actor: UploadActor;
  try {
    actor = await requireUploadActor();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = mediaListQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid query parameters.' },
      { status: 400 },
    );
  }

  try {
    // Hosts may only see media they uploaded; admins see the full library
    const uploadedBy = actor.role === 'host' ? actor.user.id : undefined;
    const result = await listMediaPaginated({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      search: parsed.data.search,
      uploadedBy,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[api/media] List media failed:', error);
    return NextResponse.json(
      { error: 'Failed to load media library.' },
      { status: 500 },
    );
  }
}
