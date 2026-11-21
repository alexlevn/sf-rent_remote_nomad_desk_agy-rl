import { NextResponse } from 'next/server';
import { resetMockData } from '@/lib/api/mock/seed-data';
import { resetSession } from '@/lib/auth/session';

export async function POST() {
  resetMockData();
  resetSession();
  return NextResponse.json({
    ok: true,
    message: 'Mock data store reset successfully to initial snapshot',
  });
}
