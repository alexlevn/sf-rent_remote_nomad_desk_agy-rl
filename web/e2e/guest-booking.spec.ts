import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// Helper to format ISO date string (YYYY-MM-DD) offset by offsetDays from today
function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Helper to login as guest demo user
async function loginAsGuest(page: Page) {
  await page.goto('/login');
  const emailInput = page.getByLabel(/email address/i);
  const passwordInput = page.getByLabel(/password/i);
  await emailInput.fill('demo@example.com');
  await passwordInput.fill('demo1234');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('/');
  await expect(page.locator('header').getByText('Demo', { exact: true })).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test.describe('Auth, Guest Portal & Booking Flow E2E Suite', () => {
  let secondContext: BrowserContext | null = null;

  test.beforeEach(async ({ request }) => {
    // Reset mock store before each test for clean isolation
    await request.post('/api/mock/reset');
  });

  test.afterEach(async () => {
    if (secondContext) {
      await secondContext.close();
      secondContext = null;
    }
  });

  test('AC-AUTH-1 (Đăng nhập thành công): Login at /login with demo@example.com / demo1234 redirects to home page and displays user avatar in header', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Ensure logged out state
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('nomaddesk_user'));
    await page.reload();

    const header = page.locator('header');
    await expect(header.getByRole('link', { name: /sign in/i })).toBeVisible();

    // 2. Navigate to /login and fill credentials
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome back/i);

    const emailInput = page.getByLabel(/email address/i);
    const passwordInput = page.getByLabel(/password/i);
    await emailInput.fill('demo@example.com');
    await passwordInput.fill('demo1234');

    // 3. Submit login form
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // 4. Verify redirection to home page
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');

    // 5. Verify Sign In button is replaced by user avatar dropdown
    await expect(header.getByRole('link', { name: /sign in/i })).not.toBeVisible();
    const avatarTrigger = header.getByText('Demo', { exact: true });
    await expect(avatarTrigger).toBeVisible();

    // 6. Open user dropdown to verify user identity & guest portal link
    await avatarTrigger.click();
    await expect(page.getByText('demo@example.com')).toBeVisible();
    await expect(page.getByRole('link', { name: /guest dashboard/i })).toBeVisible();
  });

  test('AC-BOOK-1 (Instant book): Logged-in demo guest books instant apartment on free dates -> shows "Booking confirmed" + ND-XXXXX; appears at /guests/reservations with Confirmed status', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsGuest(page);

    // Property 16061 is Instant booking (Chamberí flat)
    const moveIn = getOffsetDateStr(90);
    const moveOut = getOffsetDateStr(120);

    await page.goto(`/booking/checkout?propertyId=16061&moveIn=${moveIn}&moveOut=${moveOut}`);

    // Verify Checkout Page loaded with Instant Book CTA
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/complete your reservation/i);
    await expect(page.getByText(/Spacious Madrid Flat With Dedicated Home Office/i)).toBeVisible();

    const submitBtn = page.getByTestId('checkout-submit-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText(/confirm & pay/i);

    // Submit booking
    await submitBtn.click();

    // Verify Confirmation screen
    await page.waitForURL(/\/booking\/confirmation/);
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/booking confirmed/i);

    // Verify confirmation badge and code pattern ND-XXXXX
    const confirmationText = await page.textContent('body');
    const codeMatch = confirmationText?.match(/ND-\d{5}/);
    expect(codeMatch).toBeTruthy();
    const bookingCode = codeMatch![0];

    // Navigate to /guests/reservations and verify presence
    await page.goto('/guests/reservations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/my stays & bookings/i);

    const reservationRow = page.locator('tr').filter({ hasText: bookingCode });
    await expect(reservationRow).toBeVisible();
    await expect(reservationRow.getByText(/confirmed/i)).toBeVisible();
  });

  test('AC-BOOK-2 (Request to book): Booking request for Jerónimos apartment shows "Request sent" + code; appears at /guests/reservations with Pending status', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsGuest(page);

    // Property 16060 is Request to book (Jerónimos Retiro Park)
    const moveIn = getOffsetDateStr(120);
    const moveOut = getOffsetDateStr(150);

    await page.goto(`/booking/checkout?propertyId=16060&moveIn=${moveIn}&moveOut=${moveOut}`);

    // Verify Checkout Page loaded with Request to book CTA
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/complete your reservation/i);
    await expect(page.getByText(/Work Remotely Above Madrid/i)).toBeVisible();

    const submitBtn = page.getByTestId('checkout-submit-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText(/send request/i);

    // Submit booking
    await submitBtn.click();

    // Verify Confirmation screen
    await page.waitForURL(/\/booking\/confirmation/);
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/request sent/i);

    // Verify confirmation badge and code pattern ND-XXXXX
    const confirmationText = await page.textContent('body');
    const codeMatch = confirmationText?.match(/ND-\d{5}/);
    expect(codeMatch).toBeTruthy();
    const bookingCode = codeMatch![0];

    // Navigate to /guests/reservations and verify presence
    await page.goto('/guests/reservations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/my stays & bookings/i);

    const reservationRow = page.locator('tr').filter({ hasText: bookingCode });
    await expect(reservationRow).toBeVisible();
    await expect(reservationRow.getByText(/pending/i)).toBeVisible();
  });

  test('AC-BOOK-3 (Chống đặt trùng): Simultaneous or duplicate checkout for already-booked dates triggers "These dates were just booked" error', async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsGuest(page);

    const moveIn = getOffsetDateStr(160);
    const moveOut = getOffsetDateStr(190);

    // Session 1 opens checkout page for dates T+160 to T+190
    await page.goto(`/booking/checkout?propertyId=16061&moveIn=${moveIn}&moveOut=${moveOut}`);
    await expect(page.getByTestId('checkout-submit-btn')).toBeVisible();

    // Session 2 completes booking for the exact same dates first
    secondContext = await browser.newContext();
    const page2 = await secondContext.newPage();
    await page2.goto(`/booking/checkout?propertyId=16061&moveIn=${moveIn}&moveOut=${moveOut}`);
    await page2.getByTestId('checkout-submit-btn').click();
    await page2.waitForURL(/\/booking\/confirmation/);
    await expect(page2.getByRole('heading', { level: 1 })).toContainText(/booking confirmed/i);

    // Now Session 1 attempts to submit the checkout form that was already rendered
    await page.getByTestId('checkout-submit-btn').click();

    // Verify Session 1 receives the collision error notice and is NOT redirected
    const errorAlert = page.getByTestId('checkout-error-alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/these dates were just booked/i);
    await expect(page).toHaveURL(/\/booking\/checkout/);
  });

  test('AC-BOOK-4 (Guest hủy đơn pending): Cancelling a pending reservation updates status to Cancelled and frees up calendar dates on apartment widget', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsGuest(page);

    // Seed reservation ND-SEED1 is pending for Jerónimos (property 16060) from T+40 to T+70
    const testDate = getOffsetDateStr(45);
    const testDateObj = new Date(testDate);
    const targetMonthName = testDateObj.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // 1. Verify before cancellation that T+45 is disabled on the apartment detail calendar
    await page.goto('/l/apartments/exclusive-240-sqm-residence-in-jeronimos-retiro-park');
    const toggleCalendarBtn = page.getByRole('button', { name: /show calendar/i });
    await expect(toggleCalendarBtn).toBeVisible();
    await toggleCalendarBtn.click();

    const calendar = page.getByTestId('calendar-picker');
    await expect(calendar).toBeVisible();

    const monthHeader = calendar.locator('span.font-bold.text-sm');
    const navigateToMonth = async (monthName: string) => {
      for (let i = 0; i < 12; i++) {
        const text = (await monthHeader.textContent())?.trim();
        if (text === monthName) break;
        const currentYearMonth = new Date(Date.parse(`1 ${text}`));
        const targetYearMonth = new Date(Date.parse(`1 ${monthName}`));
        if (currentYearMonth > targetYearMonth) {
          await calendar.getByRole('button', { name: 'Previous month' }).click();
        } else {
          await calendar.getByRole('button', { name: 'Next month' }).click();
        }
      }
      await expect(monthHeader).toHaveText(monthName);
    };

    await navigateToMonth(targetMonthName);
    const dayBtnBefore = calendar.locator(`button[data-date="${testDate}"]`);
    await expect(dayBtnBefore).toBeVisible();
    await expect(dayBtnBefore).toBeDisabled();
    await expect(dayBtnBefore).toHaveAttribute('data-disabled', 'true');

    // 2. Navigate to /guests/reservations and find the ND-SEED1 pending reservation
    await page.goto('/guests/reservations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/my stays & bookings/i);

    const row = page.locator('tr').filter({ hasText: 'ND-SEED1' });
    await expect(row).toBeVisible();
    await expect(row.getByText(/pending/i)).toBeVisible();

    // 3. Click Cancel button to open cancel confirmation modal
    const cancelBtn = row.getByRole('button', { name: 'Cancel' });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Cancel Reservation #ND-SEED1/i);

    // Confirm cancellation
    const confirmCancelBtn = modal.getByRole('button', { name: /confirm cancellation/i });
    await expect(confirmCancelBtn).toBeVisible();
    await confirmCancelBtn.click();

    // Modal closes and row reflects Cancelled status
    await expect(modal).not.toBeVisible();
    await expect(row.getByText(/cancelled/i)).toBeVisible();

    // 4. Return to apartment detail and verify T+45 is now enabled and selectable
    await page.goto('/l/apartments/exclusive-240-sqm-residence-in-jeronimos-retiro-park');
    const toggleCalendarBtnAfter = page.getByRole('button', { name: /show calendar/i });
    await expect(toggleCalendarBtnAfter).toBeVisible();
    await toggleCalendarBtnAfter.click();

    const calendarAfter = page.getByTestId('calendar-picker');
    await expect(calendarAfter).toBeVisible();
    await navigateToMonth(targetMonthName);

    const dayBtnAfter = calendarAfter.locator(`button[data-date="${testDate}"]`);
    await expect(dayBtnAfter).toBeVisible();
    await expect(dayBtnAfter).toBeEnabled();
    await expect(dayBtnAfter).not.toHaveAttribute('data-disabled', 'true');

    // Click to select the date
    await dayBtnAfter.click();
    await expect(dayBtnAfter).toHaveClass(/bg-\[var\(--color-brand\)\]/);
  });
});
