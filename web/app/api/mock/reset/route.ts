import { NextResponse } from 'next/server';
import { resetMockData } from '@/lib/api/mock/seed-data';

export async function POST() {
  resetMockData();
  return NextResponse.json({
    ok: true,
    message: 'Mock data store reset successfully to initial snapshot',
  });
}
