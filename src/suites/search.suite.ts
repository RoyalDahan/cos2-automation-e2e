import { test, expect } from '../fixtures/cos.fixture';
import { Role } from '../roles/roles';
import { EDUCATORS, ROSTER, ROSTER_SIZE } from '../data/testData';
import { isSeid } from '../utils/validators';

/**
 * Search (SRCH)
 *
 * Search is the foundation of nearly every COS2 workflow, which is why it is P0 for
 * every role. Three entry points (Name, SSN, SEID) x four conditions (exact, partial,
 * none, invalid). Every role may search, so this suite is registered for all three.
 */
export function registerSearchSuite(role: Role): void {
  test.describe(`@smoke @regression Search - ${role.label}`, () => {
    test.beforeEach(async ({ home }) => {
      // Every test starts from Credentials Home, whatever the previous test left on screen.
      await home.goto();
      await home.expectLoaded();
    });

    test('SRCH-001 search by exact last name returns every matching educator', async ({ home, results }) => {
      await home.searchEducator(ROSTER.darkel.lastName);
      await results.expectLoaded();
      // No surname is shared on DEV, so an exact surname resolves to exactly one educator.
      await results.expectResultCount(1);
    });

    test('SRCH-002 search by partial name returns matches', async ({ home, results }) => {
      await home.searchEducator('DARK');
      await results.expectResultCount(1);
    });

    test('SRCH-003 a broad term returns the whole roster', async ({ home, results }) => {
      await home.searchEducator('a');
      await results.expectResultCount(ROSTER_SIZE);
    });

    test('SRCH-004 search by full SSN opens the matching educator record', async ({ page, home }) => {
      // A unique identifier bypasses the results grid and opens the record directly.
      await home.searchEducator(EDUCATORS.activeMultiCredential.ssn);
      await expect(page).toHaveURL(/\/educator\/\d+$/);
    });

    test('SRCH-005 search by SEID opens the matching educator record', async ({ page, home }) => {
      const seid = EDUCATORS.activeMultiCredential.seid;
      expect(isSeid(seid), 'seed SEID must be 10 digits').toBeTruthy();

      await home.searchEducator(seid);
      await expect(page).toHaveURL(/\/educator\/\d+$/);
    });

    test('SRCH-006 an identifier with no match opens the Create Educator screen', async ({ page, home }) => {
      // By design: an identifier search that matches nothing drops the operator straight
      // into educator creation rather than a dead-end "no results" page.
      await home.searchEducator('223');
      await expect(page).toHaveURL(/\/educator\/edit/);
    });

    test('SRCH-007 pressing Enter submits the search', async ({ home, results }) => {
      // The magnifier and the Enter key must be interchangeable.
      await home.searchEducatorWithEnter(ROSTER.jarkin.lastName);
      await results.expectResultCount(1);
    });

    test('SRCH-008 a name with no match returns no rows @negative', async ({ home, results }) => {
      await home.searchEducator('Zzzznotanexistingname');
      await results.expectNoResults();
    });

    test('SRCH-009 a blank search does not return the entire database @negative', async ({ home, results }) => {
      await home.searchEducator('');
      await results.expectNoResults();
    });

    test('SRCH-010 special characters are handled without an application error @negative', async ({ page, home, results }) => {
      await home.searchEducator("';--<script>alert(1)</script>");
      await results.expectNoResults();
      // No injected script executed and no server error surfaced.
      expect(await page.title()).toContain('Credentials');
    });

    test('SRCH-011 search results expose the Name, SSN and SEID columns', async ({ results, home }) => {
      // Must be a name: a unique identifier opens the record instead of rendering the grid.
      await home.searchEducator(EDUCATORS.activeMultiCredential.lastName);
      await expect(results.cell('name')).toBeVisible();
      await expect(results.cell('ssn')).toBeVisible();
      await expect(results.cell('seid')).toBeVisible();
    });

    test('SRCH-012 the result count agrees with the number of rows rendered', async ({ home, results }) => {
      // A count that disagrees with the grid is how paging bugs reach production.
      await home.searchEducator('a');
      await results.expectLoaded();
      const rows = await results.count();
      await expect(results.resultCount).toContainText(String(rows));
    });

    test('SRCH-013 Back returns from results to Credentials Home', async ({ home, results }) => {
      await home.searchEducator('a');
      await results.expectLoaded();
      await results.backButton.click();
      await expect(home.educatorSearchInput).toBeVisible();
    });
  });
}
