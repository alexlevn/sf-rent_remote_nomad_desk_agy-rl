import { test, expect } from '@playwright/test';

// Helper to format ISO date string (YYYY-MM-DD) offset by offsetDays from today
function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

test.describe.configure({ mode: 'serial' });

test.describe('City Search & Filters E2E Suite', () => {
  test.beforeEach(async ({ request }) => {
    // Reset mock store before each test for clean isolation
    await request.post('/api/mock/reset');
  });

  test('AC-LIST-1 (Split-view Desktop): Viewport 1440px displays split-view layout with left list (~55%) and right interactive map (~45%) with price pins', async ({
    page,
  }) => {
    // 1. Set desktop 1440px viewport and navigate to Madrid apartments page
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/c/furnished-apartments-madrid');

    // 2. Locate split-view container
    const splitView = page.locator('.split-view');
    await expect(splitView).toBeVisible();

    // 3. Verify Left Column (Listing List ~55%)
    const listingList = page.locator('.listing-list');
    await expect(listingList).toBeVisible();
    await expect(listingList).toHaveClass(/lg:w-\[55%\]/);

    // Verify apartment cards in left column
    const cards = listingList.locator('article.card-property');
    await expect(cards.first()).toBeVisible();
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(2);

    // 4. Verify Right Column (Interactive Map ~45%)
    const listingMap = page.locator('.listing-map');
    await expect(listingMap).toBeVisible();
    await expect(listingMap).toHaveClass(/lg:w-\[45%\]/);

    // Check columns appear side-by-side on desktop
    const listBox = await listingList.boundingBox();
    const mapBox = await listingMap.boundingBox();
    expect(listBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    if (listBox && mapBox) {
      expect(mapBox.x).toBeGreaterThan(listBox.x);
    }

    // 5. Verify interactive map displays price pins
    const pins = listingMap.locator('button.map-pin');
    await expect(pins.first()).toBeVisible();
    const pinCount = await pins.count();
    expect(pinCount).toBeGreaterThanOrEqual(2);

    // Verify pins show price format ($X,XXX)
    for (let i = 0; i < pinCount; i++) {
      const pinText = await pins.nth(i).textContent();
      expect(pinText).toMatch(/\$\d+/);
    }
  });

  test('AC-LIST-2 (Bộ lọc tiện ích): Selecting Bedrooms = 2 displays only 2-bedroom apartments, URL has ?bedrooms=2', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/c/furnished-apartments-madrid');

    // 1. Initial state: both Jerónimos (3 BR) and Chamberí (2 BR) are visible
    const jeronimosCard = page.locator('[data-property-id="16060"]');
    const chamberiCard = page.locator('[data-property-id="16061"]');
    await expect(jeronimosCard).toBeVisible();
    await expect(chamberiCard).toBeVisible();

    // 2. Click Bedrooms filter button in filter bar
    const bedroomsButton = page.getByRole('button', { name: /Bedrooms \(Any\)/i });
    await expect(bedroomsButton).toBeVisible();
    await bedroomsButton.click();

    // 3. Select 2 Bedrooms option from popover
    const option2BR = page.getByRole('button', { name: '2 Bedrooms' });
    await expect(option2BR).toBeVisible();
    await option2BR.click();

    // 4. Verify URL contains query param bedrooms=2
    await expect(page).toHaveURL(/bedrooms=2/);

    // 5. Verify list shows only 2-bedroom apartments
    await expect(chamberiCard).toBeVisible();
    await expect(jeronimosCard).not.toBeVisible();

    // Verify filter button label updated
    await expect(page.getByRole('button', { name: /Bedrooms: 2/i })).toBeVisible();

    // Verify map pins updated to only 1 pin (Chamberí)
    const activePin = page.locator('[data-pin-property-id="16061"]');
    const hiddenPin = page.locator('[data-pin-property-id="16060"]');
    await expect(activePin).toBeVisible();
    await expect(hiddenPin).not.toBeVisible();
  });

  test('AC-LIST-3 (Chuyển đổi tiền tệ): Switching currency to EUR (€) updates apartment cards and map pins to € with converted rates', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/c/furnished-apartments-madrid');

    // 1. Verify initial currency is USD ($)
    const header = page.locator('header');
    await expect(header).toBeVisible();
    const usdIndicator = header.getByText('USD', { exact: true });
    await expect(usdIndicator).toBeVisible();

    // 2. Open header currency dropdown
    await usdIndicator.click();

    // 3. Select EUR (€) option
    const eurButton = header.getByRole('button', { name: /EUR \(€\)/i });
    await expect(eurButton).toBeVisible();
    await eurButton.click();

    // 4. Verify apartment cards prices display € symbol (auto-retrying assertion)
    const card16060Price = page
      .locator('[data-property-id="16060"] .card-body span.font-bold')
      .first();
    const card16061Price = page
      .locator('[data-property-id="16061"] .card-body span.font-bold')
      .first();

    await expect(card16060Price).toContainText('€');
    await expect(card16060Price).not.toContainText('$');
    await expect(card16061Price).toContainText('€');
    await expect(card16061Price).not.toContainText('$');

    // 5. Verify map pins display € symbol (auto-retrying assertion)
    const pin16060 = page.locator('.listing-map [data-pin-property-id="16060"]').first();
    const pin16061 = page.locator('.listing-map [data-pin-property-id="16061"]').first();

    await expect(pin16060).toBeVisible();
    await expect(pin16060).toContainText('€');
    await expect(pin16060).not.toContainText('$');
    await expect(pin16061).toBeVisible();
    await expect(pin16061).toContainText('€');
    await expect(pin16061).not.toContainText('$');
  });

  test('AC-LIST-4 (Toggle Bản đồ trên Mobile 390px): Viewport 390px displays floating "Map" button, clicking toggles full-screen map', async ({
    page,
  }) => {
    // 1. Set mobile viewport 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/c/furnished-apartments-madrid');

    // 2. Desktop map column is hidden
    const desktopMap = page.locator('.listing-map');
    await expect(desktopMap).not.toBeVisible();

    // 3. Floating "Map" button (FAB) is visible at bottom
    const mapFab = page.locator('button.map-fab');
    await expect(mapFab).toBeVisible();
    await expect(mapFab).toContainText('Map');

    // 4. Click "Map" FAB button to open fullscreen map
    await mapFab.click();

    // 5. Fullscreen map container is visible
    const fullscreenOverlay = page.locator('.fixed.inset-0.z-50');
    await expect(fullscreenOverlay).toBeVisible();

    // Pins are interactive on mobile fullscreen map
    const mobilePins = fullscreenOverlay.locator('button.map-pin');
    await expect(mobilePins.first()).toBeVisible();

    // 6. Close button "← List" is visible
    const closeBtn = page.locator('button.map-close');
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toContainText('List');

    // 7. Click close button and verify return to listings list
    await closeBtn.click();
    await expect(fullscreenOverlay).not.toBeVisible();
    await expect(page.locator('article.card-property').first()).toBeVisible();
  });

  test('AC-LIST-5 (Chỉ hiện căn còn trống): Date range overlapping confirmed seed reservation hides booked apartment; clearing dates restores it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Seed reservation ND-SEED2 (Property 16061 Chamberí) is confirmed for T+20 -> T+50
    // We query with dates T+25 -> T+35, which falls entirely within ND-SEED2's reservation window
    const moveIn = getOffsetDateStr(25);
    const moveOut = getOffsetDateStr(35);

    // 1. Open Madrid with overlapping dates
    await page.goto(`/c/furnished-apartments-madrid?move_in=${moveIn}&move_out=${moveOut}`);

    // 2. Property 16061 (Chamberí) has a confirmed reservation during this window -> MUST be hidden
    const chamberiCard = page.locator('[data-property-id="16061"]');
    await expect(chamberiCard).not.toBeVisible();

    // 3. Property 16060 (Jerónimos) has no confirmed reservation during this window -> MUST be visible
    const jeronimosCard = page.locator('[data-property-id="16060"]');
    await expect(jeronimosCard).toBeVisible();

    // Also verify map pins reflect availability (only 16060 pin visible)
    await expect(page.locator('[data-pin-property-id="16061"]')).not.toBeVisible();
    await expect(page.locator('[data-pin-property-id="16060"]')).toBeVisible();

    // 4. Open without dates parameters -> both properties become visible again
    await page.goto('/c/furnished-apartments-madrid');
    await expect(page.locator('[data-property-id="16061"]')).toBeVisible();
    await expect(page.locator('[data-property-id="16060"]')).toBeVisible();
  });

  test('AC-LIST-6 (Chỉ hiện tin đã duyệt): Draft, pending_review, or hidden apartments do not appear on city page and return 404 on slug', async ({
    page,
    request,
  }) => {
    // 1. Direct navigation to non-existent or unpublished property returns 404
    const notFoundRes = await page.goto('/l/apartments/non-existent-draft-listing-slug');
    expect(notFoundRes?.status()).toBe(404);

    // 2. Authenticate as Host via Auth.js credentials and visit Host Listings
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.removeItem('nomaddesk_user'));
    await page.getByLabel(/email address/i).fill('host@example.com');
    await page.getByLabel(/password/i).fill('host1234');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('/');

    await page.goto('/host/listings');

    // 3. Find Chamberí property (16061) and click "Hide" button
    const chamberiRow = page.locator('tr').filter({ hasText: /Chamberí|Spacious Madrid Flat/i });
    await expect(chamberiRow).toBeVisible();

    const hideButton = chamberiRow.getByRole('button', { name: /Hide/i });
    await expect(hideButton).toBeVisible();
    await hideButton.click();

    // Wait for row status to update to hidden
    await expect(chamberiRow.getByText('Hidden', { exact: true })).toBeVisible();

    // 4. Navigate to public city page /c/furnished-apartments-madrid
    await page.goto('/c/furnished-apartments-madrid');

    // Hidden apartment 16061 must NOT appear on public city list or map
    await expect(page.locator('[data-property-id="16061"]')).not.toBeVisible();
    await expect(page.locator('[data-pin-property-id="16061"]')).not.toBeVisible();

    // Published apartment 16060 must still be visible
    await expect(page.locator('[data-property-id="16060"]')).toBeVisible();

    // 5. Direct navigation to hidden property's slug returns 404
    const hiddenSlugRes = await page.goto(
      '/l/apartments/spacious-madrid-flat-with-dedicated-home-office'
    );
    expect(hiddenSlugRes?.status()).toBe(404);

    // 6. Reset mock store for subsequent runs
    await request.post('/api/mock/reset');
  });
});
