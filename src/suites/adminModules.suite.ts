import { test, expect } from '../fixtures/cos.fixture';
import { Role } from '../roles/roles';

/**
 * Admin modules (ADM)
 *
 * Reference-data maintenance. Registered only for roles that hold canAdmin, so it
 * appears in the Admin run and nowhere else. The matching negative cases - that the
 * other two roles are refused - live in the permissions suite.
 */
export function registerAdminModulesSuite(role: Role): void {
  if (!role.canAdmin) {
    throw new Error(`registerAdminModulesSuite called for "${role.name}", which has no admin rights.`);
  }

  test.describe(`@regression @admin Admin modules - ${role.label}`, () => {
    test('ADM-001 the Admin area is reachable by direct URL', async ({ admin }) => {
      await admin.goto();
      await admin.expectReachable();
    });

    test('ADM-002 the Admin entry is offered in the profile menu', async ({ home }) => {
      // The route being open is not enough; the role must also be able to find it.
      await home.goto();
      await home.openUserMenu();
      await expect(home.adminMenuItem).toBeVisible();
    });

    test('ADM-003 the Admin entry navigates to the Admin area', async ({ page, home }) => {
      await home.goto();
      await home.openUserMenu();
      await home.adminMenuItem.click();
      // Blazor routes client-side, so poll the URL rather than wait on a load event.
      await expect
        .poll(() => page.url(), { timeout: 20_000, message: 'Admin entry did not navigate' })
        .toMatch(/\/admin/);
    });

    test('ADM-004 the Admin area renders maintenance content, not an empty shell', async ({ page, admin }) => {
      // Guards the case where the route resolves but the module list fails to bind.
      await admin.goto();
      await admin.expectReachable();
      const text = (await page.locator('body').innerText()).trim();
      expect(text.length, 'Admin rendered no content').toBeGreaterThan(40);
    });
  });
}
