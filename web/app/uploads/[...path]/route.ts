import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import {
  detectImageMimeType,
  getMimeTypeFromExtension,
  getUploadDir,
  resolveUploadFilePath,
} from '@/lib/storage/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_CONTROL_IMMUTABLE = 'public, max-age=31536000, immutable';

async function readMagicBytes(filePath: string): Promise<Buffer> {
  const handle = await fs.open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, 12, 0);
    return header.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: segments } = await context.params;

  const resolvedPath = resolveUploadFilePath(segments);
  if (!resolvedPath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  let realBaseDir: string;
  let realFilePath: string;
  let fileStat: Awaited<ReturnType<typeof fs.stat>>;

  try {
    realBaseDir = await fs.realpath(getUploadDir());
    realFilePath = await fs.realpath(resolvedPath);
    fileStat = await fs.stat(realFilePath);
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Re-verify canonical realpath stays within UPLOAD_DIR to prevent symlink escapes
  const realBaseWithSep = realBaseDir.endsWith(path.sep)
    ? realBaseDir
    : `${realBaseDir}${path.sep}`;
  if (!realFilePath.startsWith(realBaseWithSep) || !fileStat.isFile()) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const headerBytes = await readMagicBytes(realFilePath);
  const mimeType = detectImageMimeType(headerBytes) ?? getMimeTypeFromExtension(realFilePath);
  if (!mimeType) {
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 415 });
  }

  const nodeStream = createReadStream(realFilePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(fileStat.size),
      'Cache-Control': CACHE_CONTROL_IMMUTABLE,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
