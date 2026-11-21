import { test, expect, type Page } from '@playwright/test';

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

test.describe('Admin Platform Management E2E Suite', () => {
  test.beforeEach(async ({ request }) => {
    // Reset mock store before each test for clean isolation
    await request.post('/api/mock/reset');
  });

  test('AC-AUTH-2 (Bảo vệ Route Admin): Guest or host accounts attempting to access /admin are blocked with 403 Forbidden', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as guest user (demo@example.com)
    await loginAs(page, 'demo@example.com', 'demo1234');

    // 2. Guest attempts to access /admin -> blocked with 403 Forbidden
    await page.goto('/admin');
    const guest403 = page.getByTestId('admin-403');
    await expect(guest403).toBeVisible();
    await expect(guest403.getByText('403 Forbidden')).toBeVisible();
    await expect(guest403.getByRole('heading', { name: /Access Denied/i })).toBeVisible();
    await expect(guest403.getByText(/demo@example.com/i)).toBeVisible();

    // 3. Log in as host user (host@example.com)
    await loginAs(page, 'host@example.com', 'demo1234');

    // 4. Host attempts to access /admin -> blocked with 403 Forbidden
    await page.goto('/admin');
    const host403 = page.getByTestId('admin-403');
    await expect(host403).toBeVisible();
    await expect(host403.getByText('403 Forbidden')).toBeVisible();
    await expect(host403.getByRole('heading', { name: /Access Denied/i })).toBeVisible();
    await expect(host403.getByText(/host@example.com/i)).toBeVisible();

    // 5. Unauthenticated user attempts to access /admin -> blocked with 403 Forbidden
    await page.evaluate(() => localStorage.removeItem('nomaddesk_user'));
    await page.goto('/admin');
    const unauth403 = page.getByTestId('admin-403');
    await expect(unauth403).toBeVisible();
    await expect(unauth403.getByText('403 Forbidden')).toBeVisible();
    await expect(unauth403.getByRole('heading', { name: /Administrator Access Required/i })).toBeVisible();
  });

  test('AC-ADMIN-1 (Duyệt Host): Admin approves host applicant at /admin/hosts -> moves to Active; applicant can access /host', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as administrator
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 2. Navigate to /admin/hosts
    await page.goto('/admin/hosts');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Host Partner Moderation/i);

    // 3. In Applications tab, locate applicant@example.com
    const applicantRow = page.locator('tr').filter({ hasText: 'applicant@example.com' });
    await expect(applicantRow).toBeVisible();
    await expect(applicantRow.getByText('Pending Review')).toBeVisible();

    // 4. Click Approve button
    const approveBtn = applicantRow.getByRole('button', { name: 'Approve', exact: true });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // 5. Verify feedback toast
    await expect(page.getByText(/approved! User elevated to Host role/i)).toBeVisible();
    await expect(applicantRow).not.toBeVisible();

    // 6. Switch to Active Hosts tab and verify applicant is now Active/Approved
    await page.getByRole('button', { name: /Active Hosts/i }).click();
    const activeApplicantRow = page.locator('tr').filter({ hasText: 'applicant@example.com' });
    await expect(activeApplicantRow).toBeVisible();
    await expect(activeApplicantRow.getByText('Approved')).toBeVisible();

    // 7. Log out and log in as newly approved applicant
    await loginAs(page, 'applicant@example.com', 'demo1234');

    // 8. Access /host -> successfully loads host portal without redirection to /host/apply
    await page.goto('/host');
    await expect(page).toHaveURL('/host');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Host Dashboard/i);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });

  test('AC-ADMIN-2 (Kiểm duyệt tin): Admin approves pending listing at /admin/properties -> status becomes Published and appears on city page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Host creates a new listing and submits for review (as in AC-HOST-3)
    await loginAs(page, 'host@example.com', 'demo1234');
    await page.goto('/host/listings/new');
    await expect(page.getByRole('heading', { name: /Create New Apartment Listing/i })).toBeVisible();

    const testTitle = 'Prime Salamanca Workspace Penthouse';
    const testSlug = 'prime-salamanca-workspace-penthouse';

    await page.locator('#listing-title').fill(testTitle);
    await page.locator('#listing-city').selectOption('Madrid');
    await page.locator('#listing-neighborhood').fill('Salamanca');
    await page.locator('#listing-description').fill(
      'Executive penthouse with ultra-fast fiber internet and dual 4K monitors.'
    );

    const submitBtn = page.getByRole('button', { name: /Submit for Review/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    await page.waitForURL('/host/listings');
    const hostRow = page.locator('tr').filter({ hasText: testTitle });
    await expect(hostRow.getByText(/Pending review/i)).toBeVisible();

    // 2. Verify listing is not yet accessible publicly (returns 404)
    const preApprovalRes = await page.goto(`/l/apartments/${testSlug}`);
    expect(preApprovalRes?.status()).toBe(404);

    // 3. Log in as administrator
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 4. Navigate to /admin/properties
    await page.goto('/admin/properties');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Property Inventory & Moderation/i);

    // 5. In "Pending Review" tab, find newly created listing
    const pendingRow = page.locator('tr').filter({ hasText: testTitle });
    await expect(pendingRow).toBeVisible();
    await expect(pendingRow.getByText('Pending Review')).toBeVisible();

    // 6. Click Approve button on the pending listing
    const approveBtn = pendingRow.getByRole('button', { name: 'Approve', exact: true });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // 7. Verify feedback toast
    await expect(page.getByText(/approved and published/i)).toBeVisible();
    await expect(pendingRow).not.toBeVisible();

    // 8. Verify listing appears in "Published" tab
    await page.getByRole('button', { name: /^Published \(/i }).click();
    const publishedRow = page.locator('tr').filter({ hasText: testTitle });
    await expect(publishedRow).toBeVisible();

    // 9. Verify listing appears on the city page (/c/furnished-apartments-madrid)
    await page.goto('/c/furnished-apartments-madrid');
    await expect(page.getByText(testTitle)).toBeVisible();

    // 10. Verify public apartment detail page is now accessible (HTTP 200)
    const postApprovalRes = await page.goto(`/l/apartments/${testSlug}`);
    expect(postApprovalRes?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: testTitle })).toBeVisible();
  });

  test('AC-ADMIN-3 (Đình chỉ Host): Suspending host2@example.com removes all host2 listings from Buenos Aires and Lima city pages', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Verify before suspension: listings in Buenos Aires & Lima are visible
    await page.goto('/c/furnished-apartments-buenos-aires');
    await expect(page.locator('h3').getByText('Dos Ambientes Plus - Palermo Chico')).toBeVisible();

    await page.goto('/c/furnished-apartments-lima');
    await expect(page.locator('h3').getByText('Smart Loft with High-Speed WiFi in Central Miraflores')).toBeVisible();

    // 2. Log in as administrator
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 3. Navigate to /admin/hosts
    await page.goto('/admin/hosts');

    // 4. Switch to "Active Hosts" tab
    await page.getByRole('button', { name: /Active Hosts/i }).click();
    const host2Row = page.locator('tr').filter({ hasText: 'host2@example.com' });
    await expect(host2Row).toBeVisible();
    await expect(host2Row.getByText('Andes Living Co.')).toBeVisible();

    // 5. Suspend host2
    const suspendBtn = host2Row.getByRole('button', { name: 'Suspend', exact: true });
    await expect(suspendBtn).toBeVisible();
    await suspendBtn.click();

    // 6. Verify toast notification and absence from Active Hosts tab
    await expect(page.getByText(/suspended/i)).toBeVisible();
    await expect(host2Row).not.toBeVisible();

    // 7. Verify host2 is now in "Suspended" tab
    await page.getByRole('button', { name: /Suspended \(/i }).click();
    const suspendedHostRow = page.locator('tr').filter({ hasText: 'host2@example.com' });
    await expect(suspendedHostRow).toBeVisible();

    // 8. Verify Buenos Aires city page no longer lists Andes Living Co. properties
    await page.goto('/c/furnished-apartments-buenos-aires');
    await expect(page.locator('h3').getByText('Dos Ambientes Plus - Palermo Chico')).not.toBeVisible();
    await expect(page.locator('h3').getByText('Studio - Nuñez Digital Nomad Haven')).not.toBeVisible();

    // 9. Verify Lima city page no longer lists Andes Living Co. properties
    await page.goto('/c/furnished-apartments-lima');
    await expect(page.locator('h3').getByText('Smart Loft with High-Speed WiFi in Central Miraflores')).not.toBeVisible();
    await expect(page.locator('h3').getByText('Design 1BR in Barranco near Malecón with Rooftop Pool')).not.toBeVisible();

    // 10. Verify direct slug access returns 404
    const res = await page.goto('/l/apartments/argentina-dos-ambientes-plus-palermo-chico');
    expect(res?.status()).toBe(404);
  });

  test('AC-ADMIN-4 (Hủy can thiệp): Admin cancels confirmed reservation at /admin/reservations -> status Cancelled and payment Refunded', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as administrator
    await loginAs(page, 'admin@example.com', 'admin1234');

    // 2. Navigate to /admin/reservations
    await page.goto('/admin/reservations');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Global Reservation Audit/i);

    // 3. Locate confirmed seed reservation ND-SEED2
    const resRow = page.locator('tr').filter({ hasText: 'ND-SEED2' });
    await expect(resRow).toBeVisible();
    await expect(resRow.getByText('Confirmed')).toBeVisible();
    await expect(resRow.getByText('Captured')).toBeVisible();

    // 4. Click Admin Void button
    const voidBtn = resRow.getByRole('button', { name: 'Admin Void', exact: true });
    await expect(voidBtn).toBeVisible();
    await voidBtn.click();

    // 5. In intervention confirmation modal, confirm the cancellation
    await expect(page.getByRole('heading', { name: /Admin Intervention: Cancel Booking/i })).toBeVisible();
    await expect(page.getByText(/Booking #ND-SEED2/i)).toBeVisible();

    const confirmBtn = page.getByRole('button', { name: 'Execute Admin Void', exact: true });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 6. Verify feedback toast
    await expect(page.getByText(/Reservation #ND-SEED2 cancelled by Admin\. Refund processed\./i)).toBeVisible();

    // 7. Verify reservation row updates to Cancelled, Refunded, Admin Voided
    await expect(resRow.getByText('Cancelled')).toBeVisible();
    await expect(resRow.getByText('Refunded')).toBeVisible();
    await expect(resRow.getByText('Admin Voided')).toBeVisible();

    // 8. Log in as guest and verify status is reflected in Guest Portal
    await loginAs(page, 'demo@example.com', 'demo1234');
    await page.goto('/guests/reservations');
    const guestRow = page.locator('tr').filter({ hasText: 'ND-SEED2' });
    await expect(guestRow.getByText(/Cancelled/i)).toBeVisible();
  });
});
