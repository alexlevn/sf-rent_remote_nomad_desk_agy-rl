import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError, requireAdmin } from '@/lib/auth/guards';
import { saveLocationAction, saveTravelGuideAction } from '@/app/admin/cms-actions';

/**
 * Route handler for CMS modifications via API (AC-CMS-8).
 * Non-admin users (guests, hosts, unauthenticated) are blocked with 403 Forbidden.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: 'Forbidden: Administrator privileges required to modify CMS content.' },
        { status: 403 }
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  try {
    const { action, payload } = body as { action?: unknown; payload?: unknown };

    if (payload !== undefined && (!payload || typeof payload !== 'object' || Array.isArray(payload))) {
      return NextResponse.json({ error: 'Payload must be an object' }, { status: 400 });
    }

    if (action === 'saveLocation') {
      const result = await saveLocationAction(
        (payload ?? {}) as Parameters<typeof saveLocationAction>[0]
      );
      return NextResponse.json(result);
    }

    if (action === 'saveTravelGuide') {
      const result = await saveTravelGuideAction(
        (payload ?? {}) as Parameters<typeof saveTravelGuideAction>[0]
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status }
    );
  }
}
