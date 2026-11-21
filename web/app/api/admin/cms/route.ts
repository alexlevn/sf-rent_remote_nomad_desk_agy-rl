import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { saveLocationAction, saveTravelGuideAction } from '@/app/admin/cms-actions';

/**
 * Route handler for CMS modifications via API (AC-CMS-8).
 * Non-admin users (guests, hosts, unauthenticated) are blocked with 403 Forbidden.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Administrator privileges required to modify CMS content.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action === 'saveLocation') {
      const result = await saveLocationAction(payload);
      return NextResponse.json(result);
    }

    if (action === 'saveTravelGuide') {
      const result = await saveTravelGuideAction(payload);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status }
    );
  }
}
