import { expect, Page } from '@playwright/test';

/**
 * PII guards.
 *
 * The single highest-severity defect class in COS2 is a district user seeing a full
 * SSN or a birth date. These helpers turn that rule into an assertion that can be
 * dropped into any spec, and are deliberately strict: they scan the entire rendered
 * page, not just the field we expected the value in, because leaks show up in tooltips,
 * hidden inputs, data attributes and JSON embedded in the DOM.
 */

const FULL_SSN_ANY_FORMAT = /\b\d{3}-?\d{2}-?\d{4}\b/g;

/** Every SSN-shaped string on the page, normalised to digits. */
export async function ssnLikeStringsOnPage(page: Page): Promise<string[]> {
  const html = await page.content();
  return (html.match(FULL_SSN_ANY_FORMAT) ?? []).map((s) => s.replace(/\D/g, ''));
}

/** Asserts a specific full SSN appears nowhere in the DOM - text, attributes or scripts. */
export async function expectSsnNotExposed(page: Page, ssn: string): Promise<void> {
  const digits = ssn.replace(/\D/g, '');
  const html = await page.content();
  const normalised = html.replace(/(\d{3})-(\d{2})-(\d{4})/g, '$1$2$3');
  expect(normalised, `Full SSN ${digits} must never be rendered to a district user`).not.toContain(digits);
}

/** Asserts the masked form is what the user actually sees. */
export async function expectSsnMasked(actual: string, ssn: string): Promise<void> {
  expect(actual).toMatch(/^X{3}-X{2}-\d{4}$/);
  expect(actual.endsWith(ssn.slice(-4))).toBeTruthy();
}

/** Birth date must be absent from the page entirely for district users. */
export async function expectBirthDateNotPresent(page: Page, birthDateMmDdYyyy: string): Promise<void> {
  const html = await page.content();
  expect(html, 'Birth date must not be rendered to a district user').not.toContain(birthDateMmDdYyyy);
  await expect(page.getByTestId('educator-birthdate')).toHaveCount(0);
  await expect(page.getByTestId('cell-birthdate')).toHaveCount(0);
}
