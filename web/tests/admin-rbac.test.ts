import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthError } from '@/lib/auth/guards';
import type { User } from '@/lib/types';

const mockGetCurrentUser = vi.fn<() => Promise<User | null>>();
const mockGetUserById = vi.fn<(id: number) => Promise<User | null>>();

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/api/users', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/users')>();
  return {
    ...actual,
    getUserById: (id: number) => mockGetUserById(id),
  };
});

import * as adminActions from '@/app/admin/admin-actions';
import * as cmsActions from '@/app/admin/cms-actions';
import { POST as postAdminCms } from '@/app/api/admin/cms/route';

const GUEST_USER: User = {
  id: 1,
  email: 'demo@example.com',
  passwordHash: '',
  firstName: 'Alex',
  lastName: 'Nomad',
  role: 'guest',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const HOST_USER: User = {
  id: 3,
  email: 'host@example.com',
  passwordHash: '',
  firstName: 'Carlos',
  lastName: 'Host',
  role: 'host',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const INACTIVE_ADMIN_USER: User = {
  id: 2,
  email: 'admin@example.com',
  passwordHash: '',
  firstName: 'System',
  lastName: 'Admin',
  role: 'admin',
  isActive: false,
  createdAt: new Date().toISOString(),
};

interface AuthState {
  label: string;
  sessionUser: User | null;
  dbUser: User | null;
  expectedAdminActionStatus: 401 | 403;
}

const NON_ADMIN_STATES: readonly AuthState[] = [
  {
    label: 'unauthenticated (null session)',
    sessionUser: null,
    dbUser: null,
    expectedAdminActionStatus: 401,
  },
  {
    label: 'guest role',
    sessionUser: GUEST_USER,
    dbUser: GUEST_USER,
    expectedAdminActionStatus: 403,
  },
  {
    label: 'host role',
    sessionUser: HOST_USER,
    dbUser: HOST_USER,
    expectedAdminActionStatus: 403,
  },
  {
    label: 'suspended admin in DB (Risk #10)',
    sessionUser: { ...INACTIVE_ADMIN_USER, isActive: true },
    dbUser: INACTIVE_ADMIN_USER,
    expectedAdminActionStatus: 401,
  },
];

const ADMIN_ACTION_CASES: ReadonlyArray<{
  name: keyof typeof adminActions;
  invoke: () => Promise<unknown>;
}> = [
  { name: 'fetchAdminPropertiesAction', invoke: () => adminActions.fetchAdminPropertiesAction() },
  { name: 'approvePropertyAction', invoke: () => adminActions.approvePropertyAction(16060) },
  {
    name: 'updatePropertyStatusAction',
    invoke: () => adminActions.updatePropertyStatusAction(16060, 'hidden', 'Test'),
  },
  {
    name: 'createAdminPropertyAction',
    invoke: () => adminActions.createAdminPropertyAction({ hostId: 1, title: 'Unauthorized Apt' }),
  },
  {
    name: 'updateAdminPropertyAction',
    invoke: () => adminActions.updateAdminPropertyAction(16060, { title: 'Tampered' }),
  },
  { name: 'deletePropertyAction', invoke: () => adminActions.deletePropertyAction(16060) },
  { name: 'fetchAdminHostsAction', invoke: () => adminActions.fetchAdminHostsAction() },
  { name: 'reviewHostAction', invoke: () => adminActions.reviewHostAction(1, 'suspended', 'Test') },
  {
    name: 'fetchAdminReservationsAction',
    invoke: () => adminActions.fetchAdminReservationsAction(),
  },
  {
    name: 'cancelReservationAdminAction',
    invoke: () => adminActions.cancelReservationAdminAction(1, 'Unauthorized cancel'),
  },
  { name: 'fetchAdminUsersAction', invoke: () => adminActions.fetchAdminUsersAction() },
  { name: 'updateUserAction', invoke: () => adminActions.updateUserAction(1, { role: 'admin' }) },
  {
    name: 'fetchAdminDashboardStatsAction',
    invoke: () => adminActions.fetchAdminDashboardStatsAction('all'),
  },
  {
    name: 'fetchAdminPropertiesPaginatedAction',
    invoke: () => adminActions.fetchAdminPropertiesPaginatedAction({ page: 1, pageSize: 10 }),
  },
  {
    name: 'fetchAdminHostsPaginatedAction',
    invoke: () => adminActions.fetchAdminHostsPaginatedAction({ page: 1, pageSize: 10 }),
  },
  {
    name: 'fetchAdminReservationsPaginatedAction',
    invoke: () => adminActions.fetchAdminReservationsPaginatedAction({ page: 1, pageSize: 10 }),
  },
  {
    name: 'fetchAdminUsersPaginatedAction',
    invoke: () => adminActions.fetchAdminUsersPaginatedAction({ page: 1, pageSize: 10 }),
  },
  {
    name: 'fetchAdminUserReservationsAction',
    invoke: () => adminActions.fetchAdminUserReservationsAction(1),
  },
];

const CMS_ACTION_CASES: ReadonlyArray<{
  name: keyof typeof cmsActions;
  invoke: () => Promise<unknown>;
}> = [
  { name: 'saveLocationAction', invoke: () => cmsActions.saveLocationAction({ name: 'Injected' }) },
  { name: 'deleteLocationAction', invoke: () => cmsActions.deleteLocationAction(2212) },
  { name: 'reorderTopCitiesAction', invoke: () => cmsActions.reorderTopCitiesAction([2212]) },
  {
    name: 'saveWorkstationPackageAction',
    invoke: () => cmsActions.saveWorkstationPackageAction({ id: 'comfort-base', name: 'Hacked' }),
  },
  {
    name: 'saveWorkstationComponentAction',
    invoke: () =>
      cmsActions.saveWorkstationComponentAction('desk', { id: 'desk-std', name: 'Hacked' }),
  },
  {
    name: 'deleteWorkstationComponentAction',
    invoke: () => cmsActions.deleteWorkstationComponentAction('desk', 'desk-std'),
  },
  {
    name: 'saveWorkstationAddonAction',
    invoke: () => cmsActions.saveWorkstationAddonAction({ id: 'addon-mic', name: 'Hacked' }),
  },
  {
    name: 'deleteWorkstationAddonAction',
    invoke: () => cmsActions.deleteWorkstationAddonAction('addon-mic'),
  },
  {
    name: 'reorderWorkstationItemsAction',
    invoke: () => cmsActions.reorderWorkstationItemsAction('package', ['comfort-base']),
  },
  {
    name: 'saveTravelGuideAction',
    invoke: () => cmsActions.saveTravelGuideAction({ title: 'Injected Guide' }),
  },
  { name: 'deleteTravelGuideAction', invoke: () => cmsActions.deleteTravelGuideAction(361) },
  {
    name: 'saveBlogPostAction',
    invoke: () => cmsActions.saveBlogPostAction({ title: 'Injected Post' }),
  },
  { name: 'deleteBlogPostAction', invoke: () => cmsActions.deleteBlogPostAction(1) },
  {
    name: 'saveVideoAction',
    invoke: () => cmsActions.saveVideoAction({ platform: 'Instagram', authorName: 'Injected' }),
  },
  { name: 'deleteVideoAction', invoke: () => cmsActions.deleteVideoAction(1) },
  { name: 'reorderVideosAction', invoke: () => cmsActions.reorderVideosAction([1, 2]) },
  {
    name: 'reorderFeaturedPropertiesAction',
    invoke: () => cmsActions.reorderFeaturedPropertiesAction([16060]),
  },
  {
    name: 'updateExchangeRatesAction',
    invoke: () => cmsActions.updateExchangeRatesAction({ EUR_USD: 1.5 }),
  },
  { name: 'fetchWorkstationsAction', invoke: () => cmsActions.fetchWorkstationsAction() },
  { name: 'fetchAdminWorkstationsAction', invoke: () => cmsActions.fetchAdminWorkstationsAction() },
  { name: 'fetchLocationsAction', invoke: () => cmsActions.fetchLocationsAction() },
  { name: 'fetchTravelGuidesAction', invoke: () => cmsActions.fetchTravelGuidesAction() },
  { name: 'fetchBlogPostsAction', invoke: () => cmsActions.fetchBlogPostsAction() },
  { name: 'fetchVideosAction', invoke: () => cmsActions.fetchVideosAction() },
  { name: 'fetchExchangeRatesAction', invoke: () => cmsActions.fetchExchangeRatesAction() },
  {
    name: 'fetchAdminLocationsPaginatedAction',
    invoke: () => cmsActions.fetchAdminLocationsPaginatedAction({ page: 1, pageSize: 10 }),
  },
  {
    name: 'fetchAdminGuidesPaginatedAction',
    invoke: () => cmsActions.fetchAdminGuidesPaginatedAction({ page: 1, pageSize: 10 }),
  },
  {
    name: 'fetchAdminBlogPostsPaginatedAction',
    invoke: () => cmsActions.fetchAdminBlogPostsPaginatedAction({ page: 1, pageSize: 10 }),
  },
];

async function expectRejectedWithStatus(
  fn: () => Promise<unknown>,
  expectedStatus: 401 | 403
): Promise<void> {
  let caught: unknown;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }

  expect(caught).toBeInstanceOf(Error);
  if (caught instanceof AuthError) {
    expect(caught.status).toBe(expectedStatus);
  } else {
    const status = (caught as { status?: number; statusCode?: number }).status ??
      (caught as { statusCode?: number }).statusCode;
    expect(status).toBe(expectedStatus);
  }
}

describe('Admin RBAC Security Suite (T8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('covers 100% of exported privileged Server Actions in admin-actions.ts and cms-actions.ts', () => {
    const exportedAdminActions = Object.keys(adminActions).sort();
    const testedAdminActions = ADMIN_ACTION_CASES.map((c) => c.name).sort();
    expect(testedAdminActions).toEqual(exportedAdminActions);

    // sanitizeHtmlContent is a pure utility, not a privileged action
    const exportedCmsActions = Object.keys(cmsActions)
      .filter((name) => name !== 'sanitizeHtmlContent')
      .sort();
    const testedCmsActions = CMS_ACTION_CASES.map((c) => c.name).sort();
    expect(testedCmsActions).toEqual(exportedCmsActions);
  });

  describe.each(NON_ADMIN_STATES)(
    'blocks all admin-actions.ts Server Actions when caller is $label',
    ({ sessionUser, dbUser, expectedAdminActionStatus }) => {
      beforeEach(() => {
        mockGetCurrentUser.mockResolvedValue(sessionUser);
        mockGetUserById.mockResolvedValue(dbUser);
      });

      it.each(ADMIN_ACTION_CASES)(
        `$name rejects with ${expectedAdminActionStatus}`,
        async ({ invoke }) => {
          await expectRejectedWithStatus(invoke, expectedAdminActionStatus);
        }
      );
    }
  );

  describe.each(NON_ADMIN_STATES)(
    'blocks all cms-actions.ts Server Actions when caller is $label',
    ({ sessionUser, dbUser }) => {
      beforeEach(() => {
        mockGetCurrentUser.mockResolvedValue(sessionUser);
        mockGetUserById.mockResolvedValue(dbUser);
      });

      // cms-actions.ts normalizes all AuthError instances to 403 Forbidden
      it.each(CMS_ACTION_CASES)('$name rejects with 403', async ({ invoke }) => {
        await expectRejectedWithStatus(invoke, 403);
      });
    }
  );

  describe.each(NON_ADMIN_STATES)(
    'blocks POST /api/admin/cms when caller is $label',
    ({ sessionUser, dbUser }) => {
      beforeEach(() => {
        mockGetCurrentUser.mockResolvedValue(sessionUser);
        mockGetUserById.mockResolvedValue(dbUser);
      });

      it('returns HTTP 403 Forbidden for saveLocation and saveTravelGuide payloads', async () => {
        for (const action of ['saveLocation', 'saveTravelGuide']) {
          const request = new Request('http://localhost:3288/api/admin/cms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload: { name: 'Injected', title: 'Injected' } }),
          });

          const response = await postAdminCms(request);
          expect(response.status).toBe(403);

          const body = (await response.json()) as { error?: string };
          expect(body.error).toMatch(/Forbidden/i);
        }
      });
    }
  );
});
