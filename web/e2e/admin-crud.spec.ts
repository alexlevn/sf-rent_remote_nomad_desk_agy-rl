import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill('admin@example.com');
  await page.getByLabel(/password/i).fill('admin1234');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('/');
}

const SELECT_ALL_SHORTCUT = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

test.describe.configure({ mode: 'serial' });

test.describe('Admin Full CRUD & Tiptap Visual E2E Suite', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/mock/reset');
  });

  test.afterAll(async ({ request }) => {
    await request.post('/api/mock/reset');
  });

  test('Admin Property CRUD: create at /admin/properties/new with Tiptap -> visible on city & detail -> edit price -> hide removes everywhere', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    const propertyTitle = 'Admin Retiro Executive Workspace Loft';
    const propertySlug = 'admin-retiro-executive-workspace-loft';

    // 1. Navigate to /admin/properties and open Create New Property
    await page.goto('/admin/properties');
    await page.getByTestId('admin-add-property-btn').click();
    await expect(page).toHaveURL('/admin/properties/new');

    // 2. Fill Host, Title, City (Madrid), Price ($3,400), Status (Published)
    await page.getByTestId('property-host-select').selectOption('1');
    await page.getByTestId('property-title-input').fill(propertyTitle);

    const citySelect = page.getByTestId('property-city-select');
    const madridOptionValue = await citySelect
      .locator('option', { hasText: /Madrid/i })
      .first()
      .getAttribute('value');
    expect(madridOptionValue).toBeTruthy();
    await citySelect.selectOption(madridOptionValue!);

    await page.getByTestId('property-price-input').fill('3400');
    await page.getByTestId('property-status-select').selectOption('published');

    // 3. Author formatted description via Tiptap Visual tab
    const descVisual = page.getByTestId('property-description-editor-visual');
    await expect(descVisual).toBeVisible();
    const descEditable = descVisual.locator('[contenteditable="true"]');
    await expect(descEditable).toBeVisible();
    await descEditable.click();
    await expect(descEditable).toBeFocused();

    await page.getByRole('button', { name: 'Heading 2' }).first().click();
    await expect(descEditable).toBeFocused();
    await descEditable.pressSequentially('Executive Retiro Workspace');
    await expect(descVisual.locator('h2')).toContainText('Executive Retiro Workspace');
    await page.keyboard.press('Enter');

    await page.getByRole('button', { name: 'Bold' }).first().click();
    await expect(descEditable).toBeFocused();
    await descEditable.pressSequentially('Symmetrical 1Gbps fiber');
    await page.getByRole('button', { name: 'Bold' }).first().click();
    await expect(descEditable).toBeFocused();
    await descEditable.pressSequentially(' with panoramic park views.');

    // 4. Submit property
    await page.getByTestId('property-submit-btn').click();
    await expect(page).toHaveURL('/admin/properties');

    // 5. Verify on Madrid city page
    await page.goto('/c/furnished-apartments-madrid');
    const createdCard = page.locator('article').filter({ hasText: propertyTitle }).first();
    await expect(createdCard).toBeVisible();
    await expect(createdCard).toContainText('$3,400');

    // 6. Verify on public detail page with formatted Tiptap HTML
    const detailRes = await page.goto(`/l/apartments/${propertySlug}`);
    expect(detailRes?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: propertyTitle })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Executive Retiro Workspace' })).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Symmetrical 1Gbps fiber' })).toBeVisible();
    await expect(page.getByTestId('booking-widget')).toContainText('$3,400');

    // 7. Edit price at /admin/properties/[id]/edit
    await page.goto('/admin/properties');
    await page.getByRole('button', { name: /^Published \(/i }).click();
    const publishedRow = page.locator('tr').filter({ hasText: propertyTitle });
    await expect(publishedRow).toBeVisible();
    await publishedRow.getByTitle('Edit listing details').click();
    await expect(page).toHaveURL(/\/admin\/properties\/\d+\/edit$/);

    await page.getByTestId('property-price-input').fill('3650');
    await page.getByTestId('property-submit-btn').click();
    await expect(page).toHaveURL('/admin/properties');

    // 8. Verify updated price on public detail & city pages
    await page.goto(`/l/apartments/${propertySlug}`);
    await expect(page.getByTestId('booking-widget')).toContainText('$3,650');
    await page.goto('/c/furnished-apartments-madrid');
    const updatedCard = page.locator('article').filter({ hasText: propertyTitle }).first();
    await expect(updatedCard).toContainText('$3,650');

    // 9. Hide property from /admin/properties -> disappears from city page & 404 on detail
    await page.goto('/admin/properties');
    await page.getByRole('button', { name: /^Published \(/i }).click();
    const rowToHide = page.locator('tr').filter({ hasText: propertyTitle });
    await expect(rowToHide).toBeVisible();
    await rowToHide.getByRole('button', { name: 'Hide', exact: true }).click();
    await expect(rowToHide).not.toBeVisible();

    await page.goto('/c/furnished-apartments-madrid');
    await expect(page.getByText(propertyTitle)).not.toBeVisible();

    const hiddenRes = await page.goto(`/l/apartments/${propertySlug}`);
    expect(hiddenRes?.status()).toBe(404);
  });

  test('Tiptap Visual Editor: Admin creates Travel Guide using Visual toolbar (H2, Bold, Bullet List, Link, Image) -> renders correctly across /travel-guide, /, and detail', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    const guideTitle = 'Visual Tiptap Nomad Playbook';

    await page.goto('/admin/guides');
    await page.getByTestId('new-guide-btn').click();
    await expect(page.getByTestId('guide-title-input')).toBeVisible();

    await page.getByTestId('guide-title-input').fill(guideTitle);
    await page.getByTestId('guide-featured-checkbox').check();

    // Author strictly in Visual (Editor) tab using toolbar buttons
    const visualEditor = page.getByTestId('rich-editor-visual');
    await expect(visualEditor).toBeVisible();
    const editable = visualEditor.locator('[contenteditable="true"]');
    await expect(editable).toBeVisible();
    await editable.click();
    await expect(editable).toBeFocused();
    await page.keyboard.press(SELECT_ALL_SHORTCUT);
    await page.keyboard.press('Backspace');

    // H2
    await page.getByRole('button', { name: 'Heading 2' }).click();
    await expect(editable).toBeFocused();
    await editable.pressSequentially('Coworking Hotspots');
    await expect(visualEditor.locator('h2')).toContainText('Coworking Hotspots');
    await page.keyboard.press('Enter');

    // Bold
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(editable).toBeFocused();
    await editable.pressSequentially('Verified gigabit fiber');
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(editable).toBeFocused();
    await editable.pressSequentially(' in every district.');
    await page.keyboard.press('Enter');

    // Bullet List
    await page.getByRole('button', { name: 'Bullet List' }).click();
    await expect(editable).toBeFocused();
    await editable.pressSequentially('Chamberi specialty coffee');
    await page.keyboard.press('Enter');
    await editable.pressSequentially('Malasana quiet studios');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Link via inline dialog
    await editable.pressSequentially('NomadDesk');
    for (let i = 0; i < 'NomadDesk'.length; i++) {
      await page.keyboard.press('Shift+ArrowLeft');
    }
    await page.getByRole('button', { name: 'Link' }).click();
    const linkDialog = page.getByTestId('rich-editor-inline-dialog');
    await expect(linkDialog).toBeVisible();
    await linkDialog.getByLabel('Link URL').fill('https://nomaddesk.com');
    await linkDialog.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(editable).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    // Insert Image via inline dialog
    await page.getByRole('button', { name: 'Insert Image' }).click();
    const imageDialog = page.getByTestId('rich-editor-inline-dialog');
    await expect(imageDialog).toBeVisible();
    await imageDialog.getByLabel('Image URL / Path').fill('/seed/guide/placeholder.webp');
    await imageDialog.getByLabel('Image alt text').fill('Nomad coworking space');
    await imageDialog.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(visualEditor.locator('img[src="/seed/guide/placeholder.webp"]')).toBeVisible();

    // Publish
    await page.getByTestId('publish-guide-btn').click();
    await expect(page.getByText(/published to \/travel-guide/i)).toBeVisible();

    // Grab exact live detail URL from the admin table row
    const guideRow = page.locator('tr').filter({ hasText: guideTitle });
    await expect(guideRow).toBeVisible();
    const detailHref = await guideRow
      .getByRole('link', { name: new RegExp(`View ${guideTitle} on live site`, 'i') })
      .getAttribute('href');
    expect(detailHref).toBeTruthy();

    // Verify on /travel-guide
    await page.goto('/travel-guide');
    await expect(page.getByRole('heading', { name: guideTitle })).toBeVisible();

    // Verify on homepage /
    await page.goto('/');
    const guideSection = page.locator('section').filter({ hasText: /Digital Nomad Travel Guides/i });
    await expect(guideSection.getByText(guideTitle)).toBeVisible();

    // Verify formatted HTML elements on detail page
    const detailRes = await page.goto(detailHref!);
    expect(detailRes?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 2, name: 'Coworking Hotspots' })).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Verified gigabit fiber' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Chamberi specialty coffee' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Malasana quiet studios' })).toBeVisible();
    await expect(page.locator('a[href="https://nomaddesk.com"]', { hasText: 'NomadDesk' })).toBeVisible();
    await expect(page.locator('img[src="/seed/guide/placeholder.webp"][alt="Nomad coworking space"]')).toBeVisible();
  });

  test('Admin Blog CRUD: create with Tiptap -> live on /blog and /blog/:slug -> switch to Draft removes from /blog and 404s detail', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    const postTitle = 'Remote Ergonomics Playbook 2026';
    const postSlug = 'remote-ergonomics-playbook-2026';

    await page.goto('/admin/blog');
    await page.getByTestId('new-blog-btn').click();
    await expect(page.getByTestId('post-title-input')).toBeVisible();

    await page.getByTestId('post-title-input').fill(postTitle);

    const visualEditor = page.getByTestId('rich-editor-visual');
    await expect(visualEditor).toBeVisible();
    const editable = visualEditor.locator('[contenteditable="true"]');
    await expect(editable).toBeVisible();
    await editable.click();
    await expect(editable).toBeFocused();
    await page.keyboard.press(SELECT_ALL_SHORTCUT);
    await page.keyboard.press('Backspace');
    await page.getByRole('button', { name: 'Heading 2' }).click();
    await expect(editable).toBeFocused();
    await editable.pressSequentially('Standing Desk Standards');
    await expect(visualEditor.locator('h2')).toContainText('Standing Desk Standards');
    await page.keyboard.press('Enter');
    await editable.pressSequentially('Maintain 90-degree elbow posture during deep work.');

    await page.getByTestId('publish-post-btn').click();
    await expect(page.getByText(/published to \/blog/i)).toBeVisible();

    // Verify on /blog and /blog/:slug
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: postTitle })).toBeVisible();

    const liveRes = await page.goto(`/blog/${postSlug}`);
    expect(liveRes?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 2, name: 'Standing Desk Standards' })).toBeVisible();

    // Switch to Draft
    await page.goto('/admin/blog');
    const postRow = page.locator('tr').filter({ hasText: postTitle });
    await expect(postRow).toBeVisible();
    await postRow.getByRole('button', { name: /Edit \(WYSIWYG\)/i }).click();
    await page.getByTestId('save-draft-post-btn').click();
    await expect(page.getByText(/updated successfully/i)).toBeVisible();

    // Verify absent from /blog and 404 on /blog/:slug
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: postTitle })).not.toBeVisible();

    const draftRes = await page.goto(`/blog/${postSlug}`);
    expect(draftRes?.status()).toBe(404);
  });

  test('Admin Community Videos: create reel -> reorder to #1 -> visible first on homepage -> hide removes from homepage', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    const creatorHandle = 'nomad_e2e_creator';

    await page.goto('/admin/videos');
    await page.getByTestId('add-reel-btn').click();

    await page.getByPlaceholder('e.g. @gringagoiana').fill(creatorHandle);
    await page.getByPlaceholder('https://www.instagram.com/p/DeJ6Y_ROFUP/').fill('https://www.instagram.com/p/NomadE2E2026/');
    await page.getByRole('button', { name: 'Save Reel', exact: true }).click();
    await expect(page.getByText(/added to homepage carousel/i)).toBeVisible();

    const reelRow = page.locator('tr').filter({ hasText: creatorHandle });
    await expect(reelRow).toBeVisible();

    // Move newly added reel up to #1 so it leads the homepage carousel (max 7 displayed)
    const rankCell = reelRow.locator('td').nth(3);
    for (let attempt = 0; attempt < 12; attempt++) {
      const rankText = (await rankCell.textContent()) ?? '';
      if (rankText.includes('#1') && !rankText.includes('#10')) break;
      await reelRow.getByTitle('Move Up').click();
      await expect(rankCell).not.toHaveText(rankText);
    }
    await expect(rankCell).toContainText('#1');

    // Verify visible on homepage /
    await page.goto('/');
    await expect(page.getByText(`@${creatorHandle}`)).toBeVisible();

    // Hide reel in Admin -> disappears from homepage /
    await page.goto('/admin/videos');
    const rowToHide = page.locator('tr').filter({ hasText: creatorHandle });
    await expect(rowToHide).toBeVisible();
    await rowToHide.getByTitle('Hide from homepage').click();
    await expect(page.getByText(/is now hidden on homepage/i)).toBeVisible();
    await expect(rowToHide.getByText('Hidden')).toBeVisible();

    await page.goto('/');
    await expect(page.getByText(`@${creatorHandle}`)).not.toBeVisible();
  });

  test('Admin User Directory: open Bookings drawer for demo@example.com -> displays ND-SEED reservations', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    await page.goto('/admin/users');
    const demoRow = page.locator('tr').filter({ hasText: 'demo@example.com' });
    await expect(demoRow).toBeVisible();

    await demoRow.getByRole('button', { name: /Bookings/i }).click();

    const drawer = page.getByTestId('user-reservations-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('demo@example.com')).toBeVisible();
    await expect(drawer.getByTestId('user-drawer-reservation-ND-SEED1')).toBeVisible();
    await expect(drawer.getByTestId('user-drawer-reservation-ND-SEED2')).toBeVisible();

    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(drawer).not.toBeVisible();
  });
});
