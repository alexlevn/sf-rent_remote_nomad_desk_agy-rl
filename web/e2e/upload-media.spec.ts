import zlib from 'node:zlib';
import { test, expect, type Locator, type Page } from '@playwright/test';

// Precompute IEEE 802.3 CRC32 table for valid in-memory PNG generation
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createTestPngBuffer(
  width: number,
  height: number,
  rgb: readonly [number, number, number],
): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 2; // Truecolor RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x += 1) {
      const px = rowStart + 1 + x * 3;
      raw[px] = rgb[0];
      raw[px + 1] = rgb[1];
      raw[px + 2] = rgb[2];
    }
  }

  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function loginAs(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => localStorage.removeItem('nomaddesk_user'));
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('/');
}

async function expectImageLoaded(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(() =>
      locator.evaluate(
        (img) =>
          img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
}

test.describe.configure({ mode: 'serial' });

test.describe('Upload Media, Media Library, Tiptap Image, Formatted Price & Host Parity E2E', () => {
  // Shared across serial scenarios 1 and 4 to verify In-use delete protection
  let adminUploadedCoverUrl = '';

  test.beforeAll(async ({ request }) => {
    await request.post('/api/mock/reset');
  });

  test.beforeEach(() => {
    test.setTimeout(45_000);
  });

  test.afterAll(async ({ request }) => {
    await request.post('/api/mock/reset');
  });

  test('1. Admin creates property with Tiptap + uploaded cover photo + Media Library image + formatted price', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'admin@example.com', 'admin1234');

    const propertyTitle = 'Upload Media E2E Madrid Executive Loft';
    const propertySlug = 'upload-media-e2e-madrid-executive-loft';
    const coverAlt = 'Retiro penthouse sunlit workspace';

    await page.goto('/admin/properties/new');
    await expect(page.getByTestId('property-title-input')).toBeVisible();

    // Fill host, title, Madrid city, status
    await page.getByTestId('property-host-select').selectOption('1');
    await page.getByTestId('property-title-input').fill(propertyTitle);

    const citySelect = page.getByTestId('property-city-select');
    const madridOptionValue = await citySelect
      .locator('option', { hasText: /Madrid/i })
      .first()
      .getAttribute('value');
    expect(madridOptionValue).toBeTruthy();
    await citySelect.selectOption(madridOptionValue!);
    await page.getByTestId('property-status-select').selectOption('published');

    // Verify CurrencyInput formats 3990 -> 3,990 on blur
    const priceInput = page.getByTestId('property-price-input');
    await priceInput.fill('3990');
    await priceInput.blur();
    await expect(priceInput).toHaveValue('3,990');

    // Remove default seed cover photo so the uploaded WebP becomes #1 Cover
    await page.getByRole('button', { name: 'Remove photo 1' }).click();

    // Open Media Library Modal from Property Photos card and upload valid in-memory PNG
    await page.getByTestId('property-open-media-btn').click();
    const mediaModal = page.getByTestId('media-library-modal');
    await expect(mediaModal).toBeVisible();

    await mediaModal.getByLabel('Alt text (optional)').fill(coverAlt);
    await mediaModal.getByTestId('media-file-input').setInputFiles({
      name: 'madrid-loft-cover.png',
      mimeType: 'image/png',
      buffer: createTestPngBuffer(64, 48, [32, 114, 214]),
    });

    const insertSelectedBtn = mediaModal.getByTestId('media-confirm-select');
    await expect(insertSelectedBtn).toBeEnabled();
    await insertSelectedBtn.click();
    await expect(mediaModal).not.toBeVisible();

    // Verify uploaded /uploads/*.webp is now the #1 Cover photo
    const imagesList = page.getByTestId('property-images-list');
    await expect(imagesList).toContainText('Cover');
    const listText = (await imagesList.textContent()) ?? '';
    const uploadedMatch = listText.match(/\/uploads\/[a-f0-9]{32}\.webp/);
    expect(uploadedMatch).not.toBeNull();
    adminUploadedCoverUrl = uploadedMatch![0];

    // Author rich description in Tiptap Visual tab: Bold + Bullet List + Insert Image from Media Library
    const descVisual = page.getByTestId('property-description-editor-visual');
    const descEditable = descVisual.locator('[contenteditable="true"]');
    await expect(descEditable).toBeVisible();
    await descEditable.click();
    await expect(descEditable).toBeFocused();

    await page.getByRole('button', { name: 'Bold' }).first().click();
    await expect(descEditable).toBeFocused();
    await descEditable.pressSequentially('Dedicated dual-4K workspace');
    await page.getByRole('button', { name: 'Bold' }).first().click();
    await expect(descEditable).toBeFocused();
    await descEditable.pressSequentially(' overlooking Retiro Park.');
    await page.keyboard.press('Enter');

    await page.getByRole('button', { name: 'Bullet List' }).first().click();
    await expect(descEditable).toBeFocused();
    await descEditable.pressSequentially('1 Gbps symmetrical fiber');
    await page.keyboard.press('Enter');
    await descEditable.pressSequentially('Herman Miller ergonomic seating');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Insert the uploaded image from Media Library tab into Tiptap description
    await page.getByRole('button', { name: 'Insert Image' }).first().click();
    await expect(mediaModal).toBeVisible();
    await mediaModal.getByTestId('media-tab-library').click();

    const libraryCard = mediaModal
      .locator('[data-testid^="media-item-"]')
      .filter({ hasText: coverAlt })
      .first();
    await expect(libraryCard).toBeVisible();
    await libraryCard.locator('button').first().click();

    const insertEditorImgBtn = mediaModal.getByTestId('media-confirm-select');
    await expect(insertEditorImgBtn).toBeEnabled();
    await insertEditorImgBtn.click();
    await expect(mediaModal).not.toBeVisible();

    await expect(
      descVisual.locator(`img[src="${adminUploadedCoverUrl}"]`),
    ).toBeVisible();

    // Save property
    await page.getByTestId('property-submit-btn').click();
    await expect(page).toHaveURL('/admin/properties');

    // Verify on Madrid city page: cover image loads and price displays $3,990
    await page.goto('/c/furnished-apartments-madrid');
    const createdCard = page
      .locator('article')
      .filter({ hasText: propertyTitle })
      .first();
    await expect(createdCard).toBeVisible();
    await expect(createdCard).toContainText('$3,990');
    await expectImageLoaded(
      createdCard.locator(`img[src="${adminUploadedCoverUrl}"]`).first(),
    );

    // Verify on public apartment detail page: cover image, $3,990, bold, list, and embedded description image
    const detailRes = await page.goto(`/l/apartments/${propertySlug}`);
    expect(detailRes?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: propertyTitle })).toBeVisible();
    await expect(page.getByTestId('booking-widget')).toContainText('$3,990');
    await expectImageLoaded(
      page.locator(`img[src="${adminUploadedCoverUrl}"]`).first(),
    );

    const aboutHomeSection = page
      .getByRole('heading', { level: 2, name: 'About This Home' })
      .locator('xpath=..');
    await expect(
      aboutHomeSection.locator('strong', {
        hasText: 'Dedicated dual-4K workspace',
      }),
    ).toBeVisible();
    await expect(
      aboutHomeSection.locator('li', { hasText: '1 Gbps symmetrical fiber' }),
    ).toBeVisible();
    await expect(
      aboutHomeSection.locator('li', {
        hasText: 'Herman Miller ergonomic seating',
      }),
    ).toBeVisible();
    await expectImageLoaded(
      aboutHomeSection.locator(`img[src="${adminUploadedCoverUrl}"]`),
    );
  });

  test('2. Editing legacy property price only preserves original description HTML byte-for-byte', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'admin@example.com', 'admin1234');

    await page.goto('/admin/properties/16060/edit');
    await expect(
      page.getByTestId('property-description-editor-visual'),
    ).toBeVisible();

    // Read original description HTML via HTML mode, then return to Editor tab untouched
    await page.getByRole('tab', { name: 'HTML' }).first().click();
    const originalHtml = await page
      .getByTestId('property-description-editor-html')
      .inputValue();
    expect(originalHtml.length).toBeGreaterThan(0);

    await page.getByRole('tab', { name: 'Editor' }).first().click();
    await expect(
      page.getByTestId('property-description-editor-visual'),
    ).toBeVisible();

    // Capture original price so seed data can be restored cleanly after assertion
    const priceInput = page.getByTestId('property-price-input');
    const originalPriceFormatted = await priceInput.inputValue();
    const originalPriceDigits = originalPriceFormatted.replace(/,/g, '');
    const updatedPriceDigits = originalPriceDigits === '12500' ? '12000' : '12500';
    const updatedPriceFormatted =
      Number(updatedPriceDigits).toLocaleString('en-US');

    // Modify only monthly rent
    await priceInput.fill(updatedPriceDigits);
    await priceInput.blur();
    await expect(priceInput).toHaveValue(updatedPriceFormatted);

    await page.getByTestId('property-submit-btn').click();
    await expect(page).toHaveURL('/admin/properties');

    // Re-open property 16060 and verify original HTML is byte-for-byte identical
    await page.goto('/admin/properties/16060/edit');
    await expect(page.getByTestId('property-price-input')).toHaveValue(
      updatedPriceFormatted,
    );

    await page.getByRole('tab', { name: 'HTML' }).first().click();
    const reloadedHtml = await page
      .getByTestId('property-description-editor-html')
      .inputValue();
    expect(reloadedHtml).toBe(originalHtml);

    // Restore seed price so downstream Vitest / E2E suites see exact seed state
    await page.getByTestId('property-price-input').fill(originalPriceDigits);
    await page.getByTestId('property-submit-btn').click();
    await expect(page).toHaveURL('/admin/properties');
  });

  test('3. Uploading fake .jpg file displays clear English error alert without crashing', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'admin@example.com', 'admin1234');

    await page.goto('/admin/properties/new');
    await page.getByTestId('property-open-media-btn').click();

    const mediaModal = page.getByTestId('media-library-modal');
    await expect(mediaModal).toBeVisible();

    await mediaModal.getByTestId('media-file-input').setInputFiles({
      name: 'spoofed-text-file.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('Plain text pretending to be a JPEG image'),
    });

    const errorBanner = mediaModal.getByTestId('media-upload-error');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toHaveAttribute('role', 'alert');
    await expect(errorBanner).toContainText(
      /unsupported|invalid|corrupt|image|file/i,
    );

    // App stays interactive and modal closes cleanly
    await page.keyboard.press('Escape');
    await expect(mediaModal).not.toBeVisible();
    await expect(page.getByTestId('property-title-input')).toBeVisible();
  });

  test('4. Admin /admin/media protects in-use media and deletes unused media with 404 verification', async ({
    page,
    request,
  }) => {
    expect(adminUploadedCoverUrl).toMatch(/^\/uploads\/[a-f0-9]{32}\.webp$/);

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'admin@example.com', 'admin1234');

    await page.goto('/admin/media');
    await expect(page.getByTestId('media-manager')).toBeVisible();

    // Asset from Scenario 1 must show "In use" badge and have Delete disabled
    const inUseCard = page
      .locator('article[data-testid^="media-item-"]')
      .filter({ hasText: adminUploadedCoverUrl })
      .first();
    await expect(inUseCard).toBeVisible();
    await expect(inUseCard).toContainText(/In use/i);
    await expect(
      inUseCard.getByRole('button', { name: 'Delete media' }),
    ).toBeDisabled();

    // Upload a brand-new unused PNG on /admin/media
    const unusedAlt = 'Unused E2E cleanup asset';
    await page.getByLabel('Alt text (optional)').fill(unusedAlt);
    await page.getByTestId('media-file-input').setInputFiles({
      name: 'unused-cleanup.png',
      mimeType: 'image/png',
      buffer: createTestPngBuffer(48, 48, [34, 160, 107]),
    });

    await expect(page.getByTestId('media-upload-success')).toBeVisible();

    const unusedCard = page
      .locator('article[data-testid^="media-item-"]')
      .filter({ hasText: unusedAlt })
      .first();
    await expect(unusedCard).toBeVisible();
    await expect(unusedCard).toContainText('Unused');

    const unusedCardText = (await unusedCard.textContent()) ?? '';
    const unusedUrlMatch = unusedCardText.match(/\/uploads\/[a-f0-9]{32}\.webp/);
    expect(unusedUrlMatch).not.toBeNull();
    const deletedUrl = unusedUrlMatch![0];

    // Confirm uploaded file is served before deletion
    const beforeDeleteRes = await request.get(deletedUrl);
    expect(beforeDeleteRes.status()).toBe(200);
    expect(beforeDeleteRes.headers()['content-type']).toContain('image/webp');

    // Delete unused media -> disappears from grid and returns 404
    const deleteBtn = unusedCard.getByRole('button', { name: 'Delete media' });
    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();

    await expect(unusedCard).not.toBeVisible();

    const afterDeleteRes = await request.get(deletedUrl);
    expect(afterDeleteRes.status()).toBe(404);
  });

  test('5. Host Portal parity: upload photo + Tiptap + formatted price on /host/listings/new and avatar upload on /host/profile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Use real seed password so Auth.js issues an HttpOnly JWT cookie for /api/uploads and /api/media
    await loginAs(page, 'host@example.com', 'host1234');

    const listingTitle = 'Host Media Parity E2E Studio Chamberi';

    await page.goto('/host/listings/new');
    await expect(page.locator('#listing-title')).toBeVisible();

    await page.locator('#listing-title').fill(listingTitle);
    await page.locator('#listing-neighborhood').fill('Chamberi');

    // Author description via Tiptap Visual editor
    const descEditable = page.locator('#listing-description');
    await expect(descEditable).toBeVisible();
    await descEditable.click();
    await expect(descEditable).toBeFocused();
    await page.getByRole('button', { name: 'Bold' }).first().click();
    await expect(descEditable).toBeFocused();
    await descEditable.pressSequentially('Verified remote studio');
    await page.getByRole('button', { name: 'Bold' }).first().click();
    await expect(descEditable).toBeFocused();
    await descEditable.pressSequentially(
      ' with sunlit dual-monitor desk and quiet terrace.',
    );

    // Upload a photo via Host Media Library Modal
    await page.getByTestId('host-open-media-btn').click();
    const mediaModal = page.getByTestId('media-library-modal');
    await expect(mediaModal).toBeVisible();

    await mediaModal.getByLabel('Alt text (optional)').fill('Host studio photo');
    await mediaModal.getByTestId('media-file-input').setInputFiles({
      name: 'host-studio.png',
      mimeType: 'image/png',
      buffer: createTestPngBuffer(64, 48, [180, 83, 9]),
    });

    const confirmHostPhotoBtn = mediaModal.getByTestId('media-confirm-select');
    await expect(confirmHostPhotoBtn).toBeEnabled();
    await confirmHostPhotoBtn.click();
    await expect(mediaModal).not.toBeVisible();

    await expect(
      page.locator('[data-testid^="host-photo-card-"] img[src*="/uploads/"]'),
    ).toBeVisible();

    // Fill formatted monthly price (2950 -> 2,950)
    const hostPriceInput = page.getByTestId('host-price-input');
    await hostPriceInput.fill('2950');
    await hostPriceInput.blur();
    await expect(hostPriceInput).toHaveValue('2,950');

    // Submit for Review
    await page.getByRole('button', { name: /Submit for Review/i }).click();
    await page.waitForURL('/host/listings');

    const submittedRow = page.locator('tr').filter({ hasText: listingTitle });
    await expect(submittedRow).toBeVisible();
    await expect(submittedRow.getByText(/Pending review/i)).toBeVisible();

    // Upload host avatar on /host/profile and verify preview + persistence
    await page.goto('/host/profile');
    await expect(page.getByTestId('host-avatar-picker-open-btn')).toBeVisible();
    await page.getByTestId('host-avatar-picker-open-btn').click();
    await expect(mediaModal).toBeVisible();

    await mediaModal
      .getByLabel('Alt text (optional)')
      .fill('Casa Urbana host avatar');
    await mediaModal.getByTestId('media-file-input').setInputFiles({
      name: 'host-avatar.png',
      mimeType: 'image/png',
      buffer: createTestPngBuffer(64, 64, [15, 118, 110]),
    });

    // Single-select ImagePickerField closes the modal automatically on upload
    await expect(mediaModal).not.toBeVisible();

    const avatarUrl = await page
      .getByTestId('host-avatar-picker-input')
      .inputValue();
    expect(avatarUrl).toMatch(/^\/uploads\/[a-f0-9]{32}\.webp$/);

    const previewAvatar = page.getByTestId('host-profile-preview-avatar');
    await expectImageLoaded(previewAvatar);
    await expect(previewAvatar).toHaveAttribute(
      'src',
      new RegExp(`${avatarUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    );

    const saveSuccessAlert = page.getByText(/Host profile updated successfully/i);
    await page.getByRole('button', { name: 'Save Profile', exact: true }).click();
    await expect(saveSuccessAlert).toBeVisible();

    // Dismiss the first banner so the second save assertion waits for the clear action to finish
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await expect(saveSuccessAlert).not.toBeVisible();

    // Clear temporary E2E avatar so Host 1 does not retain a deleted /uploads/ URL after afterAll reset
    await page.getByTestId('host-avatar-picker-clear-btn').click();
    await expect(page.getByTestId('host-avatar-picker-input')).toHaveValue('');
    await page.getByRole('button', { name: 'Save Profile', exact: true }).click();
    await expect(saveSuccessAlert).toBeVisible();
  });

  test('6. Responsive & keyboard check at 768px viewport: no horizontal overflow and Escape closes Media Library Modal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await loginAs(page, 'admin@example.com', 'admin1234');

    await page.goto('/admin/properties/new');
    await expect(page.getByTestId('property-title-input')).toBeVisible();

    const pageMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(pageMetrics.scrollWidth).toBeLessThanOrEqual(
      pageMetrics.clientWidth + 2,
    );

    await page.getByTestId('property-open-media-btn').click();
    const mediaModal = page.getByTestId('media-library-modal');
    await expect(mediaModal).toBeVisible();

    const modalMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(modalMetrics.scrollWidth).toBeLessThanOrEqual(
      modalMetrics.clientWidth + 2,
    );

    // Keyboard tab switch & Escape dismiss
    const uploadTab = mediaModal.getByTestId('media-tab-upload');
    await uploadTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(mediaModal.getByTestId('media-tab-library')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.keyboard.press('Escape');
    await expect(mediaModal).not.toBeVisible();
  });
});
