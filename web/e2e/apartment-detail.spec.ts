import { test, expect } from '@playwright/test';

// Helper to format ISO date string (YYYY-MM-DD) offset by offsetDays from today
function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

test.describe.configure({ mode: 'serial' });

test.describe('Apartment Detail & Availability E2E Suite', () => {
  test.beforeEach(async ({ request }) => {
    // Reset mock store before each test for clean isolation
    await request.post('/api/mock/reset');
  });

  test('AC-DETAIL-1 (Gallery & Workstation Specs): Jerónimos apartment displays 5-photo grid, apartment title, and workstation specifications', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/l/apartments/exclusive-240-sqm-residence-in-jeronimos-retiro-park');

    // 1. Verify Apartment Title (Heading Level 1)
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Work Remotely Above Madrid|Curated 3-br Sky Home/i);

    // 2. Verify 5-Photo Gallery Grid (Desktop 1440px)
    const desktopGallery = page.locator('.hidden.md\\:grid');
    await expect(desktopGallery).toBeVisible();
    const galleryImages = desktopGallery.locator('img');
    await expect(galleryImages).toHaveCount(5);

    // Verify all 5 photos are visible and loaded
    for (let i = 0; i < 5; i++) {
      await expect(galleryImages.nth(i)).toBeVisible();
    }

    // Verify clicking photo opens lightbox modal
    await desktopGallery.locator('.cursor-pointer').first().click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/1 \/ 5/);
    await expect(modal.locator('img[alt*="Photo 1"]')).toBeVisible();

    // Close modal via Close button
    const closeBtn = modal.getByRole('button', { name: /close gallery/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    // 3. Verify Workstation Specification Box
    const workstationBox = page.getByTestId('workstation-specs-box');
    await expect(workstationBox).toBeVisible();
    await expect(workstationBox.getByRole('heading', { level: 2 })).toContainText(
      /Dedicated Workstation Specs/i
    );

    // Check specs details: Desk, Chair, Monitors, WiFi
    await expect(workstationBox.getByText(/Monitors:/i)).toBeVisible();
    await expect(workstationBox.getByText(/Dual 27" 4K UHD Monitors/i)).toBeVisible();
    await expect(workstationBox.getByText(/Desk:/i)).toBeVisible();
    await expect(workstationBox.getByText(/Bespoke Executive Desk/i)).toBeVisible();
    await expect(workstationBox.getByText(/Chair:/i)).toBeVisible();
    await expect(workstationBox.getByText(/Ergonomic Executive Seating/i)).toBeVisible();
    await expect(workstationBox.getByText(/Internet Speed:/i)).toBeVisible();
    await expect(workstationBox.getByText(/600 Mbps Guaranteed Fiber/i)).toBeVisible();
  });

  test('AC-DETAIL-2 (Sticky Booking Widget): Widget stays sticky when scrolling; changing stay length or workstation package updates total price realtime', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/l/apartments/exclusive-240-sqm-residence-in-jeronimos-retiro-park');

    const widget = page.getByTestId('booking-widget');
    await expect(widget).toBeVisible();

    // 1. Verify sticky position CSS
    await expect(widget).toHaveCSS('position', 'sticky');

    // 2. Scroll page down and verify widget remains visible in viewport
    await page.evaluate(() => window.scrollBy(0, 800));
    await expect(widget).toBeInViewport();
    const widgetBox = await widget.boundingBox();
    expect(widgetBox).not.toBeNull();
    if (widgetBox) {
      // top-24 corresponds to 96px sticky offset
      expect(widgetBox.y).toBeGreaterThanOrEqual(50);
      expect(widgetBox.y).toBeLessThanOrEqual(180);
    }

    // 3. Realtime price updates: Initial baseline with Comfort Base
    const totalDue = page.getByTestId('total-due-price');
    await expect(totalDue).toBeVisible();
    const initialPriceText = (await totalDue.textContent())?.trim();
    expect(initialPriceText).toBeTruthy();

    // 4. Update workstation setup to Pro Upgrade (+€150/mo)
    const workstationSelect = page.getByTestId('workstation-select');
    await workstationSelect.selectOption('pro');

    // Total price should immediately update without page reload
    await expect(totalDue).not.toHaveText(initialPriceText!);
    const proPriceText = (await totalDue.textContent())?.trim();
    expect(proPriceText).toBeTruthy();

    // 5. Change stay length from 30 nights to 60 nights
    const moveOutInput = page.getByTestId('move-out-input');
    const extendedMoveOut = getOffsetDateStr(150); // MoveIn was T+90, new MoveOut is T+150 -> 60 nights
    await moveOutInput.fill(extendedMoveOut);

    // Nights count indicator updates
    await expect(page.getByText('60 nights selected')).toBeVisible();

    // Price updates to reflect 60 nights
    await expect(totalDue).not.toHaveText(proPriceText!);
  });

  test('AC-DETAIL-3 (Điều hướng Đặt phòng): Clicking CTA button navigates to /booking/checkout with property and date query params', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Sign in as demo guest so authenticated checkout renders directly
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('demo@example.com');
    await page.getByLabel(/password/i).fill('demo1234');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('/');

    await page.goto('/l/apartments/exclusive-240-sqm-residence-in-jeronimos-retiro-park');

    // 1. Locate CTA button
    const ctaBtn = page.getByTestId('booking-cta-btn');
    await expect(ctaBtn).toBeVisible();
    await expect(ctaBtn).toBeEnabled();

    // 2. Click CTA button
    await ctaBtn.click();

    // 3. Verify redirect to /booking/checkout
    await expect(page).toHaveURL(/\/booking\/checkout\?propertyId=16060/);

    // 4. Verify checkout page heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Complete your reservation request/i);
  });

  test('AC-DETAIL-4 (Khối Host): Apartment detail page displays "Hosted by" host name and "Verified host" badge', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/l/apartments/exclusive-240-sqm-residence-in-jeronimos-retiro-park');

    // 1. Locate Host info block
    const hostBlock = page.getByTestId('host-info-block');
    await expect(hostBlock).toBeVisible();

    // 2. Verify "Hosted by Casa Urbana Stays"
    const hostHeading = hostBlock.getByRole('heading', { level: 3 });
    await expect(hostHeading).toBeVisible();
    await expect(hostHeading).toContainText(/Hosted by Casa Urbana Stays/i);

    // 3. Verify "Verified host" badge
    const verifiedBadge = hostBlock.getByTestId('verified-host-badge');
    await expect(verifiedBadge).toBeVisible();
    await expect(verifiedBadge).toContainText(/Verified host/i);
  });

  test('AC-DETAIL-5 (Nhãn CTA theo chế độ): Direct booking false displays "Request to book"; direct booking true displays "Book now"', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Property 16060 (Jerónimos) has isDirectBooking = false -> Must show "Request to book"
    await page.goto('/l/apartments/exclusive-240-sqm-residence-in-jeronimos-retiro-park');
    const requestCtaBtn = page.getByTestId('booking-cta-btn');
    await expect(requestCtaBtn).toBeVisible();
    await expect(requestCtaBtn).toContainText(/Request to book/i);
    await expect(requestCtaBtn).not.toContainText(/Book now/i);

    // 2. Property 16061 (Chamberí) has isDirectBooking = true -> Must show "Book now"
    await page.goto('/l/apartments/spacious-madrid-flat-with-dedicated-home-office');
    const directCtaBtn = page.getByTestId('booking-cta-btn');
    await expect(directCtaBtn).toBeVisible();
    await expect(directCtaBtn).toContainText(/Book now/i);
    await expect(directCtaBtn).not.toContainText(/Request to book/i);
  });

  test('AC-DETAIL-6 (Lịch làm mờ): Dates in blocked_dates and confirmed reservations display disabled on calendar picker', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Property 16061 (Chamberí) has:
    // - Confirmed reservation ND-SEED2: T+20 -> T+50
    // - Blocked dates: T+55 -> T+60 (Maintenance)
    await page.goto('/l/apartments/spacious-madrid-flat-with-dedicated-home-office');

    // 1. Open Calendar Picker
    const toggleCalendarBtn = page.getByRole('button', { name: /show calendar/i });
    await expect(toggleCalendarBtn).toBeVisible();
    await toggleCalendarBtn.click();

    const calendar = page.getByTestId('calendar-picker');
    await expect(calendar).toBeVisible();

    // Helper to navigate calendar to a target month using previous/next buttons
    const monthHeader = calendar.locator('span.font-bold.text-sm');
    const navigateToMonth = async (targetMonthName: string) => {
      for (let i = 0; i < 12; i++) {
        const text = (await monthHeader.textContent())?.trim();
        if (text === targetMonthName) break;
        const currentYearMonth = new Date(Date.parse(`1 ${text}`));
        const targetYearMonth = new Date(Date.parse(`1 ${targetMonthName}`));
        if (currentYearMonth > targetYearMonth) {
          await calendar.getByRole('button', { name: 'Previous month' }).click();
        } else {
          await calendar.getByRole('button', { name: 'Next month' }).click();
        }
      }
      await expect(monthHeader).toHaveText(targetMonthName);
    };

    // 2. Navigate to month containing confirmed reservation (ND-SEED2: T+20 -> T+50)
    const confirmedDate = getOffsetDateStr(25);
    const confirmedDateObj = new Date(confirmedDate);
    const confirmedMonthName = confirmedDateObj.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    await navigateToMonth(confirmedMonthName);

    // 3. Verify confirmed reservation date (T+25) is disabled
    const confirmedDayBtn = calendar.locator(`button[data-date="${confirmedDate}"]`);
    await expect(confirmedDayBtn).toBeVisible();
    await expect(confirmedDayBtn).toBeDisabled();
    await expect(confirmedDayBtn).toHaveAttribute('data-disabled', 'true');
    await expect(confirmedDayBtn).toHaveClass(/cursor-not-allowed/);

    // 4. Navigate to month containing blocked dates (Maintenance: T+55 -> T+60)
    const blockedDate = getOffsetDateStr(57);
    const blockedDateObj = new Date(blockedDate);
    const blockedMonthName = blockedDateObj.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    await navigateToMonth(blockedMonthName);

    // 5. Verify blocked date (T+57) is disabled
    const blockedDayBtn = calendar.locator(`button[data-date="${blockedDate}"]`);
    await expect(blockedDayBtn).toBeVisible();
    await expect(blockedDayBtn).toBeDisabled();
    await expect(blockedDayBtn).toHaveAttribute('data-disabled', 'true');
    await expect(blockedDayBtn).toHaveClass(/cursor-not-allowed/);

    // 6. Verify an available future date is enabled (e.g. T+80)
    const freeDate = getOffsetDateStr(80);
    const freeDateObj = new Date(freeDate);
    const freeMonthName = freeDateObj.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    await navigateToMonth(freeMonthName);

    const freeDayBtn = calendar.locator(`button[data-date="${freeDate}"]`);
    await expect(freeDayBtn).toBeVisible();
    await expect(freeDayBtn).toBeEnabled();
    await expect(freeDayBtn).not.toHaveAttribute('data-disabled', 'true');
  });
});
