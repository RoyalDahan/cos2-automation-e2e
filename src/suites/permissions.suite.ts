import { test, expect } from '../fixtures/cos.fixture';
import { Role } from '../roles/roles';
import { EDUCATORS } from '../data/testData';
import { appUrl } from '../utils/appUrl';

/**
 * Permission matrix (PERM)
 *
 * The highest-severity suite: a failure here is a privacy or integrity incident, not a
 * bug. Each role gets the positive cases for what it may do and the negative cases for
 * what it must not - because hiding a control is a usability choice, while refusing the
 * request is the actual control.
 *
 * Cases are selected from the role's capabilities, so adding a fourth role later means
 * declaring its capabilities rather than writing a fourth copy of these tests.
 */
export function registerPermissionsSuite(role: Role): void {
  test.describe(`@security @regression Permissions - ${role.label}`, () => {
    // ---- Admin area ----------------------------------------------------------------

    if (role.canAdmin) {
      test('PERM-001 the role may open the Admin area', async ({ admin }) => {
        await admin.goto();
        await admin.expectReachable();
      });
    } else {
      test('PERM-002 the Admin area is refused on direct URL @negative', async ({ admin }) => {
        // Typing the URL by hand must not be a way round the missing menu entry.
        await admin.goto();
        await admin.expectRefused();
      });

      test('PERM-003 the Admin entry is absent from the profile menu @negative', async ({ home }) => {
        await home.goto();
        await home.openUserMenu();
        await expect(home.adminMenuItem).toHaveCount(0);
      });
    }

    // ---- Maintenance rights --------------------------------------------------------

    if (role.canEdit) {
      test('PERM-004 the role reaches the educator maintenance screen', async ({ page, home }) => {
        // Searching an unmatched identifier routes into educator creation, which is the
        // cheapest maintenance surface to reach without mutating an existing record.
        await home.goto();
        await home.searchEducator('223');
        await expect(page).toHaveURL(/\/educator\/edit/);
      });

      test('PERM-005 the maintenance screen offers an editable form', async ({ page, home }) => {
        await home.goto();
        await home.searchEducator('223');
        await expect(page).toHaveURL(/\/educator\/edit/);
        const editable = page.locator('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly])');
        expect(await editable.count(), 'no editable control on the maintenance screen').toBeGreaterThan(1);
      });
    } else {
      test('PERM-006 the educator maintenance screen is refused @negative', async ({ page, home }) => {
        // A view-only role must not reach an editor, even via the create-on-no-match route.
        await home.goto();
        await home.searchEducator('223');
        await expect(page).not.toHaveURL(/\/educator\/edit/);
      });

      test('PERM-007 a direct URL to the editor is refused @negative', async ({ page }) => {
        await page.goto(appUrl('/educator/edit'));
        await page.waitForTimeout(1_500);

        const stillOnEditor = /\/educator\/edit/.test(page.url());
        const body = (await page.locator('body').innerText().catch(() => '')) || '';
        const refused = /not authori[sz]ed|access denied|forbidden/i.test(body);

        expect(
          !stillOnEditor || refused,
          `view-only role was served the editor at ${page.url()}`,
        ).toBeTruthy();
      });

      test('PERM-008 no edit control is offered on an educator record @negative', async ({ page, home }) => {
        // Absence, not merely a disabled control: a disabled button is still a hint that
        // the write endpoint exists and is worth probing.
        await home.goto();
        await home.searchEducator(EDUCATORS.activeMultiCredential.seid);
        await expect(page).toHaveURL(/\/educator\/\d+$/);

        const editControls = page.getByRole('button', { name: /edit|save|add document|delete/i });
        await expect(editControls).toHaveCount(0);
      });
    }

    // ---- Always ---------------------------------------------------------------------

    test('PERM-009 the role can still read educator data it is entitled to', async ({ home, results }) => {
      // The counterweight to the negative cases above: restricting write access must not
      // quietly break read access.
      await home.goto();
      await home.searchEducator('a');
      await results.expectLoaded();
      expect(await results.count()).toBeGreaterThan(0);
    });
  });
}
