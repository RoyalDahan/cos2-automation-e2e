import { test, expect } from '../fixtures/cos.fixture';
import { Role } from '../roles/roles';
import { EDUCATORS, ROSTER } from '../data/testData';

/**
 * Educator record (REC)
 *
 * Opening a record and reading it back. Every role may view; only the edit-capable
 * roles see maintenance controls, which is asserted in the permissions suite rather
 * than here so this file stays role-neutral.
 */
export function registerEducatorRecordSuite(role: Role): void {
  test.describe(`@regression Educator record - ${role.label}`, () => {
    test('REC-001 the View button opens the educator record', async ({ page, home, results }) => {
      await home.goto();
      await home.searchEducator(EDUCATORS.activeMultiCredential.lastName);
      await results.openRow(0);
      await expect(page).toHaveURL(/\/educator\/\d+$/);
    });

    test('REC-002 the record is keyed by an internal id, never by SSN @security', async ({ page, home }) => {
      // An SSN in the URL is written to browser history, proxy logs and Referer headers.
      // Masking it on screen while putting it in the address bar accomplishes nothing.
      await home.goto();
      await home.searchEducator(EDUCATORS.activeMultiCredential.ssn);
      await expect(page).toHaveURL(/\/educator\/\d+$/);
      expect(page.url()).not.toContain(EDUCATORS.activeMultiCredential.ssn);
      expect(page.url()).not.toContain(EDUCATORS.activeMultiCredential.formattedSsn);
    });

    test('REC-003 the record screen renders the educator it was asked for', async ({ page, home }) => {
      await home.goto();
      await home.searchEducator(EDUCATORS.activeMultiCredential.seid);
      await expect(page).toHaveURL(/\/educator\/\d+$/);

      // The record is a form, so the name lives in input values rather than page text -
      // innerText alone would miss it entirely.
      await expect
        .poll(async () => {
          const text = await page.locator('body').innerText().catch(() => '');
          const values = await page.locator('input').evaluateAll((els) =>
            els.map((e) => (e as HTMLInputElement).value).join(' '),
          );
          return `${text} ${values}`.toUpperCase();
        }, { timeout: 15_000, message: 'educator name never appeared on the record screen' })
        .toContain(ROSTER.darkel.lastName.toUpperCase());
    });

    test('REC-004 the header remains available from inside a record', async ({ page, home }) => {
      // The operator must always be one click from a new search.
      await home.goto();
      await home.searchEducator(EDUCATORS.activeMultiCredential.seid);
      await expect(page).toHaveURL(/\/educator\/\d+$/);
      await expect(home.educatorSearchInput).toBeVisible();
    });
  });
}
