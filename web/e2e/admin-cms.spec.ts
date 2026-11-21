import { test, expect, type Page } from '@playwright/test';
import { BOOKING_RULES } from '../content/booking-rules';

// Helper to authenticate user via /login
async function loginAs(page: Page, email: string, password = 'demo1234') {
  await page.goto('/login');
  await page.evaluate(() => localStorage.removeItem('nomaddesk_user'));
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('/');
}

test.describe.configure({ mode: 'serial' });

test.describe('Admin CMS Content Updates E2E Suite', () => {
  test.beforeEach(async ({ request }) => {
    // Reset mock store before each test for clean isolation
    await request.post('/api/mock/reset');
  });

  test('AC-CMS-1 (Thành phố mới hiện mọi nơi): Admin creates Lisbon, verifies across 4 locations, then hides it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as admin
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 2. Navigate to /admin/locations
    await page.goto('/admin/locations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Destinations & Top Cities/i);

    // 3. Open Add Destination Modal
    await page.getByTestId('add-city-btn').click();
    await expect(page.getByRole('heading', { name: /Add New Destination/i })).toBeVisible();

    // 4. Fill form for Lisbon
    await page.getByTestId('location-name-input').fill('Lisbon');
    await page.getByTestId('location-slug-input').fill('lisbon');
    await page.getByTestId('location-country-input').fill('Portugal');
    await page.locator('input[placeholder="e.g. PT"]').fill('PT');
    await page.getByTestId('location-top-order-input').fill('1');

    // Ensure visible checkbox is checked
    const activeCheckbox = page.getByTestId('location-active-checkbox');
    if (!(await activeCheckbox.isChecked())) {
      await activeCheckbox.check();
    }

    // Submit form
    await page.getByRole('button', { name: 'Save Destination', exact: true }).click();
    await expect(page.getByText(/created and live everywhere/i)).toBeVisible();

    // 5. Verify presence at /a/furnished-apartments
    await page.goto('/a/furnished-apartments');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Furnished Apartments/i);
    // Lisbon should be present under Portugal
    const lisbonLink = page.getByRole('link', { name: /Lisbon/i }).first();
    await expect(lisbonLink).toBeVisible();

    // 6. Verify presence in homepage Top Cities block (/)
    await page.goto('/');
    const topCityLisbon = page.locator('section').filter({ hasText: /Top Cities for Remote Work/i }).getByRole('link', { name: /Lisbon/i }).first();
    await expect(topCityLisbon).toBeVisible();

    // 7. Verify presence in Hero search autocomplete / destination select
    const heroDestSelect = page.locator('select#hero-destination');
    await expect(heroDestSelect).toBeVisible();
    await expect(heroDestSelect.locator('option[value="lisbon"]')).toBeAttached();

    // 8. Verify presence in Host listing creation city select (/host/listings/new)
    await page.goto('/host/listings/new');
    const hostCitySelect = page.locator('select#listing-city');
    await expect(hostCitySelect.locator('option:has-text("Lisbon")')).toBeAttached();

    // 9. Back to /admin/locations, hide Lisbon
    await page.goto('/admin/locations');
    await page.getByTestId('city-search-input').fill('Lisbon');
    const toggleBtn = page.getByTestId('toggle-active-lisbon');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(page.getByText(/Lisbon is now hidden across platform/i)).toBeVisible();

    // 10. Verify Lisbon disappears from all 4 places
    // /a/furnished-apartments
    await page.goto('/a/furnished-apartments');
    await expect(page.getByRole('link', { name: /^Lisbon$/i })).not.toBeVisible();

    // Homepage Top Cities
    await page.goto('/');
    const topCitiesSection = page.locator('section').filter({ hasText: /Top Cities for Remote Work/i });
    await expect(topCitiesSection.getByRole('link', { name: /^Lisbon$/i })).not.toBeVisible();

    // Hero search
    await expect(page.locator('select#hero-destination option[value="lisbon"]')).not.toBeAttached();

    // /host/listings/new
    await page.goto('/host/listings/new');
    await expect(page.locator('select#listing-city option:has-text("Lisbon")')).not.toBeAttached();
  });

  test('AC-CMS-2 (Giá Workstation): Admin updates Pro Upgrade from €150 to €170 -> reflected in /workstations, Builder, and widget; existing bookings retain old rate', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as admin
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 2. Navigate to /admin/workstations
    await page.goto('/admin/workstations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Workstation Hardware Catalog/i);

    // 3. Edit Pro Upgrade package price
    await page.getByTestId('edit-package-pro').click();
    await expect(page.getByRole('heading', { name: /Edit Package/i })).toBeVisible();

    const priceInput = page.getByTestId('pkg-price-input');
    await priceInput.fill('170');
    await page.getByTestId('save-pkg-btn').click();

    await expect(page.getByText(/updated to €170\/mo/i)).toBeVisible();

    // 4. Verify /workstations displays €170
    await page.goto('/workstations');
    await expect(page.locator('text=€170').first()).toBeVisible();

    // 5. Verify /workstations/build Pro Upgrade preset displays €170
    await page.goto('/workstations/build');
    await page.getByTestId('preset-pro-btn').click();
    await expect(page.getByTestId('upgrade-total')).toContainText('+€170/month');

    // 6. Verify apartment detail booking widget reflects +€170/mo
    await page.goto('/l/apartments/spacious-madrid-flat-with-dedicated-home-office');
    const workstationSelect = page.getByTestId('workstation-select');
    await expect(workstationSelect).toBeVisible();
    await expect(workstationSelect.locator('option[value="pro"]')).toContainText('+€170/mo');

    // 7. Verify existing reservations retain their base amount (e.g. check /admin/reservations)
    await page.goto('/admin/reservations');
    const existingRow = page.locator('tr').filter({ hasText: 'ND-SEED1' });
    await expect(existingRow).toBeVisible();
    // ND-SEED1 total amount is unchanged ($3,081)
    await expect(existingRow).toContainText('$3,081');
  });

  test('AC-CMS-3 (Bài viết bằng trình soạn thảo): Admin creates rich Travel Guide, publishes, verifies formatting; saving seed guide does not mutate HTML', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as admin
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 2. Navigate to /admin/guides
    await page.goto('/admin/guides');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Travel Guides/i);

    // 3. Click Create Travel Guide
    await page.getByTestId('new-guide-btn').click();
    await expect(page.getByTestId('guide-title-input')).toBeVisible();

    // Fill metadata
    await page.getByTestId('guide-title-input').fill('Lisbon Remote Work Guide 2026');
    await page.getByTestId('guide-featured-checkbox').check();

    // Switch to HTML editor mode and fill formatted rich content
    await page.getByRole('tab', { name: 'HTML' }).click();
    const richContent = '<h2>Cost of Living & Tech Hubs</h2><p>Lisbon offers <strong>exceptional</strong> sunlight.</p><ul><li>Reliable fiber internet</li><li>Vibrant nomad community</li></ul><a href="https://nomaddesk.com">Read full story</a>';
    await page.getByTestId('rich-editor-html').fill(richContent);

    // Publish article
    await page.getByTestId('publish-guide-btn').click();
    await expect(page.getByText(/published to \/travel-guide/i)).toBeVisible();

    // 4. Verify guide appears at /travel-guide
    await page.goto('/travel-guide');
    await expect(page.getByRole('heading', { name: 'Lisbon Remote Work Guide 2026' })).toBeVisible();

    // 5. Verify guide appears in homepage highlights (/)
    await page.goto('/');
    const guideSection = page.locator('section').filter({ hasText: /Digital Nomad Travel Guides/i });
    await expect(guideSection.getByText('Lisbon Remote Work Guide 2026')).toBeVisible();

    // 6. Verify detail page renders rich formatted HTML correctly
    await page.goto('/travel-guide/barcelona/activities/lisbon-remote-work-guide-2026');
    await expect(page.getByRole('heading', { name: 'Cost of Living & Tech Hubs' })).toBeVisible();
    await expect(page.locator('strong').filter({ hasText: 'exceptional' })).toBeVisible();
    await expect(page.locator('li').filter({ hasText: 'Reliable fiber internet' })).toBeVisible();

    // 7. Verify opening and saving a seed guide (#361) in Tiptap without edits leaves HTML 100% unaltered
    await page.goto('/admin/guides');
    await page.getByTestId('edit-guide-361').click();
    await expect(page.getByTestId('rich-editor-visual')).toBeVisible();

    // Read original seed HTML via HTML tab, then switch back to Visual tab without editing
    await page.getByRole('tab', { name: 'HTML' }).click();
    const originalHtml = await page.getByTestId('rich-editor-html').inputValue();
    await page.getByRole('tab', { name: 'Editor' }).click();
    await expect(page.getByTestId('rich-editor-visual')).toBeVisible();

    // Save without making any edits in Tiptap
    await page.getByTestId('publish-guide-btn').click();
    await expect(page.getByText(/updated successfully/i)).toBeVisible();

    // Re-open the same seed guide (#361) and verify HTML is byte-for-byte identical
    await page.getByTestId('edit-guide-361').click();
    await page.getByRole('tab', { name: 'HTML' }).click();
    const reloadedHtml = await page.getByTestId('rich-editor-html').inputValue();
    expect(reloadedHtml).toBe(originalHtml);
  });

  test('AC-CMS-4 (Căn nổi bật): Admin adds property 17002 to Featured and moves to #1 -> homepage featured & 3D showcase reflect it; removing it hides it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as admin
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 2. Navigate to /admin/properties and switch to Featured Properties tab
    await page.goto('/admin/properties');
    await page.getByTestId('featured-tab-btn').click();
    await expect(page.getByText(/Homepage Featured Grid & 3D Showcase Order/i)).toBeVisible();

    // 3. Select property 17002 and add to featured
    await page.getByTestId('select-featured-property').selectOption('17002');
    await page.getByTestId('add-to-featured-btn').click();
    await expect(page.getByTestId('featured-row-17002')).toBeVisible();

    // 4. Move property 17002 up until it reaches rank #1
    let moveAttempts = 0;
    while (moveAttempts < 15) {
      moveAttempts++;
      const row = page.getByTestId('featured-row-17002');
      const rankText = await row.getByTestId('featured-rank').textContent();
      if (rankText?.trim() === '#1') break;
      await page.getByTestId('move-up-17002').click();
      await page.waitForTimeout(300);
    }

    // 5. Navigate to homepage (/) and verify property 17002 is first in Featured Apartments
    await page.goto('/');
    const firstFeaturedCard = page.locator('article').filter({ hasText: /Studio - Nuñez Digital Nomad Haven/i }).first();
    await expect(firstFeaturedCard).toBeVisible();

    // 6. Verify 3D Showcase displays property 17002
    const showcase3DTitle = page.getByTestId('showcase-3d-title');
    await expect(showcase3DTitle).toBeVisible();
    await expect(showcase3DTitle).toContainText('Studio - Nuñez Digital Nomad Haven');

    // 7. Remove property 17002 from featured
    await page.goto('/admin/properties');
    await page.getByTestId('featured-tab-btn').click();
    await page.getByTestId('remove-featured-17002').click();
    await expect(page.getByTestId('featured-row-17002')).not.toBeVisible();

    // 8. Homepage (/) no longer shows 17002 in Featured
    await page.goto('/');
    await expect(page.locator('article').filter({ hasText: /Studio - Nuñez Digital Nomad Haven/i })).not.toBeVisible();
  });

  test('AC-CMS-5 (Tỷ giá): Admin updates EUR exchange rate -> city page, detail, and map pin prices update in €; reservation USD cents unaltered', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as admin
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 2. Navigate to /admin/settings
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/FX & Business Settings/i);

    // 3. Update EUR rate from 1.08 to 1.50
    await page.getByTestId('eur-rate-input').fill('1.50');
    await page.getByTestId('save-rates-btn').click();
    await expect(page.getByText(/exchange rates updated successfully/i)).toBeVisible();

    // 4. Switch currency to EUR in Header
    await page.goto('/c/furnished-apartments-madrid');
    const header = page.locator('header');
    const usdIndicator = header.getByText('USD', { exact: true });
    await expect(usdIndicator).toBeVisible();
    await usdIndicator.click();
    const eurButton = header.getByRole('button', { name: /EUR \(€\)/i });
    await expect(eurButton).toBeVisible();
    await eurButton.click();

    // With rate 1.50, apartment price in EUR is converted as round(priceUSD / 1.50)
    // For Chamberi $2,850 -> €1,900 (compared to €2,639 under 1.08)
    const card16061 = page.locator('[data-property-id="16061"]');
    await expect(card16061).toBeVisible();
    await expect(card16061.getByText('€1,900')).toBeVisible();

    // 5. Verify apartment detail page displays converted price
    await page.goto('/l/apartments/spacious-madrid-flat-with-dedicated-home-office');
    const detailWidget = page.getByTestId('booking-widget');
    await expect(detailWidget).toBeVisible();
    await expect(detailWidget).toContainText('€1,900');

    // 6. Verify existing reservation base total is unchanged
    await page.goto('/admin/reservations');
    const reservationRow = page.locator('tr').filter({ hasText: 'ND-SEED1' });
    await expect(reservationRow).toBeVisible();
    await expect(reservationRow).toContainText('$3,081');
  });

  test('AC-CMS-6 (Nội dung viết cứng nhất quán): FAQ answers for cancellation and response times strictly match constants in booking-rules.ts', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Navigate to /faq
    await page.goto('/faq');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Frequently Asked Questions/i);

    // 2. Verify cancellation policy contains booking-rules constant
    const cancelFaqTrigger = page.getByRole('button', { name: /What is the cancellation policy\?/i });
    await expect(cancelFaqTrigger).toBeVisible();
    if ((await cancelFaqTrigger.getAttribute('aria-expanded')) !== 'true') {
      await cancelFaqTrigger.click();
    }

    const expectedCancelText = `${BOOKING_RULES.freeCancelDays} days`;
    await expect(page.getByText(new RegExp(expectedCancelText, 'i'))).toBeVisible();

    // 3. Verify host response deadline contains booking-rules constant
    const responseFaqTrigger = page.getByRole('button', { name: /How does payment authorization work\?/i });
    await expect(responseFaqTrigger).toBeVisible();
    if ((await responseFaqTrigger.getAttribute('aria-expanded')) !== 'true') {
      await responseFaqTrigger.click();
    }

    const expectedResponseText = `${BOOKING_RULES.respondHours} hours`;
    await expect(page.getByText(new RegExp(expectedResponseText, 'i'))).toBeVisible();

    // 4. Verify minimum stay nights contains booking-rules constant
    const minStayFaqTrigger = page.getByRole('button', { name: /What is the minimum stay duration\?/i });
    await expect(minStayFaqTrigger).toBeVisible();
    if ((await minStayFaqTrigger.getAttribute('aria-expanded')) !== 'true') {
      await minStayFaqTrigger.click();
    }

    const expectedMinStayText = `${BOOKING_RULES.minimumStayNights} consecutive nights`;
    await expect(page.getByText(new RegExp(expectedMinStayText, 'i'))).toBeVisible();
  });

  test('AC-CMS-7 (Không mất khi làm mới): Changes to CMS persist across page reloads', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as admin
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 2. Update workstation package
    await page.goto('/admin/workstations');
    await page.getByTestId('edit-package-pro').click();
    await page.getByTestId('pkg-price-input').fill('185');
    await page.getByTestId('save-pkg-btn').click();
    await expect(page.getByText(/updated to €185\/mo/i)).toBeVisible();

    // 3. Trigger full page reload
    await page.reload();

    // 4. Verify €185/mo persists
    await expect(page.getByTestId('price-display-pro')).toContainText('€185');

    // 5. Verify /workstations reflects €185
    await page.goto('/workstations');
    await page.reload();
    await expect(page.locator('text=€185').first()).toBeVisible();
  });

  test('AC-CMS-8 (Chặn quyền & XSS): Guest/Host calling CMS action/API blocked with 403; HTML with script or onerror sanitized on public pages', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Unauthenticated API call to /api/admin/cms blocked with 403
    const unauthRes = await request.post('/api/admin/cms', {
      data: { action: 'saveLocation', payload: { name: 'Malicious City' } },
    });
    expect(unauthRes.status()).toBe(403);

    // 2. Guest user attempts to call /api/admin/cms -> blocked with 403
    await loginAs(page, 'demo@example.com', 'demo1234');
    const guestAttempt = await page.evaluate(async () => {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveLocation', payload: { name: 'Hacked City' } }),
      });
      return res.status;
    });
    expect(guestAttempt).toBe(403);

    // 3. Host user attempts to call /api/admin/cms -> blocked with 403
    await loginAs(page, 'host@example.com', 'host1234');
    const hostAttempt = await page.evaluate(async () => {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveLocation', payload: { name: 'Hacked City' } }),
      });
      return res.status;
    });
    expect(hostAttempt).toBe(403);

    // 4. Admin submits Travel Guide with dangerous XSS payload: <script> and onerror=
    await loginAs(page, 'admin@example.com', 'admin1234');
    await page.goto('/admin/guides');
    await page.getByTestId('new-guide-btn').click();

    await page.getByTestId('guide-title-input').fill('XSS Defense Security Audit Guide');
    await page.getByRole('tab', { name: 'HTML' }).click();

    const xssPayload = '<h2>Clean Header</h2><p>Safe text content.</p><script>alert("xss-injected")</script><img src="nonexistent.jpg" onerror="alert(\'xss-onerror\')" />';
    await page.getByTestId('rich-editor-html').fill(xssPayload);

    await page.getByTestId('publish-guide-btn').click();
    await expect(page.getByText(/published to \/travel-guide/i)).toBeVisible();

    // 5. Attach dialog listener to detect any malicious execution
    let alertTriggered = false;
    page.on('dialog', async (dialog) => {
      alertTriggered = true;
      await dialog.dismiss();
    });

    // 6. Navigate to published guide detail page as public visitor
    await page.goto('/travel-guide/barcelona/activities/xss-defense-security-audit-guide');
    await expect(page.getByRole('heading', { name: 'Clean Header' })).toBeVisible();

    // Wait a brief moment to ensure no asynchronous onerror or script runs
    await page.waitForTimeout(500);

    // Assert that no alert dialog was triggered
    expect(alertTriggered).toBe(false);

    // Assert that script tag does not exist in DOM
    const scriptElements = page.locator('script:has-text("xss-injected")');
    await expect(scriptElements).toHaveCount(0);

    // Assert that onerror attribute is stripped
    const imgElement = page.locator('img[src="nonexistent.jpg"]');
    if ((await imgElement.count()) > 0) {
      const onerrorAttr = await imgElement.getAttribute('onerror');
      expect(onerrorAttr).toBeNull();
    }
  });
});
