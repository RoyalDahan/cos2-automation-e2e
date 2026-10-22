import { test as base, BrowserContext, chromium, expect } from '@playwright/test';
import * as path from 'path';
import { CredentialsHomePage } from '../pages/CredentialsHomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { CredentialSummaryPage } from '../pages/CredentialSummaryPage';
import { CredentialDetailPage } from '../pages/CredentialDetailPage';
import { AdminPage } from '../pages/AdminPage';
import { Role, RoleName, roleByName } from '../roles/roles';
import { ensureLoggedIn } from '../auth/liveLogin';

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

const ROOT = path.resolve(__dirname, '../..');

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
   * Worker-scoped and backed by a real profile directory on disk.
   *
   * Two reasons it must not be test-scoped. COS2 re-establishes its session through the
   * portal SSO handoff rather than restoring it from the profile, so a per-test browser
   * would pay the full sign-in on every single test. And the profile is what lets the
   * sign-in survive between runs at all - Playwright's default context is a throwaway
   * profile, which is why Entra ID used to demand MFA on every run.
   */
  liveContext: [
    async ({ role }, use) => {
      const context = await chromium.launchPersistentContext(path.join(ROOT, role.profileDir), {
        channel: 'msedge',
        headless: process.env.HEADLESS === '1',
        ignoreHTTPSErrors: true,
        viewport: { width: 1600, height: 900 },
      });
      context.setDefaultTimeout(15_000);
      await use(context);
      // Closing is safe: the profile on disk keeps the session, exactly like real Edge.
      await context.close();
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
