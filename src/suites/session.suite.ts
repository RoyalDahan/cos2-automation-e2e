import { test, expect } from '../fixtures/cos.fixture';
import { Role } from '../roles/roles';

/**
 * Session & chrome (SESS)
 *
 * The gate suite. If the role cannot sign in and render the shell, no other result in
 * the run is trustworthy, so these run first for every role.
 */
export function registerSessionSuite(role: Role): void {
  test.describe(`@smoke @regression Session - ${role.label}`, () => {
    test('SESS-001 the role reaches Credentials Home after authentication', async ({ home }) => {
      // Proves the portal SSO handoff completed and the Blazor circuit is live.
      await home.goto();
      await home.expectLoaded();
      await expect(home.educatorSearchInput).toBeVisible();
      await expect(home.documentSearchInput).toBeVisible();
    });

    test('SESS-002 the signed-in account is shown in the header', async ({ home }) => {
      // Guards against a run silently executing as the wrong role, which would make
      // every permission assertion in the suite meaningless.
      await home.goto();
      await home.expectSignedIn();
      if (role.username) {
        await expect(home.userMenu).toContainText(new RegExp(role.username.split('@')[0], 'i'));
      }
    });

    test('SESS-003 the profile menu opens and offers Help and Logout', async ({ home }) => {
      await home.goto();
      await home.openUserMenu();
      await expect(home.helpMenuItem).toBeVisible();
      await expect(home.logoutMenuItem).toBeVisible();
    });

    test('SESS-004 the logo returns to Credentials Home from a results page', async ({ home, results }) => {
      await home.goto();
      await home.searchEducator('a');
      await results.expectLoaded();

      await home.goHome();
      await expect(home.educatorSearchInput).toBeVisible();
      await expect(results.resultsTable).toHaveCount(0);
    });

    test('SESS-005 a deep link into the app is served, not bounced to sign-in', async ({ page, home }) => {
      // An authenticated session must survive direct navigation, not only in-app clicks.
      await page.goto('/');
      await home.expectLoaded();
      await expect(page).not.toHaveURL(/login|signin|districtbusinessportal/i);
    });
  });
}
