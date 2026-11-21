import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaItem, MediaListResult, User, UserRole } from '@/lib/types';

interface MockAuthSession {
  user?: {
    id?: string;
    role?: UserRole;
    isActive?: boolean;
    email?: string;
  };
}

const mockAuth = vi.fn<() => Promise<MockAuthSession | null>>();

vi.mock('@/lib/auth/config', () => ({
  auth: () => mockAuth(),
}));

import { GET as getMediaRoute } from '@/app/api/media/route';
import { DELETE as deleteMediaRoute } from '@/app/api/media/[id]/route';
import { POST as postUploadRoute } from '@/app/api/uploads/route';
import { GET as getUploadRoute } from '@/app/uploads/[...path]/route';
import { getUserByEmail } from '@/lib/api/users';
import { resetSession, setCurrentUserId } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { hostProfiles, media, properties, travelGuides, users } from '@/lib/db/schema';
import {
  detectImageMimeType,
  MAX_IMAGE_DIMENSION,
  MAX_UPLOAD_FILE_SIZE,
  resolveUploadFilePath,
} from '@/lib/storage/upload';
import { sanitizeHtml } from '@/lib/validations/content';
import { optionalSafeImagePathSchema, safeImagePathSchema } from '@/lib/validations/media';

interface UploadSuccessBody {
  media: MediaItem;
}

interface ErrorBody {
  error: string;
  code?: string;
}

interface DeleteSuccessBody {
  ok: boolean;
  id: number;
}

async function createSampleImage(
  format: 'jpeg' | 'png' | 'webp' | 'gif',
  width = 48,
  height = 36,
): Promise<Buffer> {
  const base = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 30, g: 136, b: 229, alpha: 1 },
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
  const raw = Buffer.alloc(width * pageHeight * pages * 4, 210);
  // Differ frame 2 pixels so libvips/cgif preserves both frames
  raw.fill(40, width * pageHeight * 4);
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

function createUploadRequest(
  file: File,
  options?: { alt?: string; headers?: Record<string, string> },
): NextRequest {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.alt !== undefined) {
    formData.append('alt', options.alt);
  }
  return new NextRequest('http://localhost:3288/api/uploads', {
    method: 'POST',
    body: formData,
    headers: options?.headers,
  });
}

function createMediaListRequest(query = ''): NextRequest {
  const url = query ? `http://localhost:3288/api/media?${query}` : 'http://localhost:3288/api/media';
  return new NextRequest(url, { method: 'GET' });
}

function createMediaDeleteRequest(id: number | string): NextRequest {
  return new NextRequest(`http://localhost:3288/api/media/${id}`, {
    method: 'DELETE',
  });
}

function setSessionForUser(
  user: Pick<User, 'id' | 'role' | 'isActive' | 'email'> | null,
  overrideActive?: boolean,
): void {
  if (!user) {
    mockAuth.mockResolvedValue(null);
    return;
  }
  mockAuth.mockResolvedValue({
    user: {
      id: String(user.id),
      role: user.role,
      isActive: overrideActive ?? user.isActive,
      email: user.email,
    },
  });
}

describe('Upload & Media Pipeline, RBAC, Unused-Only Deletion & XSS (T7)', () => {
  const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const createdMediaIds: number[] = [];
  const createdPropertyIds: number[] = [];
  const createdGuideIds: number[] = [];
  const createdUserIds: number[] = [];

  let tempRoot: string;
  let tempUploadDir: string;
  let originalUploadDir: string | undefined;

  let sampleJpeg: Buffer;
  let samplePng: Buffer;
  let sampleWebp: Buffer;
  let sampleStaticGif: Buffer;
  let sampleAnimatedGif: Buffer;

  let seededGuest: User;
  let seededAdmin: User;
  let seededApprovedHost: User;
  let inactiveAdminUser: User;
  let pendingHostUser: User;
  let suspendedHostUser: User;
  let secondApprovedHostUser: User;
  let seededHostProfileId: number;

  async function uploadAsCurrentActor(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    alt?: string,
  ): Promise<{ status: number; body: UploadSuccessBody | ErrorBody }> {
    const file = new File([new Uint8Array(buffer)], filename, { type: mimeType });
    const req = createUploadRequest(file, { alt });
    const res = await postUploadRoute(req);
    const body = (await res.json()) as UploadSuccessBody | ErrorBody;
    if (res.status === 201 && 'media' in body) {
      createdMediaIds.push(body.media.id);
    }
    return { status: res.status, body };
  }

  beforeAll(async () => {
    originalUploadDir = process.env.UPLOAD_DIR;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nomaddesk-t7-uploads-'));
    tempUploadDir = path.join(tempRoot, 'uploads');
    await fs.mkdir(tempUploadDir, { recursive: true });
    process.env.UPLOAD_DIR = tempUploadDir;

    [sampleJpeg, samplePng, sampleWebp, sampleStaticGif, sampleAnimatedGif] = await Promise.all([
      createSampleImage('jpeg', 48, 36),
      createSampleImage('png', 48, 36),
      createSampleImage('webp', 48, 36),
      createSampleImage('gif', 48, 36),
      createAnimatedGif(),
    ]);

    const [guest, admin, host] = await Promise.all([
      getUserByEmail('demo@example.com'),
      getUserByEmail('admin@example.com'),
      getUserByEmail('host@example.com'),
    ]);

    if (!guest || !admin || !host) {
      throw new Error('Seeded users (demo/admin/host) must exist before running T7 tests');
    }

    seededGuest = guest;
    seededAdmin = admin;
    seededApprovedHost = host;

    const [seededHostProfile] = await db
      .select({ id: hostProfiles.id })
      .from(hostProfiles)
      .where(eq(hostProfiles.userId, seededApprovedHost.id))
      .limit(1);

    if (!seededHostProfile) {
      throw new Error('Seeded approved host profile must exist before running T7 tests');
    }
    seededHostProfileId = seededHostProfile.id;

    // Create isolated temporary users for Risk #10, pending/suspended host, and cross-host isolation
    const [inactiveRow] = await db
      .insert(users)
      .values({
        email: `t7-inactive-admin-${runSuffix}@example.com`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Inactive',
        lastName: 'Admin',
        role: 'admin',
        isActive: false,
      })
      .returning();
    createdUserIds.push(inactiveRow.id);
    inactiveAdminUser = {
      id: inactiveRow.id,
      email: inactiveRow.email,
      passwordHash: inactiveRow.passwordHash,
      firstName: inactiveRow.firstName ?? '',
      lastName: inactiveRow.lastName ?? '',
      role: 'admin',
      isActive: inactiveRow.isActive,
      createdAt: inactiveRow.createdAt.toISOString(),
    };

    const [pendingRow] = await db
      .insert(users)
      .values({
        email: `t7-pending-host-${runSuffix}@example.com`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Pending',
        lastName: 'Host',
        role: 'host',
        isActive: true,
      })
      .returning();
    createdUserIds.push(pendingRow.id);
    await db.insert(hostProfiles).values({
      userId: pendingRow.id,
      displayName: 'Pending Host T7',
      slug: `t7-pending-host-${runSuffix}`,
      phone: '+34 600 000 001',
      status: 'pending',
    });
    pendingHostUser = {
      id: pendingRow.id,
      email: pendingRow.email,
      passwordHash: pendingRow.passwordHash,
      firstName: pendingRow.firstName ?? '',
      lastName: pendingRow.lastName ?? '',
      role: 'host',
      isActive: pendingRow.isActive,
      createdAt: pendingRow.createdAt.toISOString(),
    };

    const [suspendedRow] = await db
      .insert(users)
      .values({
        email: `t7-suspended-host-${runSuffix}@example.com`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Suspended',
        lastName: 'Host',
        role: 'host',
        isActive: true,
      })
      .returning();
    createdUserIds.push(suspendedRow.id);
    await db.insert(hostProfiles).values({
      userId: suspendedRow.id,
      displayName: 'Suspended Host T7',
      slug: `t7-suspended-host-${runSuffix}`,
      phone: '+34 600 000 002',
      status: 'suspended',
    });
    suspendedHostUser = {
      id: suspendedRow.id,
      email: suspendedRow.email,
      passwordHash: suspendedRow.passwordHash,
      firstName: suspendedRow.firstName ?? '',
      lastName: suspendedRow.lastName ?? '',
      role: 'host',
      isActive: suspendedRow.isActive,
      createdAt: suspendedRow.createdAt.toISOString(),
    };

    const [secondHostRow] = await db
      .insert(users)
      .values({
        email: `t7-second-host-${runSuffix}@example.com`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Second',
        lastName: 'Host',
        role: 'host',
        isActive: true,
      })
      .returning();
    createdUserIds.push(secondHostRow.id);
    await db.insert(hostProfiles).values({
      userId: secondHostRow.id,
      displayName: 'Second Approved Host T7',
      slug: `t7-second-host-${runSuffix}`,
      phone: '+34 600 000 003',
      status: 'approved',
    });
    secondApprovedHostUser = {
      id: secondHostRow.id,
      email: secondHostRow.email,
      passwordHash: secondHostRow.passwordHash,
      firstName: secondHostRow.firstName ?? '',
      lastName: secondHostRow.lastName ?? '',
      role: 'host',
      isActive: secondHostRow.isActive,
      createdAt: secondHostRow.createdAt.toISOString(),
    };
  });

  beforeEach(() => {
    mockAuth.mockReset();
    resetSession();
  });

  afterEach(() => {
    resetSession();
  });

  afterAll(async () => {
    try {
      if (createdPropertyIds.length > 0) {
        await db.delete(properties).where(inArray(properties.id, createdPropertyIds));
      }
      if (createdGuideIds.length > 0) {
        await db.delete(travelGuides).where(inArray(travelGuides.id, createdGuideIds));
      }
      if (createdMediaIds.length > 0) {
        await db.delete(media).where(inArray(media.id, createdMediaIds));
      }
      if (createdUserIds.length > 0) {
        await db.delete(users).where(inArray(users.id, createdUserIds));
      }
    } finally {
      resetSession();
      if (originalUploadDir === undefined) {
        delete process.env.UPLOAD_DIR;
      } else {
        process.env.UPLOAD_DIR = originalUploadDir;
      }
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  describe('1. Sharp image processing & upload validation', () => {
    it('rejects a spoofed .jpg containing HTML/text with 400 INVALID_MIME_TYPE', async () => {
      setSessionForUser(seededAdmin);

      const spoofed = Buffer.from('<!doctype html><html><body>fake jpeg</body></html>');
      const { status, body } = await uploadAsCurrentActor(spoofed, 'fake.jpg', 'image/jpeg');

      expect(status).toBe(400);
      expect(body).toMatchObject({ code: 'INVALID_MIME_TYPE' });
    });

    it('rejects files over 5 MB with 413 FILE_TOO_LARGE and rejects oversized Content-Length early', async () => {
      setSessionForUser(seededAdmin);

      // Actual file > 5 MB (still under the 5.25 MB multipart Content-Length ceiling)
      const oversized = Buffer.alloc(MAX_UPLOAD_FILE_SIZE + 1024);
      sampleJpeg.copy(oversized, 0);
      const { status, body } = await uploadAsCurrentActor(oversized, 'huge.jpg', 'image/jpeg');

      expect(status).toBe(413);
      expect(body).toMatchObject({ code: 'FILE_TOO_LARGE' });

      // Early Content-Length check rejects before request.formData() parses body
      const earlyRejectReq = new NextRequest('http://localhost:3288/api/uploads', {
        method: 'POST',
        headers: {
          'content-length': String(MAX_UPLOAD_FILE_SIZE + 512 * 1024),
        },
        body: 'not-multipart-body',
      });
      const earlyRes = await postUploadRoute(earlyRejectReq);
      const earlyBody = (await earlyRes.json()) as ErrorBody;

      expect(earlyRes.status).toBe(413);
      expect(earlyBody.code).toBe('FILE_TOO_LARGE');
    });

    it('rejects multi-frame animated GIFs with 400 ANIMATED_GIF_NOT_ALLOWED', async () => {
      setSessionForUser(seededAdmin);

      const { status, body } = await uploadAsCurrentActor(
        sampleAnimatedGif,
        'animated-banner.gif',
        'image/gif',
      );

      expect(status).toBe(400);
      expect(body).toMatchObject({ code: 'ANIMATED_GIF_NOT_ALLOWED' });
    });

    it('converts oversized 2400x1200 JPEG with EXIF to 1600x800 WebP without EXIF or original filename', async () => {
      setSessionForUser(seededAdmin);

      const largeExifJpeg = await sharp({
        create: {
          width: 2400,
          height: 1200,
          channels: 3,
          background: { r: 210, g: 95, b: 50 },
        },
      })
        .jpeg({ quality: 85 })
        .withExif({
          IFD0: {
            Make: 'SecretCam',
            Model: 'GPS-EXIF-99',
          },
        })
        .toBuffer();

      const sourceMeta = await sharp(largeExifJpeg).metadata();
      expect(sourceMeta.exif).toBeDefined();

      const { status, body } = await uploadAsCurrentActor(
        largeExifJpeg,
        'secret-passport.jpg',
        'image/jpeg',
        'Living room view',
      );

      expect(status).toBe(201);
      expect('media' in body).toBe(true);
      const uploaded = (body as UploadSuccessBody).media;

      expect(uploaded.mimeType).toBe('image/webp');
      expect(uploaded.width).toBe(MAX_IMAGE_DIMENSION);
      expect(uploaded.height).toBe(800);
      expect(uploaded.storageKey).toMatch(/^[0-9a-f]{32}\.webp$/);
      expect(uploaded.url).toBe(`/uploads/${uploaded.storageKey}`);
      expect(uploaded.url).not.toContain('secret-passport');
      expect(uploaded.storageKey).not.toContain('secret-passport');
      expect(uploaded.alt).toBe('Living room view');

      const storedPath = resolveUploadFilePath([uploaded.storageKey]);
      expect(storedPath).not.toBeNull();
      const storedMeta = await sharp(storedPath!).metadata();
      expect(storedMeta.format).toBe('webp');
      expect(storedMeta.width).toBe(1600);
      expect(storedMeta.height).toBe(800);
      expect(storedMeta.exif).toBeUndefined();
    });

    it('converts static 1-frame GIF, PNG, and WebP to WebP and serves each via GET /uploads/[...path]', async () => {
      setSessionForUser(seededAdmin);

      const inputs = [
        { label: 'static-gif', buffer: sampleStaticGif, filename: 'icon.gif', mime: 'image/gif' },
        { label: 'png', buffer: samplePng, filename: 'desk.png', mime: 'image/png' },
        { label: 'webp', buffer: sampleWebp, filename: 'studio.webp', mime: 'image/webp' },
      ];

      for (const item of inputs) {
        const { status, body } = await uploadAsCurrentActor(item.buffer, item.filename, item.mime);
        expect(status).toBe(201);
        const uploaded = (body as UploadSuccessBody).media;
        expect(uploaded.mimeType).toBe('image/webp');
        expect(uploaded.storageKey).toMatch(/^[0-9a-f]{32}\.webp$/);

        const serveReq = new NextRequest(`http://localhost:3288${uploaded.url}`);
        const serveRes = await getUploadRoute(serveReq, {
          params: Promise.resolve({ path: [uploaded.storageKey] }),
        });

        expect(serveRes.status).toBe(200);
        expect(serveRes.headers.get('content-type')).toBe('image/webp');
        expect(serveRes.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
        expect(serveRes.headers.get('x-content-type-options')).toBe('nosniff');

        const bytes = Buffer.from(await serveRes.arrayBuffer());
        expect(bytes.length).toBe(uploaded.sizeBytes);
        expect(detectImageMimeType(bytes)).toBe('image/webp');
      }
    });
  });

  describe('2. Auth & RBAC on /api/uploads, /api/media, and /api/media/[id]', () => {
    it('returns 401 when auth() is null even if global setCurrentUserId() is set to admin', async () => {
      // Seed an existing media record so DELETE target exists
      setSessionForUser(seededAdmin);
      const seededUpload = await uploadAsCurrentActor(samplePng, 'admin-seed.png', 'image/png');
      expect(seededUpload.status).toBe(201);
      const targetId = (seededUpload.body as UploadSuccessBody).media.id;

      // Simulate global mock session being set to admin while JWT auth() is null
      await setCurrentUserId(seededAdmin.id);
      setSessionForUser(null);

      const uploadRes = await uploadAsCurrentActor(samplePng, 'unauth.png', 'image/png');
      expect(uploadRes.status).toBe(401);

      const listRes = await getMediaRoute(createMediaListRequest());
      expect(listRes.status).toBe(401);

      const delRes = await deleteMediaRoute(createMediaDeleteRequest(targetId), {
        params: Promise.resolve({ id: String(targetId) }),
      });
      expect(delRes.status).toBe(401);
    });

    it('returns 403 for guest (demo@example.com) across upload, list, and delete', async () => {
      setSessionForUser(seededAdmin);
      const adminUpload = await uploadAsCurrentActor(samplePng, 'guest-block.png', 'image/png');
      const targetId = (adminUpload.body as UploadSuccessBody).media.id;

      setSessionForUser(seededGuest);

      const uploadRes = await uploadAsCurrentActor(samplePng, 'guest.png', 'image/png');
      expect(uploadRes.status).toBe(403);

      const listRes = await getMediaRoute(createMediaListRequest());
      expect(listRes.status).toBe(403);

      const delRes = await deleteMediaRoute(createMediaDeleteRequest(targetId), {
        params: Promise.resolve({ id: String(targetId) }),
      });
      expect(delRes.status).toBe(403);
    });

    it('returns 401 for inactive admin even if JWT claims isActive=true (Risk #10)', async () => {
      setSessionForUser(seededAdmin);
      const adminUpload = await uploadAsCurrentActor(samplePng, 'risk10.png', 'image/png');
      const targetId = (adminUpload.body as UploadSuccessBody).media.id;

      // Stale JWT claims active admin, but DB row has isActive=false
      setSessionForUser(inactiveAdminUser, true);

      const uploadRes = await uploadAsCurrentActor(samplePng, 'inactive-admin.png', 'image/png');
      expect(uploadRes.status).toBe(401);

      const listRes = await getMediaRoute(createMediaListRequest());
      expect(listRes.status).toBe(401);

      const delRes = await deleteMediaRoute(createMediaDeleteRequest(targetId), {
        params: Promise.resolve({ id: String(targetId) }),
      });
      expect(delRes.status).toBe(401);
    });

    it('returns 403 for pending and suspended hosts across upload, list, and delete', async () => {
      setSessionForUser(seededAdmin);
      const adminUpload = await uploadAsCurrentActor(samplePng, 'host-status.png', 'image/png');
      const targetId = (adminUpload.body as UploadSuccessBody).media.id;

      for (const blockedHost of [pendingHostUser, suspendedHostUser]) {
        setSessionForUser(blockedHost);

        const uploadRes = await uploadAsCurrentActor(samplePng, 'blocked-host.png', 'image/png');
        expect(uploadRes.status).toBe(403);

        const listRes = await getMediaRoute(createMediaListRequest());
        expect(listRes.status).toBe(403);

        const delRes = await deleteMediaRoute(createMediaDeleteRequest(targetId), {
          params: Promise.resolve({ id: String(targetId) }),
        });
        expect(delRes.status).toBe(403);
      }
    });

    it('isolates approved host library/deletes to own uploads while active admin sees all media', async () => {
      // Admin uploads one image
      setSessionForUser(seededAdmin);
      const adminUpload = await uploadAsCurrentActor(
        samplePng,
        'admin-owned.png',
        'image/png',
        `t7-admin-owned-${runSuffix}`,
      );
      expect(adminUpload.status).toBe(201);
      const adminMedia = (adminUpload.body as UploadSuccessBody).media;

      // Second approved host uploads one image
      setSessionForUser(secondApprovedHostUser);
      const secondHostUpload = await uploadAsCurrentActor(
        samplePng,
        'second-host-owned.png',
        'image/png',
        `t7-second-host-${runSuffix}`,
      );
      expect(secondHostUpload.status).toBe(201);
      const secondHostMedia = (secondHostUpload.body as UploadSuccessBody).media;

      // Seeded approved host (host@example.com) uploads one image
      setSessionForUser(seededApprovedHost);
      const hostUpload = await uploadAsCurrentActor(
        samplePng,
        'host-owned.png',
        'image/png',
        `t7-primary-host-${runSuffix}`,
      );
      expect(hostUpload.status).toBe(201);
      const hostMedia = (hostUpload.body as UploadSuccessBody).media;
      expect(hostMedia.uploadedBy).toBe(seededApprovedHost.id);

      // Approved host GET /api/media only returns its own uploads
      const hostListRes = await getMediaRoute(createMediaListRequest(`pageSize=60&search=${runSuffix}`));
      expect(hostListRes.status).toBe(200);
      const hostList = (await hostListRes.json()) as MediaListResult;
      const hostVisibleIds = hostList.items.map((item) => item.id);

      expect(hostVisibleIds).toContain(hostMedia.id);
      expect(hostVisibleIds).not.toContain(adminMedia.id);
      expect(hostVisibleIds).not.toContain(secondHostMedia.id);
      expect(hostList.items.every((item) => item.uploadedBy === seededApprovedHost.id)).toBe(true);

      // Approved host cannot delete admin's media or another host's media
      const deleteAdminMediaRes = await deleteMediaRoute(createMediaDeleteRequest(adminMedia.id), {
        params: Promise.resolve({ id: String(adminMedia.id) }),
      });
      expect(deleteAdminMediaRes.status).toBe(403);

      const deleteOtherHostMediaRes = await deleteMediaRoute(
        createMediaDeleteRequest(secondHostMedia.id),
        { params: Promise.resolve({ id: String(secondHostMedia.id) }) },
      );
      expect(deleteOtherHostMediaRes.status).toBe(403);

      // Active admin GET /api/media sees all uploads across admin and hosts
      setSessionForUser(seededAdmin);
      const adminListRes = await getMediaRoute(
        createMediaListRequest(`pageSize=60&search=${runSuffix}`),
      );
      expect(adminListRes.status).toBe(200);
      const adminList = (await adminListRes.json()) as MediaListResult;
      const adminVisibleIds = adminList.items.map((item) => item.id);

      expect(adminVisibleIds).toContain(adminMedia.id);
      expect(adminVisibleIds).toContain(hostMedia.id);
      expect(adminVisibleIds).toContain(secondHostMedia.id);
    });
  });

  describe('3. Unused-only deletion policy (DELETE /api/media/[id])', () => {
    it('blocks deleting media referenced in properties.images, properties.description HTML, or travel_guides.cover_image with 409', async () => {
      setSessionForUser(seededAdmin);

      const [imgGallery, imgDescription, imgGuide] = await Promise.all([
        uploadAsCurrentActor(samplePng, 'prop-gallery.png', 'image/png', `t7-ref-gallery-${runSuffix}`),
        uploadAsCurrentActor(samplePng, 'prop-desc.png', 'image/png', `t7-ref-desc-${runSuffix}`),
        uploadAsCurrentActor(samplePng, 'guide-cover.png', 'image/png', `t7-ref-guide-${runSuffix}`),
      ]);

      const galleryMedia = (imgGallery.body as UploadSuccessBody).media;
      const descMedia = (imgDescription.body as UploadSuccessBody).media;
      const guideMedia = (imgGuide.body as UploadSuccessBody).media;

      const testPropId = 990_000 + Math.floor(Math.random() * 500_000);
      await db.insert(properties).values({
        id: testPropId,
        hostId: seededHostProfileId,
        reference: `T7REF-${runSuffix}`.slice(0, 50),
        title: 'T7 Referenced Apartment',
        slug: `t7-ref-apt-${runSuffix}`,
        description: `<p>Workspace photo:</p><img src="${descMedia.url}" alt="Workspace" />`,
        pricePerMonth: 280000,
        city: 'Madrid',
        country: 'Spain',
        images: [galleryMedia.url],
        status: 'draft',
      });
      createdPropertyIds.push(testPropId);

      const [insertedGuide] = await db
        .insert(travelGuides)
        .values({
          slug: `t7-ref-guide-${runSuffix}`,
          title: 'T7 Referenced Travel Guide',
          city: 'Madrid',
          coverImage: guideMedia.url,
          content: '<p>Guide body</p>',
          status: 'draft',
        })
        .returning({ id: travelGuides.id });
      createdGuideIds.push(insertedGuide.id);

      // Verify GET /api/media marks all three as in-use
      const listRes = await getMediaRoute(
        createMediaListRequest(`pageSize=60&search=t7-ref-`),
      );
      expect(listRes.status).toBe(200);
      const listBody = (await listRes.json()) as MediaListResult;
      const byId = new Map(listBody.items.map((item) => [item.id, item]));

      for (const item of [galleryMedia, descMedia, guideMedia]) {
        expect(byId.get(item.id)?.isInUse).toBe(true);
        expect(byId.get(item.id)?.usageCount).toBeGreaterThanOrEqual(1);

        const delRes = await deleteMediaRoute(createMediaDeleteRequest(item.id), {
          params: Promise.resolve({ id: String(item.id) }),
        });
        expect(delRes.status).toBe(409);

        // Record in DB and file on disk must remain intact
        const [stillInDb] = await db
          .select({ id: media.id })
          .from(media)
          .where(eq(media.id, item.id))
          .limit(1);
        expect(stillInDb?.id).toBe(item.id);

        const diskPath = resolveUploadFilePath([item.storageKey]);
        expect(diskPath).not.toBeNull();
        await expect(fs.access(diskPath!)).resolves.toBeUndefined();
      }
    });

    it('deletes unreferenced media with 200 and removes both DB record and file on disk', async () => {
      setSessionForUser(seededAdmin);

      const uploadedRes = await uploadAsCurrentActor(
        sampleJpeg,
        'unused-photo.jpg',
        'image/jpeg',
        `t7-unused-${runSuffix}`,
      );
      expect(uploadedRes.status).toBe(201);
      const unusedMedia = (uploadedRes.body as UploadSuccessBody).media;

      const diskPath = resolveUploadFilePath([unusedMedia.storageKey]);
      expect(diskPath).not.toBeNull();
      await expect(fs.access(diskPath!)).resolves.toBeUndefined();

      const delRes = await deleteMediaRoute(createMediaDeleteRequest(unusedMedia.id), {
        params: Promise.resolve({ id: String(unusedMedia.id) }),
      });
      expect(delRes.status).toBe(200);
      const delBody = (await delRes.json()) as DeleteSuccessBody;
      expect(delBody).toEqual({ ok: true, id: unusedMedia.id });

      const remaining = await db
        .select({ id: media.id })
        .from(media)
        .where(eq(media.id, unusedMedia.id));
      expect(remaining).toHaveLength(0);

      await expect(fs.access(diskPath!)).rejects.toMatchObject({ code: 'ENOENT' });

      // Deleting again returns 404; invalid ID returns 400
      const missingRes = await deleteMediaRoute(createMediaDeleteRequest(unusedMedia.id), {
        params: Promise.resolve({ id: String(unusedMedia.id) }),
      });
      expect(missingRes.status).toBe(404);

      const invalidIdRes = await deleteMediaRoute(createMediaDeleteRequest('not-an-id'), {
        params: Promise.resolve({ id: 'not-an-id' }),
      });
      expect(invalidIdRes.status).toBe(400);
    });
  });

  describe('4. sanitizeHtml() XSS hardening & image path schemas', () => {
    it('preserves benign Tiptap HTML including /uploads/, /seed/, tables, and YouTube iframes', () => {
      const safeRichHtml = [
        '<h2>Workspace Overview</h2>',
        '<p>Enjoy <strong>gigabit fiber</strong> and ergonomic seating.</p>',
        '<ul><li>Standing desk</li><li>4K monitor</li></ul>',
        '<blockquote><p>Quiet residential street.</p></blockquote>',
        '<table><thead><tr><th>Spec</th><th>Value</th></tr></thead><tbody><tr><td>Speed</td><td>1 Gbps</td></tr></tbody></table>',
        '<img src="/uploads/abc123.webp" alt="Desk">',
        '<img src="/seed/property/prop-madrid-1.webp">',
        '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>',
      ].join('');

      const cleaned = sanitizeHtml(safeRichHtml);

      expect(cleaned).toContain('<h2>Workspace Overview</h2>');
      expect(cleaned).toContain('<strong>gigabit fiber</strong>');
      expect(cleaned).toContain('<ul><li>Standing desk</li><li>4K monitor</li></ul>');
      expect(cleaned).toContain('<blockquote><p>Quiet residential street.</p></blockquote>');
      expect(cleaned).toContain('<table><thead><tr><th>Spec</th><th>Value</th></tr></thead>');
      expect(cleaned).toContain('<img src="/uploads/abc123.webp" alt="Desk">');
      expect(cleaned).toContain('<img src="/seed/property/prop-madrid-1.webp">');
      expect(cleaned).toContain(
        '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>',
      );
    });

    it('strips scripts, inline event handlers, dangerous URIs, SVG payloads, and non-YouTube iframes', () => {
      const xssPayload = [
        '<p>Safe intro</p>',
        '<script>alert("xss")</script>',
        '<scr<script>ipt>alert("nested")</scr</script>ipt>',
        '<img src=x onerror=alert(1)>',
        '<img src="javascript:alert(1)">',
        '<img src="data:image/svg+xml,<svg/>">',
        '<svg onload=alert(1)><circle r="5" /></svg>',
        '<iframe src="https://evil.com/phish"></iframe>',
      ].join('');

      const cleaned = sanitizeHtml(xssPayload);

      expect(cleaned).toContain('<p>Safe intro</p>');
      expect(cleaned).not.toMatch(/<script/i);
      expect(cleaned).not.toMatch(/onerror\s*=/i);
      expect(cleaned).not.toMatch(/onload\s*=/i);
      expect(cleaned).not.toMatch(/javascript\s*:/i);
      expect(cleaned).not.toMatch(/data\s*:\s*image\/svg\+xml/i);
      expect(cleaned).not.toMatch(/<svg/i);
      expect(cleaned).not.toContain('evil.com');
      expect(cleaned).not.toMatch(/<iframe/i);
    });

    it('validates safeImagePathSchema and normalizes optionalSafeImagePathSchema', () => {
      expect(safeImagePathSchema.safeParse('/uploads/a.webp').success).toBe(true);
      expect(safeImagePathSchema.safeParse('/seed/a.jpg').success).toBe(true);
      expect(safeImagePathSchema.safeParse('https://cdn.example.com/a.webp').success).toBe(true);

      const rejectedPaths = [
        'javascript:alert(1)',
        'data:image/png;base64,iVBORw0KGgo=',
        '/uploads/../etc/passwd',
        'http://insecure.example.com/a.jpg',
        '',
      ];

      for (const bad of rejectedPaths) {
        expect(safeImagePathSchema.safeParse(bad).success).toBe(false);
      }

      expect(optionalSafeImagePathSchema.parse('')).toBeNull();
      expect(optionalSafeImagePathSchema.parse('   ')).toBeNull();
      expect(optionalSafeImagePathSchema.parse(null)).toBeNull();
      expect(optionalSafeImagePathSchema.parse(undefined)).toBeNull();
      expect(optionalSafeImagePathSchema.parse('/uploads/a.webp')).toBe('/uploads/a.webp');
      expect(optionalSafeImagePathSchema.safeParse('javascript:alert(1)').success).toBe(false);
    });
  });
});
