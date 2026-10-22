import { test as base, BrowserContext, expect } from '@playwright/test';
import { CredentialsHomePage } from '../pages/CredentialsHomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { CredentialSummaryPage } from '../pages/CredentialSummaryPage';
import { CredentialDetailPage } from '../pages/CredentialDetailPage';
import { AdminPage } from '../pages/AdminPage';
import { Role, RoleName, roleByName } from '../roles/roles';
import { ensureLoggedIn } from '../auth/liveLogin';
import { attachToBrowser } from './sharedBrowser';

/**
 * Role-aware fixtures.
 *
 * `roleName` is a project option, so each Playwright project (admin / update / view)
 * runs the same suites as a different user. Page objects are injected so specs never
 * construct them by hand.
 */

export type COSOptions = {
  /** Set per project in playwright.config.ts. */
  roleName: RoleName;
};

type COSFixtures = {
  home: CredentialsHomePage;
  results: SearchResultsPage;
  summary: CredentialSummaryPage;
  detail: CredentialDetailPage;
  admin: AdminPage;
};

type COSWorkerFixtures = {
  role: Role;
  liveContext: BrowserContext;
};

// roleName is a worker-scoped option, so it is declared in the worker type parameter.
export const test = base.extend<COSFixtures, COSOptions & COSWorkerFixtures>({
  roleName: ['admin', { option: true, scope: 'worker' }],

  role: [
    async ({ roleName }, use) => {
      await use(roleByName(roleName));
    },
    { scope: 'worker' },
  ],

  /**
   * The account's long-lived browser (see sharedBrowser.ts), never closed by the tests.
   *
   * Worker teardown only drops the connection. Playwright replaces the worker after every
   * failed test, and with a browser it owned that meant a closed window and a fresh
   * portal sign-in; attaching instead keeps the window, the tab and the sign-in.
   */
  liveContext: [
    async ({ role }, use) => {
      const browser = await attachToBrowser(role.profileDir);
      const context = browser.contexts()[0];
      context.setDefaultTimeout(15_000);
      await use(context);
    },
    { scope: 'worker' },
  ],

  page: async ({ liveContext, role }, use) => {
    await use(await ensureLoggedIn(liveContext, role));
  },

  home: async ({ page }, use) => use(new CredentialsHomePage(page)),
  results: async ({ page }, use) => use(new SearchResultsPage(page)),
  summary: async ({ page }, use) => use(new CredentialSummaryPage(page)),
  detail: async ({ page }, use) => use(new CredentialDetailPage(page)),
  admin: async ({ page }, use) => use(new AdminPage(page)),
});

export { expect };
export type { Role };
