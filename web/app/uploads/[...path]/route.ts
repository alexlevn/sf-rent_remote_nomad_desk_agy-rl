import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  type AllowedImageMimeType,
  detectImageMimeType,
  getUploadDir,
  resolveUploadFilePath,
} from '@/lib/storage/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_CONTROL_IMMUTABLE = 'public, max-age=31536000, immutable';
const UPLOAD_CSP = "default-src 'none'; sandbox";
// Only serve raster formats stored on disk; GIFs are converted to WebP during upload
const SERVABLE_IMAGE_MIMES = new Set<AllowedImageMimeType>([
  'image/webp',
  'image/jpeg',
  'image/png',
]);

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

interface VerifiedUploadFile {
  realFilePath: string;
  mimeType: AllowedImageMimeType;
  size: number;
}

async function resolveAndVerifyUploadFile(
  segments: string[]
): Promise<{ ok: true; file: VerifiedUploadFile } | { ok: false; response: NextResponse }> {
  const resolvedPath = resolveUploadFilePath(segments);
  if (!resolvedPath) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid file path' }, { status: 400 }),
    };
  }

  let realBaseDir: string;
  let realFilePath: string;
  let fileStat: Awaited<ReturnType<typeof fs.stat>>;

  try {
    realBaseDir = await fs.realpath(getUploadDir());
    realFilePath = await fs.realpath(resolvedPath);
    fileStat = await fs.stat(realFilePath);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'File not found' }, { status: 404 }),
    };
  }

  // Re-verify canonical realpath stays within UPLOAD_DIR to prevent symlink escapes
  const realBaseWithSep = realBaseDir.endsWith(path.sep)
    ? realBaseDir
    : `${realBaseDir}${path.sep}`;
  if (!realFilePath.startsWith(realBaseWithSep) || !fileStat.isFile()) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'File not found' }, { status: 404 }),
    };
  }

  let headerBytes: Buffer;
  try {
    headerBytes = await readMagicBytes(realFilePath);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'File not found' }, { status: 404 }),
    };
  }

  // Enforce magic-byte verification on read so spoofed extensions are never served
  const mimeType = detectImageMimeType(headerBytes);
  if (!mimeType || !SERVABLE_IMAGE_MIMES.has(mimeType)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unsupported media type' }, { status: 415 }),
    };
  }

  return {
    ok: true,
    file: { realFilePath, mimeType, size: fileStat.size },
  };
}

function buildUploadHeaders(file: VerifiedUploadFile): Record<string, string> {
  return {
    'Content-Type': file.mimeType,
    'Content-Length': String(file.size),
    'Cache-Control': CACHE_CONTROL_IMMUTABLE,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': UPLOAD_CSP,
  };
}

export async function HEAD(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: segments } = await context.params;
  const verified = await resolveAndVerifyUploadFile(segments);
  if (!verified.ok) {
    return verified.response;
  }
  return new NextResponse(null, {
    status: 200,
    headers: buildUploadHeaders(verified.file),
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: segments } = await context.params;
  const verified = await resolveAndVerifyUploadFile(segments);
  if (!verified.ok) {
    return verified.response;
  }

  const nodeStream = createReadStream(verified.file.realFilePath);
  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: string | Buffer) => {
        const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(bytes));
      });
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: buildUploadHeaders(verified.file),
  });
}
