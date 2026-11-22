import { test, expect } from '@playwright/test';

test.describe('Public Discovery & Workstations E2E Suite', () => {
  test('AC-HOME-1 (Bố cục & Header): Viewport 1440px displays capsule floating header, logo, nav links, browse and sign-in buttons', async ({
    page,
  }) => {
    // 1. Set desktop 1440px viewport and open home page
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 2. Verify Floating Header capsule container
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toHaveClass(/fixed/);
    await expect(header).toHaveClass(/top-4/);
    await expect(header).toHaveClass(/rounded-\[24px\]/);

    // 3. Verify Logo Wordmark
    const logoLink = header.getByRole('link', { name: /NomadDesk/i }).first();
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute('href', '/');

    // 4. Verify Desktop Main Navigation items
    await expect(header.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Cities' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Travel Guides' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Our Workstations' })).toBeVisible();

    // 5. Verify Action Buttons: Browse apartments & Sign in
    const browseLink = header.getByRole('link', { name: /browse apartments/i });
    await expect(browseLink).toBeVisible();

    const signInLink = header.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/login');
  });

  test('AC-HOME-2 (Tìm kiếm chuyển trang): Selecting "Madrid" and clicking "Browse apartments" redirects to city page', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Locate search box inside Hero form
    const heroForm = page.locator('form');
    await expect(heroForm).toBeVisible();

    // 2. Select city "Madrid" in Destination select
    const destinationSelect = heroForm.getByLabel(/destination/i);
    await expect(destinationSelect).toBeVisible();
    await destinationSelect.selectOption('madrid');

    // 3. Click "Browse apartments" submit button
    const searchButton = heroForm.getByRole('button', { name: /browse apartments/i });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // 4. Verify browser redirects to /c/furnished-apartments-madrid
    await expect(page).toHaveURL(/\/c\/furnished-apartments-madrid/);

    // 5. Verify city page displays apartments or heading
    const pageHeading = page.getByRole('heading', { level: 1 });
    await expect(pageHeading).toContainText(/Madrid/i);
  });

  test('AC-HOME-3 (Hiển thị căn hộ nổi bật): Featured Apartments displays at least 3 cards with image, price, and workstation specs', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Locate Featured Apartments section
    const featuredSection = page.locator('section').filter({ hasText: /Featured Apartments/i });
    await expect(featuredSection).toBeVisible();

    // 2. Verify at least 3 apartment cards
    const apartmentCards = featuredSection.locator('article');
    await expect(apartmentCards.first()).toBeVisible();
    const count = await apartmentCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // 3. Inspect cards for image, title, price, and workstation specs
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = apartmentCards.nth(i);

      // Photo / Carousel
      const image = card.getByRole('img');
      await expect(image).toBeVisible();

      // Title
      const title = card.getByRole('heading', { level: 3 });
      await expect(title).toBeVisible();

      // Price formatted as $X,XXX / month
      await expect(card.getByText(/\/ month/i)).toBeVisible();

      // Workstation specs box (monitors / chair)
      const workstationBox = card.locator('div').filter({ hasText: /🖥️|💺/ }).first();
      await expect(workstationBox).toBeVisible();
    }
  });

  test('AC-HOME-4 (Đáp ứng Mobile 390px): Viewport 390px collapses header to hamburger menu and stacks cards in 1 column with px-4', async ({
    page,
  }) => {
    // 1. Set mobile viewport 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const header = page.locator('header');
    await expect(header).toBeVisible();

    // 2. Logo is still visible
    await expect(header.getByRole('link', { name: /NomadDesk/i }).first()).toBeVisible();

    // 3. Hamburger menu button is visible, desktop nav is collapsed
    const hamburgerBtn = header.getByRole('button', { name: 'Menu', exact: true });
    await expect(hamburgerBtn).toBeVisible();
    await expect(header.locator('nav').first()).not.toBeVisible();

    // 4. Featured section container uses padding px-4
    const featuredSection = page.locator('section').filter({ hasText: /Featured Apartments/i });
    const sectionContainer = featuredSection.locator('.max-w-7xl');
    await expect(sectionContainer).toHaveClass(/px-4/);

    // 5. Apartment cards are stacked vertically in a single column
    const apartmentCards = featuredSection.locator('article');
    const firstCardBox = await apartmentCards.nth(0).boundingBox();
    const secondCardBox = await apartmentCards.nth(1).boundingBox();

    expect(firstCardBox).not.toBeNull();
    expect(secondCardBox).not.toBeNull();
    if (firstCardBox && secondCardBox) {
      // Second card must appear vertically below the first card
      expect(secondCardBox.y).toBeGreaterThanOrEqual(firstCardBox.y + firstCardBox.height - 10);
    }
  });

  test('AC-BUILD-1 (Cập nhật giá Realtime): Selecting 4K Ultrawide (+€40) and Aeron chair (+€45) updates total surcharge to €85/month', async ({
    page,
  }) => {
    await page.goto('/workstations/build');

    // 1. Initial baseline total should be €0/month
    const totalElement = page.getByTestId('upgrade-total');
    await expect(totalElement).toBeVisible();
    await expect(totalElement).toContainText('€0/month');

    // 2. Select 4K Ultrawide monitor (+€40)
    const monitorOption = page.getByTestId('option-mon-4k-ultrawide');
    await expect(monitorOption).toBeVisible();
    await monitorOption.click();

    // Total should update immediately to +€40/month
    await expect(totalElement).toContainText('€40/month');

    // 3. Select Herman Miller Aeron chair (+€45)
    const chairOption = page.getByTestId('option-chair-aeron');
    await expect(chairOption).toBeVisible();
    await chairOption.click();

    // 4. Verify total surcharge is updated to +€85/month realtime without reload
    await expect(totalElement).toContainText('€85/month');

    // 5. Verify breakdown items in summary card
    const summaryCard = page.locator('.sticky').filter({ hasText: 'Configuration Summary' });
    await expect(summaryCard.getByText('4K UHD Ultrawide Monitor')).toBeVisible();
    await expect(summaryCard.getByText('+€40.00')).toBeVisible();
    await expect(summaryCard.getByText('Premium Ergonomic Chair')).toBeVisible();
    await expect(summaryCard.getByText('+€45.00')).toBeVisible();
  });

  test('AC-BUILD-2 (CTA chuyển hướng): Clicking "Browse apartments with this setup" redirects with configuration params', async ({
    page,
  }) => {
    await page.goto('/workstations/build');

    // 1. Configure setup: 4K Ultrawide (+€40) and Aeron chair (+€45)
    await page.getByTestId('option-mon-4k-ultrawide').click();
    await page.getByTestId('option-chair-aeron').click();
    await expect(page.getByTestId('upgrade-total')).toContainText('€85/month');

    // 2. Locate CTA button
    const ctaButton = page.getByRole('link', { name: /browse apartments with this setup/i });
    await expect(ctaButton).toBeVisible();

    // 3. Click CTA and verify redirection
    await ctaButton.click();
    await expect(page).toHaveURL(/\/c\/furnished-apartments-madrid/);

    // 4. Verify URL query params include configured hardware
    const currentUrl = new URL(page.url());
    expect(currentUrl.searchParams.get('workstation')).toBe('custom');
    expect(currentUrl.searchParams.get('monitor')).toBe('mon-4k-ultrawide');
    expect(currentUrl.searchParams.get('chair')).toBe('chair-aeron');
    expect(currentUrl.searchParams.get('upgradeMonthlyEUR')).toBe('85');
  });
});
