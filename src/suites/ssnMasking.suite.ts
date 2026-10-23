import { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures/cos.fixture';
import { Role } from '../roles/roles';
import { EDUCATORS } from '../data/testData';
import { expectSsnNotExposed } from '../utils/privacy';
import { CredentialsHomePage } from '../pages/CredentialsHomePage';

/**
 * SSN masking (SSN)
 *
 * Every SSN is rendered masked (***-**-NNNN) by default, on the search grid and on the
 * educator record alike. Roles entitled to it (Admin, Update) click the masked value to
 * reveal the full number and click again to hide it. A View-only role gets the masked
 * value and nothing more: clicking it must not reveal anything, and the full number must
 * not be in the page at all - hiding it with CSS while shipping it in the DOM is a leak.
 */

const SUBJECT = EDUCATORS.activeMultiCredential;
const MASKED = `***-**-${SUBJECT.ssn.slice(-4)}`;
const FULL = SUBJECT.formattedSsn;

/** The clickable span COS2 renders: <span data-testid="ssn-toggle-N" title="Show SSN">. */
const SSN_TOGGLE = '[data-testid^="ssn-toggle"]';

/**
 * The SSN element inside `scope`. Falls back to the visible masked text, so a role whose
 * markup has no toggle at all (the correct View-only build) is still located and checked.
 */
function ssnIn(scope: Locator): Locator {
  return scope.locator(SSN_TOGGLE).or(scope.getByText(MASKED, { exact: true })).first();
}

async function openSubjectRecord(page: Page, home: CredentialsHomePage): Promise<void> {
  // A unique SEID routes straight to the record rather than to the grid.
  await home.goto();
  await home.searchEducator(SUBJECT.seid);
  await expect(page).toHaveURL(/\/educator\/\d+$/);
}

/**
 * When the SSN cannot be found, attach every element holding its last four digits - as
 * text or as an input value - to the report and the console, so the markup to target is
 * right there in the failure instead of needing a DevTools session to find.
 */
async function reportIfMissing(page: Page, ssn: Locator): Promise<void> {
  if (await ssn.waitFor({ timeout: 10_000 }).then(() => true, () => false)) return;
  const last4 = SUBJECT.ssn.slice(-4);
  const candidates = await page.evaluate((digits) => {
    const holds = (el: Element) =>
      Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.includes(digits)) ||
      ((el as HTMLInputElement).value ?? '').toString().includes(digits);
    return Array.from(document.querySelectorAll('body *')).filter(holds).map((el) => el.outerHTML.slice(0, 400));
  }, last4);
  const body = [`URL: ${page.url()}`, ...(candidates.length ? candidates : [`nothing on the page contains ${last4}`])].join('\n\n');
  await test.info().attach('ssn-candidates', { body, contentType: 'text/plain' });
  console.log(`\nSSN element not found. Elements containing ${last4}:\n${body}\n`);
}

/** Masked -> click -> full -> click -> masked again. */
async function expectToggleRevealsAndHides(ssn: Locator): Promise<void> {
  await expect(ssn, 'SSN must be masked until the user asks to see it').toHaveText(MASKED);

  await ssn.click();
  await expect(ssn, 'first click must reveal the full SSN').toHaveText(FULL);

  await ssn.click();
  await expect(ssn, 'second click must mask the SSN again').toHaveText(MASKED);
}

/** Masked, stays masked after a click, and the full number is nowhere in the DOM. */
async function expectNoReveal(page: Page, ssn: Locator): Promise<void> {
  await expect(ssn, 'only the last four digits may be shown').toHaveText(MASKED);
  await expectSsnNotExposed(page, FULL);

  await ssn.click();
  // A negative assertion has to give the Blazor round trip time to happen, or it passes
  // merely because the server has not answered yet.
  await page.waitForTimeout(1_500);

  await expect(ssn, 'clicking must not reveal the full SSN to this role').toHaveText(MASKED);
  await expectSsnNotExposed(page, FULL);
}

export function registerSsnMaskingSuite(role: Role): void {
  test.describe(`@security @regression @ssn SSN masking - ${role.label}`, () => {
    if (role.canRevealSsn) {
      test('SSN-001 search results: clicking the SSN reveals it, clicking again masks it', async ({ home, results }) => {
        await home.goto();
        await home.searchEducator(SUBJECT.lastName);
        await results.expectLoaded();
        await expectToggleRevealsAndHides(ssnIn(results.cell('ssn', 0)));
      });

      test('SSN-002 educator record: clicking the SSN reveals it, clicking again masks it', async ({ page, home }) => {
        await openSubjectRecord(page, home);
        const ssn = ssnIn(page.locator('body'));
        await reportIfMissing(page, ssn);
        await expectToggleRevealsAndHides(ssn);
      });
    } else {
      test('SSN-003 search results: only the last four digits are shown and a click reveals nothing @negative', async ({ page, home, results }) => {
        await home.goto();
        await home.searchEducator(SUBJECT.lastName);
        await results.expectLoaded();
        await expectNoReveal(page, ssnIn(results.cell('ssn', 0)));
      });

      test('SSN-004 educator record: only the last four digits are shown and a click reveals nothing @negative', async ({ page, home }) => {
        await openSubjectRecord(page, home);
        const ssn = ssnIn(page.locator('body'));
        await reportIfMissing(page, ssn);
        await expectNoReveal(page, ssn);
      });
    }
  });
}
