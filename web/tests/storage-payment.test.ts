import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as getUploadRoute } from '@/app/uploads/[...path]/route';
import {
  getPaymentDriver,
  MockPaymentDriver,
  PaymentDriverError,
} from '@/lib/payments/driver';
import {
  detectImageMimeType,
  MAX_UPLOAD_FILE_SIZE,
  resolveUploadFilePath,
  saveUploadedBuffer,
  saveUploadedFile,
  UploadValidationError,
} from '@/lib/storage/upload';

// Minimal valid image headers with payload bytes
const SAMPLE_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const SAMPLE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const SAMPLE_WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x1a, 0x00, 0x00, 0x00, // size
  0x57, 0x45, 0x42, 0x50, // WEBP
  0x56, 0x50, 0x38, 0x20,
]);

describe('Local Volume Storage Upload & Route Handler', () => {
  let tempRoot: string;
  let tempUploadDir: string;
  let originalUploadDir: string | undefined;

  beforeAll(async () => {
    originalUploadDir = process.env.UPLOAD_DIR;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nomaddesk-uploads-test-'));
    tempUploadDir = path.join(tempRoot, 'uploads');
    await fs.mkdir(tempUploadDir, { recursive: true });
    process.env.UPLOAD_DIR = tempUploadDir;
  });

  afterAll(async () => {
    if (originalUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = originalUploadDir;
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('detects JPEG, PNG, and WebP magic bytes and rejects non-images', () => {
    expect(detectImageMimeType(SAMPLE_JPEG)).toBe('image/jpeg');
    expect(detectImageMimeType(SAMPLE_PNG)).toBe('image/png');
    expect(detectImageMimeType(SAMPLE_WEBP)).toBe('image/webp');
    expect(detectImageMimeType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectImageMimeType(Buffer.from('GIF89a'))).toBeNull();
  });

  it('saves valid JPEG, PNG, and WebP buffers with random hex filenames and serves them via route handler', async () => {
    const cases = [
      { buffer: SAMPLE_JPEG, mime: 'image/jpeg', ext: '.jpg' },
      { buffer: SAMPLE_PNG, mime: 'image/png', ext: '.png' },
      { buffer: SAMPLE_WEBP, mime: 'image/webp', ext: '.webp' },
    ] as const;

    for (const item of cases) {
      const saved = await saveUploadedBuffer(item.buffer);
      expect(saved.mimeType).toBe(item.mime);
      expect(saved.size).toBe(item.buffer.length);
      expect(saved.filename).toMatch(new RegExp(`^[0-9a-f]{32}\\${item.ext}$`));
      expect(saved.url).toBe(`/uploads/${saved.filename}`);

      const req = new NextRequest(`http://localhost:3288${saved.url}`);
      const res = await getUploadRoute(req, {
        params: Promise.resolve({ path: [saved.filename] }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe(item.mime);
      expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');

      const body = Buffer.from(await res.arrayBuffer());
      expect(body.equals(item.buffer)).toBe(true);
    }
  });

  it('accepts FormData and Blob inputs in saveUploadedFile', async () => {
    const formData = new FormData();
    const file = new File([SAMPLE_PNG], 'apartment-photo.png', { type: 'image/png' });
    formData.append('file', file);

    const saved = await saveUploadedFile(formData);
    expect(saved.mimeType).toBe('image/png');
    expect(saved.url).toMatch(/^\/uploads\/[0-9a-f]{32}\.png$/);
  });

  it('rejects empty files, invalid MIME types, and files over 5 MB', async () => {
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

    const oversized = Buffer.alloc(MAX_UPLOAD_FILE_SIZE + 1);
    SAMPLE_JPEG.copy(oversized, 0);
    await expect(saveUploadedBuffer(oversized)).rejects.toBeInstanceOf(UploadValidationError);
    await expect(saveUploadedBuffer(oversized)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
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

    const missingReq = new NextRequest('http://localhost:3288/uploads/does-not-exist.jpg');
    const missingRes = await getUploadRoute(missingReq, {
      params: Promise.resolve({ path: ['does-not-exist.jpg'] }),
    });
    expect(missingRes.status).toBe(404);
  });

  it('blocks symlinks escaping UPLOAD_DIR', async () => {
    const outsideFile = path.join(tempRoot, 'secret.jpg');
    await fs.writeFile(outsideFile, SAMPLE_JPEG);

    const symlinkPath = path.join(tempUploadDir, 'escape-link.jpg');
    await fs.symlink(outsideFile, symlinkPath);

    const req = new NextRequest('http://localhost:3288/uploads/escape-link.jpg');
    const res = await getUploadRoute(req, {
      params: Promise.resolve({ path: ['escape-link.jpg'] }),
    });
    expect(res.status).toBe(404);
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
