import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as getUploadRoute } from '@/app/uploads/[...path]/route';
import {
  getPaymentDriver,
  MockPaymentDriver,
  PaymentDriverError,
} from '@/lib/payments/driver';
import {
  deleteUploadFile,
  detectImageMimeType,
  MAX_IMAGE_DIMENSION,
  MAX_UPLOAD_FILE_SIZE,
  resolveUploadFilePath,
  saveUploadedBuffer,
  saveUploadedFile,
  UploadValidationError,
} from '@/lib/storage/upload';
import { sanitizeHtml } from '@/lib/validations/content';
import {
  isSafeImagePath,
  mediaIdSchema,
  mediaListQuerySchema,
  optionalSafeImagePathSchema,
  safeImagePathSchema,
} from '@/lib/validations/media';

async function createSampleImage(
  format: 'jpeg' | 'png' | 'webp' | 'gif',
  width = 32,
  height = 24,
): Promise<Buffer> {
  const base = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 42, g: 120, b: 195, alpha: 1 },
    },
  });

  if (format === 'jpeg') return base.jpeg({ quality: 90 }).toBuffer();
  if (format === 'png') return base.png().toBuffer();
  if (format === 'webp') return base.webp({ quality: 90 }).toBuffer();
  return base.gif().toBuffer();
}

async function createAnimatedGif(): Promise<Buffer> {
  const width = 4;
  const pageHeight = 4;
  const pages = 2;
  const raw = Buffer.alloc(width * pageHeight * pages * 4, 200);
  // Differ frame 2 pixels so libvips/cgif preserves both frames
  raw.fill(50, width * pageHeight * 4);
  return sharp(raw, {
    raw: {
      width,
      height: pageHeight * pages,
      channels: 4,
      pageHeight,
    },
  })
    .gif()
    .toBuffer();
}

describe('Local Volume Storage Upload & Route Handler', () => {
  let tempRoot: string;
  let tempUploadDir: string;
  let originalUploadDir: string | undefined;
  let sampleJpeg: Buffer;
  let samplePng: Buffer;
  let sampleWebp: Buffer;
  let sampleStaticGif: Buffer;
  let sampleAnimatedGif: Buffer;

  beforeAll(async () => {
    originalUploadDir = process.env.UPLOAD_DIR;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nomaddesk-uploads-test-'));
    tempUploadDir = path.join(tempRoot, 'uploads');
    await fs.mkdir(tempUploadDir, { recursive: true });
    process.env.UPLOAD_DIR = tempUploadDir;

    [sampleJpeg, samplePng, sampleWebp, sampleStaticGif, sampleAnimatedGif] =
      await Promise.all([
        createSampleImage('jpeg', 40, 30),
        createSampleImage('png', 40, 30),
        createSampleImage('webp', 40, 30),
        createSampleImage('gif', 40, 30),
        createAnimatedGif(),
      ]);
  });

  afterAll(async () => {
    if (originalUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = originalUploadDir;
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('detects JPEG, PNG, WebP, and GIF magic bytes and rejects non-images', () => {
    expect(detectImageMimeType(sampleJpeg)).toBe('image/jpeg');
    expect(detectImageMimeType(samplePng)).toBe('image/png');
    expect(detectImageMimeType(sampleWebp)).toBe('image/webp');
    expect(detectImageMimeType(sampleStaticGif)).toBe('image/gif');
    expect(detectImageMimeType(Buffer.from('GIF87a1234'))).toBe('image/gif');
    expect(detectImageMimeType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectImageMimeType(Buffer.from('<svg></svg>'))).toBeNull();
  });

  it('converts JPEG, PNG, WebP, and static GIF to WebP and serves them via route handler', async () => {
    const cases = [
      { label: 'jpeg', buffer: sampleJpeg },
      { label: 'png', buffer: samplePng },
      { label: 'webp', buffer: sampleWebp },
      { label: 'static-gif', buffer: sampleStaticGif },
    ];

    for (const item of cases) {
      const saved = await saveUploadedBuffer(item.buffer);
      expect(saved.mimeType).toBe('image/webp');
      expect(saved.filename).toMatch(/^[0-9a-f]{32}\.webp$/);
      expect(saved.storageKey).toBe(saved.filename);
      expect(saved.url).toBe(`/uploads/${saved.filename}`);
      expect(saved.width).toBe(40);
      expect(saved.height).toBe(30);
      expect(saved.sizeBytes).toBeGreaterThan(0);

      const req = new NextRequest(`http://localhost:3288${saved.url}`);
      const res = await getUploadRoute(req, {
        params: Promise.resolve({ path: [saved.filename] }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/webp');
      expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');

      const body = Buffer.from(await res.arrayBuffer());
      expect(body.length).toBe(saved.sizeBytes);
      expect(detectImageMimeType(body)).toBe('image/webp');
    }
  });

  it('resizes oversized images to <= 1600px on longest edge and strips EXIF metadata', async () => {
    const oversizedWithExif = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: { r: 220, g: 100, b: 60 },
      },
    })
      .jpeg({ quality: 85 })
      .withExif({
        IFD0: {
          Make: 'NomadCam',
          Model: 'GPS-100',
        },
      })
      .toBuffer();

    const beforeMeta = await sharp(oversizedWithExif).metadata();
    expect(beforeMeta.exif).toBeDefined();

    const saved = await saveUploadedBuffer(oversizedWithExif);
    expect(saved.width).toBe(MAX_IMAGE_DIMENSION);
    expect(saved.height).toBe(800);
    expect(saved.mimeType).toBe('image/webp');

    const storedPath = resolveUploadFilePath([saved.storageKey]);
    expect(storedPath).not.toBeNull();
    const storedMeta = await sharp(storedPath!).metadata();
    expect(storedMeta.format).toBe('webp');
    expect(storedMeta.width).toBe(MAX_IMAGE_DIMENSION);
    expect(storedMeta.height).toBe(800);
    expect(storedMeta.exif).toBeUndefined();
  });

  it('accepts FormData and Blob inputs in saveUploadedFile', async () => {
    const formData = new FormData();
    const file = new File([new Uint8Array(samplePng)], 'apartment-photo.png', {
      type: 'image/png',
    });
    formData.append('file', file);

    const saved = await saveUploadedFile(formData);
    expect(saved.mimeType).toBe('image/webp');
    expect(saved.url).toMatch(/^\/uploads\/[0-9a-f]{32}\.webp$/);
  });

  it('rejects empty files, invalid MIME types, animated GIFs, corrupt images, and files over 5 MB', async () => {
    await expect(saveUploadedBuffer(Buffer.alloc(0))).rejects.toMatchObject({
      name: 'UploadValidationError',
      code: 'EMPTY_FILE',
    });

    await expect(
      saveUploadedBuffer(Buffer.from('<html>not an image</html>')),
    ).rejects.toMatchObject({
      name: 'UploadValidationError',
      code: 'INVALID_MIME_TYPE',
    });

    await expect(saveUploadedBuffer(sampleAnimatedGif)).rejects.toMatchObject({
      name: 'UploadValidationError',
      code: 'ANIMATED_GIF_NOT_ALLOWED',
    });

    // Fake JPEG magic bytes followed by garbage payload
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    await expect(saveUploadedBuffer(fakeJpeg)).rejects.toMatchObject({
      name: 'UploadValidationError',
      code: 'CORRUPT_IMAGE',
    });

    const oversized = Buffer.alloc(MAX_UPLOAD_FILE_SIZE + 1);
    sampleJpeg.copy(oversized, 0);
    await expect(saveUploadedBuffer(oversized)).rejects.toBeInstanceOf(UploadValidationError);
    await expect(saveUploadedBuffer(oversized)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
    });
  });

  it('deletes uploaded files safely via deleteUploadFile and ignores ENOENT', async () => {
    const saved = await saveUploadedBuffer(samplePng);
    const deleted = await deleteUploadFile(saved.storageKey);
    expect(deleted).toBe(true);

    // Second delete should quietly return false on ENOENT
    const deletedAgain = await deleteUploadFile(saved.storageKey);
    expect(deletedAgain).toBe(false);

    await expect(deleteUploadFile('../secret.webp')).rejects.toMatchObject({
      name: 'UploadValidationError',
      code: 'INVALID_INPUT',
    });
  });

  it('blocks path traversal attempts with HTTP 400 and rejects missing files with HTTP 404', async () => {
    const traversalPayloads: string[][] = [
      ['..', 'package.json'],
      ['%2e%2e', 'package.json'],
      ['nested', '..', '..', 'etc', 'passwd'],
      ['..%2f..%2fetc%2fpasswd'],
      ['evil\0.jpg'],
      ['.'],
      [],
    ];

    for (const segments of traversalPayloads) {
      expect(resolveUploadFilePath(segments)).toBeNull();
      const req = new NextRequest('http://localhost:3288/uploads/traversal');
      const res = await getUploadRoute(req, {
        params: Promise.resolve({ path: segments }),
      });
      expect(res.status).toBe(400);
    }

    const missingReq = new NextRequest('http://localhost:3288/uploads/does-not-exist.webp');
    const missingRes = await getUploadRoute(missingReq, {
      params: Promise.resolve({ path: ['does-not-exist.webp'] }),
    });
    expect(missingRes.status).toBe(404);
  });

  it('blocks symlinks escaping UPLOAD_DIR', async () => {
    const outsideFile = path.join(tempRoot, 'secret.jpg');
    await fs.writeFile(outsideFile, sampleJpeg);

    const symlinkPath = path.join(tempUploadDir, 'escape-link.jpg');
    await fs.symlink(outsideFile, symlinkPath);

    const req = new NextRequest('http://localhost:3288/uploads/escape-link.jpg');
    const res = await getUploadRoute(req, {
      params: Promise.resolve({ path: ['escape-link.jpg'] }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects files with spoofed image extensions or raw GIF magic bytes with HTTP 415', async () => {
    const spoofedFile = path.join(tempUploadDir, 'spoofed.jpg');
    await fs.writeFile(spoofedFile, Buffer.from('<svg onload=alert(1)>'));

    const req = new NextRequest('http://localhost:3288/uploads/spoofed.jpg');
    const res = await getUploadRoute(req, {
      params: Promise.resolve({ path: ['spoofed.jpg'] }),
    });
    expect(res.status).toBe(415);

    const rawGifFile = path.join(tempUploadDir, 'raw.gif');
    await fs.writeFile(rawGifFile, sampleStaticGif);
    const gifReq = new NextRequest('http://localhost:3288/uploads/raw.gif');
    const gifRes = await getUploadRoute(gifReq, {
      params: Promise.resolve({ path: ['raw.gif'] }),
    });
    expect(gifRes.status).toBe(415);
  });
});

describe('Shared Media Validation & Hardened sanitizeHtml', () => {
  it('validates safe image paths and rejects unsafe schemes or traversal', () => {
    expect(isSafeImagePath('/uploads/0123456789abcdef0123456789abcdef.webp')).toBe(true);
    expect(isSafeImagePath('/seed/property/prop-madrid-1.webp')).toBe(true);
    expect(isSafeImagePath('https://images.example.com/photo.webp?w=800')).toBe(true);

    expect(isSafeImagePath('')).toBe(false);
    expect(isSafeImagePath('/uploads/')).toBe(false);
    expect(isSafeImagePath('/uploads/../etc/passwd')).toBe(false);
    expect(isSafeImagePath('/seed/%2e%2e/secret.png')).toBe(false);
    expect(isSafeImagePath('http://example.com/photo.jpg')).toBe(false);
    expect(isSafeImagePath('javascript:alert(1)')).toBe(false);
    expect(isSafeImagePath('data:image/svg+xml,<svg/>')).toBe(false);
    expect(isSafeImagePath('//evil.com/x.png')).toBe(false);

    expect(safeImagePathSchema.safeParse('/uploads/abc.webp').success).toBe(true);
    expect(safeImagePathSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(safeImagePathSchema.safeParse('/uploads/' + 'a'.repeat(250)).success).toBe(false);
  });

  it('normalizes optionalSafeImagePathSchema and validates media query/id schemas', () => {
    expect(optionalSafeImagePathSchema.parse(undefined)).toBeNull();
    expect(optionalSafeImagePathSchema.parse(null)).toBeNull();
    expect(optionalSafeImagePathSchema.parse('')).toBeNull();
    expect(optionalSafeImagePathSchema.parse('   ')).toBeNull();
    expect(optionalSafeImagePathSchema.parse('/uploads/avatar.webp')).toBe('/uploads/avatar.webp');
    expect(optionalSafeImagePathSchema.safeParse('http://insecure.test/a.png').success).toBe(false);

    expect(mediaListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 24 });
    expect(mediaListQuerySchema.parse({ page: '2', pageSize: '12', search: '  loft  ' })).toEqual({
      page: 2,
      pageSize: 12,
      search: 'loft',
    });
    expect(mediaListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(mediaListQuerySchema.safeParse({ pageSize: 61 }).success).toBe(false);

    expect(mediaIdSchema.parse(42)).toBe(42);
    expect(mediaIdSchema.parse('42')).toBe(42);
    expect(mediaIdSchema.safeParse(0).success).toBe(false);
    expect(mediaIdSchema.safeParse(2_147_483_648).success).toBe(false);
    expect(mediaIdSchema.safeParse('').success).toBe(false);
  });

  it('strips svg, math, style, form, base, and data:image/svg+xml while preserving Tiptap HTML', () => {
    const dirty = [
      '<p>Hello</p>',
      '<img src="/uploads/abc123.webp" alt="Desk" />',
      '<svg onload="alert(1)"><circle r="10" /></svg>',
      '<math><mi>x</mi></math>',
      '<style>body { display: none; }</style>',
      '<form action="https://evil.com"><input name="pw" /></form>',
      '<base href="https://evil.com/" />',
      '<img src="data:image/svg+xml;base64,PHN2Zz4=" />',
    ].join('');

    const cleaned = sanitizeHtml(dirty);
    expect(cleaned).toContain('<p>Hello</p>');
    expect(cleaned).toContain('<img src="/uploads/abc123.webp" alt="Desk" />');
    expect(cleaned).not.toMatch(/<svg/i);
    expect(cleaned).not.toMatch(/<math/i);
    expect(cleaned).not.toMatch(/<style/i);
    expect(cleaned).not.toMatch(/<form/i);
    expect(cleaned).not.toMatch(/<base/i);
    expect(cleaned).not.toMatch(/data\s*:\s*image\/svg\+xml/i);
  });
});

describe('Mock Payment Driver', () => {
  it('completes authorize -> capture -> refund and authorize -> void lifecycle with mock_txn_ refs', async () => {
    const driver = getPaymentDriver();
    expect(driver).toBeInstanceOf(MockPaymentDriver);
    expect(driver.name).toBe('mock');

    const authResult = await driver.authorize(250000, 'usd', {
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/28',
      cvc: '424',
      cardholderName: 'Alex Nomad',
    });

    expect(authResult.success).toBe(true);
    expect(authResult.status).toBe('authorized');
    expect(authResult.amount).toBe(250000);
    expect(authResult.currency).toBe('USD');
    expect(authResult.paymentRef).toMatch(/^mock_txn_[0-9a-f]{24}$/);

    const captureResult = await driver.capture(authResult.paymentRef);
    expect(captureResult.success).toBe(true);
    expect(captureResult.status).toBe('captured');
    expect(captureResult.paymentRef).toBe(authResult.paymentRef);

    const refundResult = await driver.refund(authResult.paymentRef);
    expect(refundResult.success).toBe(true);
    expect(refundResult.status).toBe('refunded');
    expect(refundResult.paymentRef).toBe(authResult.paymentRef);

    const voidResult = await driver.void(authResult.paymentRef);
    expect(voidResult.success).toBe(true);
    expect(voidResult.status).toBe('voided');
    expect(voidResult.paymentRef).toBe(authResult.paymentRef);
  });

  it('rejects invalid payment inputs with PaymentDriverError', async () => {
    const driver = new MockPaymentDriver();

    await expect(
      driver.authorize(0, 'USD', { cardNumber: '4242424242424242' }),
    ).rejects.toBeInstanceOf(PaymentDriverError);

    await expect(
      driver.authorize(100.5, 'USD', { cardNumber: '4242424242424242' }),
    ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });

    await expect(
      driver.authorize(10000, 'INVALID', { cardNumber: '4242424242424242' }),
    ).rejects.toMatchObject({ code: 'INVALID_CURRENCY' });

    await expect(
      driver.authorize(10000, 'USD', { cardNumber: '1234' }),
    ).rejects.toMatchObject({ code: 'INVALID_CARD' });

    await expect(driver.capture('   ')).rejects.toMatchObject({
      code: 'INVALID_PAYMENT_REF',
    });
  });
});
