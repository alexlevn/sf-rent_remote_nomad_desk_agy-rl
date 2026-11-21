import { test, expect, type Page } from '@playwright/test';

// Helper to format ISO date string (YYYY-MM-DD) offset by offsetDays from today
function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Helper to authenticate user via /login
async function loginAs(page: Page, email: string, password = 'demo1234') {
  await page.goto('/login');
  await page.evaluate(() => localStorage.removeItem('nomaddesk_user'));
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('/');
}

// Helper to navigate calendar to a target month name (e.g. 'January 2027')
async function navigateToMonth(page: Page, targetMonthName: string) {
  const calendar = page.getByTestId('calendar-picker');
  const monthHeader = calendar.locator('span.font-bold.text-sm');
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
}

test.describe.configure({ mode: 'serial' });

test.describe('Host Portal Lifecycle E2E Suite', () => {
  test.beforeEach(async ({ request }) => {
    // Reset mock store before each test for clean isolation
    await request.post('/api/mock/reset');
  });

  test('AC-HOST-1 (Nộp đơn): Guest submits host application at /host/apply -> shows "Application under review"; navigating to /host redirects to /host/apply', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as guest demo user
    await loginAs(page, 'demo@example.com', 'demo1234');

    // 2. Navigate to /host/apply
    await page.goto('/host/apply');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Tell Us About Your Apartment Portfolio/i);

    // 3. Fill in the application form
    await page.getByPlaceholder(/Casa Urbana Stays/i).fill('Nomad Spaces Madrid');
    await page.getByPlaceholder(/\+34 600 000 001/i).fill('+34 600 999 888');
    await page.getByPlaceholder(/Madrid, Barcelona/i).fill('Madrid, Seville');
    await page.getByPlaceholder('5').fill('4');

    // Agree to terms checkbox
    const agreeCheckbox = page.locator('input#agree');
    await agreeCheckbox.check();
    await expect(agreeCheckbox).toBeChecked();

    // 4. Submit the host application
    await page.getByRole('button', { name: /Submit Application for Approval/i }).click();

    // 5. Verify the page transitions to "Application under review"
    await expect(page.getByRole('heading', { level: 2 })).toContainText(/Application under review/i);
    await expect(page.getByText('Under Review', { exact: true })).toBeVisible();
    await expect(page.getByText('Nomad Spaces Madrid')).toBeVisible();

    // 6. Attempt to access /host -> should be redirected back to /host/apply because role is still guest
    await page.goto('/host');
    await page.waitForURL(/\/host\/apply/);
    await expect(page).toHaveURL(/\/host\/apply/);
  });

  test('AC-HOST-2 (Chặn quyền): Guest accessing /host/listings redirects to /host/apply; unauthenticated accessing /host redirects to /login', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as guest demo user
    await loginAs(page, 'demo@example.com', 'demo1234');

    // 2. Guest attempts to access /host/listings -> redirected to /host/apply
    await page.goto('/host/listings');
    await page.waitForURL(/\/host\/apply/);
    await expect(page).toHaveURL(/\/host\/apply/);

    // 3. Unauthenticated user: clear localStorage auth session
    await page.evaluate(() => localStorage.removeItem('nomaddesk_user'));

    // 4. Attempt to access /host -> redirected to /login
    await page.goto('/host');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('AC-HOST-3 (Tạo tin & gửi duyệt): Logged in as host@example.com, create new listing and submit for review -> appears with "Pending review"; public slug returns 404', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as host
    await loginAs(page, 'host@example.com', 'demo1234');

    // 2. Navigate to new listing page
    await page.goto('/host/listings/new');
    await expect(page.getByRole('heading', { name: /Create New Apartment Listing/i })).toBeVisible();

    // 3. Fill required fields
    const testTitle = 'Sunny Salamanca Penthouse With Dual 4K Workspace';
    const testSlug = 'sunny-salamanca-penthouse-with-dual-4k-workspace';

    await page.locator('#listing-title').fill(testTitle);
    await page.locator('#listing-neighborhood').fill('Salamanca');
    await page.locator('#listing-description').fill(
      'Executive penthouse in central Madrid featuring ultra-fast 1Gbps fiber internet and dual 4K monitors.'
    );

    // 4. Click "Submit for Review →"
    const submitBtn = page.getByRole('button', { name: /Submit for Review/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 5. Verify redirection to /host/listings
    await page.waitForURL('/host/listings');
    await expect(page).toHaveURL('/host/listings');

    // 6. Verify newly created listing is present with "Pending review" status badge
    const newListingRow = page.locator('tr').filter({ hasText: testTitle });
    await expect(newListingRow).toBeVisible();
    await expect(newListingRow.getByText(/Pending review/i)).toBeVisible();

    // 7. Verify public detail page for this unpublished listing returns 404
    const publicRes = await page.goto(`/l/apartments/${testSlug}`);
    expect(publicRes?.status()).toBe(404);
  });

  test('AC-HOST-4 (Accept yêu cầu): Host accepts pending seed request (ND-SEED1) at /host/reservations -> status changes to Confirmed', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as host
    await loginAs(page, 'host@example.com', 'demo1234');

    // 2. Navigate to /host/reservations
    await page.goto('/host/reservations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Reservations/i);

    // 3. In "Requests" tab, find seed request ND-SEED1
    const requestRow = page.locator('tr').filter({ hasText: 'ND-SEED1' });
    await expect(requestRow).toBeVisible();
    await expect(requestRow.getByRole('button', { name: 'Accept', exact: true })).toBeVisible();

    // 4. Click "Accept" button
    const acceptBtn = requestRow.getByRole('button', { name: 'Accept', exact: true });
    await acceptBtn.click();

    // 5. Verify success feedback message
    await expect(page.getByText(/Booking accepted for Demo User/i)).toBeVisible();
    await expect(requestRow).not.toBeVisible();

    // 6. Switch to "Upcoming" tab and verify ND-SEED1 is now listed as Confirmed
    await page.getByRole('button', { name: /Upcoming/i }).click();
    const confirmedRow = page.locator('tr').filter({ hasText: 'ND-SEED1' });
    await expect(confirmedRow).toBeVisible();
    await expect(confirmedRow.getByText(/Confirmed/i)).toBeVisible();
  });

  test('AC-HOST-5 (Reject yêu cầu): Host rejects booking with reason -> status changes to Rejected; guest sees reason in portal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as host
    await loginAs(page, 'host@example.com', 'demo1234');

    // 2. Navigate to /host/reservations
    await page.goto('/host/reservations');

    // 3. Find pending request ND-SEED1 and click "Reject"
    const requestRow = page.locator('tr').filter({ hasText: 'ND-SEED1' });
    await expect(requestRow).toBeVisible();

    const rejectBtn = requestRow.getByRole('button', { name: 'Reject', exact: true });
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();

    // 4. In rejection modal, select reason
    const chosenReason = 'Dates unavailable due to scheduled repairs or maintenance';
    await page.locator('#rejection-reason-select').selectOption({ label: chosenReason });

    // 5. Confirm rejection
    const confirmRejectBtn = page.getByRole('button', { name: 'Confirm Rejection', exact: true });
    await expect(confirmRejectBtn).toBeVisible();
    await confirmRejectBtn.click();

    // 6. Verify feedback banner
    await expect(page.getByText(/was rejected/i)).toBeVisible();

    // 7. Log out host and log in as demo guest
    await loginAs(page, 'demo@example.com', 'demo1234');

    // 8. Navigate to guest reservations portal
    await page.goto('/guests/reservations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/My Stays & Bookings/i);

    // 9. Find ND-SEED1 and verify status is Rejected and rejection reason is displayed
    const guestSeed1Row = page.locator('tr').filter({ hasText: 'ND-SEED1' });
    await expect(guestSeed1Row).toBeVisible();
    await expect(guestSeed1Row.getByText(/Rejected/i)).toBeVisible();

    // Click "Receipt" button to open reservation detail drawer
    await guestSeed1Row.getByRole('button', { name: /Receipt/i }).click();

    // 10. Drawer displays rejection header and exact reason
    await expect(page.getByText(/Booking Request Declined by Host/i)).toBeVisible();
    await expect(page.getByRole('dialog').getByText(chosenReason)).toBeVisible();
  });

  test('AC-HOST-6 (Khóa lịch): Block empty dates -> disabled on detail page; blocking overlapping confirmed dates displays error', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as host
    await loginAs(page, 'host@example.com', 'demo1234');

    // 2. Navigate to /host/calendar
    await page.goto('/host/calendar');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Availability Calendar/i);

    // Select property 16061 (Instant book flat with confirmed seed booking ND-SEED2: T+20 -> T+50)
    await page.locator('#calendar-property-select').selectOption({ value: '16061' });

    // 3. Overlap check: Attempt to block dates overlapping confirmed booking (T+25 -> T+35)
    await page.getByRole('button', { name: /\+ Block Custom Dates/i }).click();

    const overlapStart = getOffsetDateStr(25);
    const overlapEnd = getOffsetDateStr(35);
    await page.locator('#block-start-date').fill(overlapStart);
    await page.locator('#block-end-date').fill(overlapEnd);

    await page.getByRole('button', { name: 'Block dates', exact: true }).click();

    // Verify error message is displayed
    await expect(page.getByText('These dates overlap an existing booking')).toBeVisible();

    // Close the modal
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    // 4. Valid block: Block a free period far in the future (T+120 -> T+150)
    await page.getByRole('button', { name: /\+ Block Custom Dates/i }).click();

    const freeStart = getOffsetDateStr(120);
    const freeEnd = getOffsetDateStr(150);
    await page.locator('#block-start-date').fill(freeStart);
    await page.locator('#block-end-date').fill(freeEnd);

    await page.getByRole('button', { name: 'Block dates', exact: true }).click();

    // Verify success banner in calendar view
    await expect(page.getByText(/Dates successfully blocked/i)).toBeVisible();

    // 5. Navigate to public apartment detail page for 16061
    await page.goto('/l/apartments/spacious-madrid-flat-with-dedicated-home-office');
    await page.getByRole('button', { name: /show calendar/i }).click();

    // 6. Navigate calendar to month of blocked date (T+125)
    const blockedCheckDate = getOffsetDateStr(125);
    const blockedDateObj = new Date(blockedCheckDate);
    const targetMonthName = blockedDateObj.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    await navigateToMonth(page, targetMonthName);

    // 7. Verify the blocked date has data-disabled="true" and is disabled
    const blockedDayBtn = page.locator(`button[data-date="${blockedCheckDate}"]`);
    await expect(blockedDayBtn).toBeVisible();
    await expect(blockedDayBtn).toBeDisabled();
    await expect(blockedDayBtn).toHaveAttribute('data-disabled', 'true');
  });

  test('AC-HOST-7 (Cô lập dữ liệu): Logged in as host2@example.com, direct access to edit property of host@example.com returns 404', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as host2 (Mateo Rivas, Andes Living Co. - owns 17001, 18001)
    await loginAs(page, 'host2@example.com', 'demo1234');

    // 2. Direct navigation to edit property 16060 (owned by Host 1 Casa Urbana Stays)
    const editRes = await page.goto('/host/listings/16060/edit');

    // 3. Verify server returns 404 not found or client navigates to /not-found
    const isNotFound = editRes?.status() === 404 || page.url().includes('not-found');
    expect(isNotFound).toBe(true);
  });
});
